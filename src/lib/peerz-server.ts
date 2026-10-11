// Peerz database writes. Every change to a balance goes through credit() or
// redeem(), which write the ledger row and the cached User.peerzBalance in one
// transaction. Rules and numbers live in lib/peerz.ts.

import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import type { RankTier } from "@/lib/ranked"
import {
  seasonAt, hitReward, RESOLVED_PEERZ, RESOLVED_DAILY_CAP,
  DUEL_WIN_PEERZ, DUEL_DAILY_CAP, DUEL_DAILY_CAP_PER_OPPONENT, CHECKIN_REWARDS,
  STORE_ITEMS, type StoreItemId,
} from "@/lib/peerz"

const DAY_MS = 86_400_000

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "P2002"
}

/**
 * Append one ledger row and move the balance. Returns false (and changes
 * nothing) when this (user, reason, refId) was already credited.
 */
export async function credit(entry: {
  userId: string
  amount: number
  reason: string
  refId: string
  meta?: Record<string, unknown>
  at?: Date
}): Promise<boolean> {
  if (entry.amount === 0) return false
  const at = entry.at ?? new Date()
  try {
    await db.$transaction([
      db.peerzLedger.create({
        data: {
          userId: entry.userId,
          amount: entry.amount,
          reason: entry.reason,
          refId: entry.refId,
          season: seasonAt(at).id,
          meta: (entry.meta ?? undefined) as object | undefined,
          createdAt: at,
        },
      }),
      db.user.update({ where: { id: entry.userId }, data: { peerzBalance: { increment: entry.amount } } }),
    ])
    return true
  } catch (err) {
    if (isUniqueViolation(err)) return false
    throw err
  }
}

// ─── Ranked Calls ───────────────────────────────────────────────────────────

/** Pay out a resolved Ranked Call. Safe to call more than once per call. */
export async function awardRankedCall(postId: string): Promise<void> {
  const call = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true, authorId: true, analysis: true, outcomeStatus: true, outcomeAt: true, rankedDifficulty: true,
      author: { select: { repTier: true, genesisNo: true } },
    },
  })
  if (!call || (call.outcomeStatus !== "TARGET_HIT" && call.outcomeStatus !== "EXPIRED")) return
  const at = call.outcomeAt ?? new Date()
  const ticker = ((call.analysis as { ticker?: string } | null)?.ticker ?? "").toUpperCase()

  if (call.outcomeStatus === "TARGET_HIT") {
    // Consecutive hits up to and including this one, by resolution time.
    const recent = await db.post.findMany({
      where: {
        authorId: call.authorId, rankedDeadline: { not: null },
        outcomeStatus: { in: ["TARGET_HIT", "EXPIRED"] }, outcomeAt: { lte: at },
      },
      orderBy: { outcomeAt: "desc" },
      take: 20,
      select: { outcomeStatus: true },
    })
    let streak = 0
    for (const r of recent) { if (r.outcomeStatus === "TARGET_HIT") streak++; else break }

    const reward = hitReward({
      ratio: call.rankedDifficulty ?? 1,
      streak: Math.max(1, streak),
      tier: (call.author.repTier as RankTier | null) ?? null,
      genesisNo: call.author.genesisNo,
      at,
    })
    await credit({
      userId: call.authorId, amount: reward.total, reason: "CALL_HIT", refId: call.id, at,
      meta: { ticker, parts: reward.parts },
    })
  }

  const resolvedToday = await db.peerzLedger.count({
    where: { userId: call.authorId, reason: "CALL_RESOLVED", createdAt: { gt: new Date(at.getTime() - DAY_MS), lte: at } },
  })
  if (resolvedToday < RESOLVED_DAILY_CAP) {
    await credit({
      userId: call.authorId, amount: RESOLVED_PEERZ, reason: "CALL_RESOLVED", refId: call.id, at,
      meta: { ticker, hit: call.outcomeStatus === "TARGET_HIT" },
    })
  }
}

// ─── Duels ──────────────────────────────────────────────────────────────────

/** Pay the winner of a finished duel. Ties pay nobody. */
export async function awardDuelWin(duelId: string): Promise<void> {
  const duel = await db.gameDuel.findUnique({ where: { id: duelId } })
  if (!duel || duel.challengeePct == null || duel.challengeePct === duel.challengerPct) return
  if (duel.challengerId === duel.challengeeId) return
  const challengeeWon = duel.challengeePct > duel.challengerPct
  const winnerId = challengeeWon ? duel.challengeeId : duel.challengerId
  const loserId = challengeeWon ? duel.challengerId : duel.challengeeId

  const since = new Date(Date.now() - DAY_MS)
  const [today, vsOpponent] = await Promise.all([
    db.peerzLedger.count({ where: { userId: winnerId, reason: "DUEL_WIN", createdAt: { gt: since } } }),
    db.peerzLedger.count({
      where: { userId: winnerId, reason: "DUEL_WIN", createdAt: { gt: since }, meta: { path: ["opponentId"], equals: loserId } },
    }),
  ])
  if (today >= DUEL_DAILY_CAP || vsOpponent >= DUEL_DAILY_CAP_PER_OPPONENT) return

  await credit({
    userId: winnerId, amount: DUEL_WIN_PEERZ, reason: "DUEL_WIN", refId: duel.id,
    meta: { opponentId: loserId, gameId: duel.gameId },
  })
}

// ─── Daily check-in ─────────────────────────────────────────────────────────

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface CheckinResult { awarded: number; streak: number }

/** First visit of the UTC day pays the next step of the 7-day streak. */
export async function checkIn(userId: string, now = new Date()): Promise<CheckinResult | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { checkinStreak: true, lastCheckinAt: true },
  })
  if (!user) return null
  const today = utcDay(now)
  if (user.lastCheckinAt && utcDay(user.lastCheckinAt) === today) return null

  const yesterday = utcDay(new Date(now.getTime() - DAY_MS))
  const continues = user.lastCheckinAt != null && utcDay(user.lastCheckinAt) === yesterday
  const streak = continues ? (user.checkinStreak % CHECKIN_REWARDS.length) + 1 : 1
  const awarded = CHECKIN_REWARDS[streak - 1]

  try {
    await db.$transaction([
      db.peerzLedger.create({
        data: { userId, amount: awarded, reason: "CHECKIN", refId: today, season: seasonAt(now).id, meta: { streak } },
      }),
      db.user.update({
        where: { id: userId },
        data: { peerzBalance: { increment: awarded }, checkinStreak: streak, lastCheckinAt: now },
      }),
    ])
  } catch (err) {
    if (isUniqueViolation(err)) return null // another tab got there first
    throw err
  }
  return { awarded, streak }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export type RedeemResult =
  | { ok: true; balance: number }
  | { ok: false; error: string; status: number }

// The Pro week is a trial that leads to a paid plan, not a way to replace one:
// once per season, and only for people who don't already have Pro. Its ledger
// refId is "pro-week:<season>", so the unique key enforces the limit even if
// two redemptions race.
function proTrialRef(seasonId: string) {
  return `pro-week:${seasonId}`
}

export interface ProTrialState {
  usedThisSeason: boolean
  /** The latest trial's end, once it has passed — the moment to offer paid Pro. */
  endedAt: Date | null
  ref: string | null
}

export async function getProTrialState(userId: string, now = new Date()): Promise<ProTrialState> {
  const last = await db.peerzLedger.findFirst({
    where: { userId, reason: "REDEEM", refId: { startsWith: "pro-week:" } },
    orderBy: { createdAt: "desc" },
    select: { refId: true, meta: true },
  })
  const until = (last?.meta as { until?: string } | null)?.until
  const end = until ? new Date(until) : null
  return {
    usedThisSeason: last?.refId === proTrialRef(seasonAt(now).id),
    endedAt: end && end <= now ? end : null,
    ref: last?.refId ?? null,
  }
}

export async function redeem(userId: string, itemId: StoreItemId): Promise<RedeemResult> {
  const item = STORE_ITEMS.find((i) => i.id === itemId)
  if (!item) return { ok: false, error: "Unknown item", status: 400 }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, isPro: true },
  })
  if (!user) return { ok: false, error: "User not found", status: 404 }
  if (!user.emailVerifiedAt) return { ok: false, error: "Verify your email to spend Peerz", status: 403 }

  const now = new Date()
  const season = seasonAt(now)
  const trialEnd = new Date(now.getTime() + 7 * DAY_MS)
  if (item.id === "pro-week") {
    if (user.isPro) return { ok: false, error: "You already have Pro", status: 409 }
    if ((await getProTrialState(userId, now)).usedThisSeason) {
      return { ok: false, error: "You've used this season's Pro week", status: 409 }
    }
  }

  const refId = item.id === "pro-week" ? proTrialRef(season.id) : randomUUID()
  let ok: boolean
  try {
    ok = await db.$transaction(async (tx) => {
      // Conditional decrement: the balance can never go below zero.
      const res = await tx.user.updateMany({
        where: { id: userId, peerzBalance: { gte: item.cost } },
        data: { peerzBalance: { decrement: item.cost } },
      })
      if (res.count === 0) return false
      await tx.peerzLedger.create({
        data: {
          userId, amount: -item.cost, reason: "REDEEM", refId, season: season.id,
          meta: item.id === "pro-week"
            ? { itemId: item.id, name: item.name, until: trialEnd.toISOString() }
            : { itemId: item.id, name: item.name },
        },
      })
      if (item.id === "pro-week") {
        await tx.user.update({ where: { id: userId }, data: { isPro: true, proExpiresAt: trialEnd } })
      } else if (item.id === "aria-5") {
        await tx.user.update({ where: { id: userId }, data: { aiBonusQuestions: { increment: 5 } } })
      }
      return true
    })
  } catch (err) {
    // A parallel request redeemed this season's Pro week first; nothing was charged.
    if (isUniqueViolation(err)) return { ok: false, error: "You've used this season's Pro week", status: 409 }
    throw err
  }
  if (!ok) return { ok: false, error: "Not enough Peerz", status: 409 }

  const after = await db.user.findUnique({ where: { id: userId }, select: { peerzBalance: true } })
  return { ok: true, balance: after?.peerzBalance ?? 0 }
}

// How long after a Peerz Pro week ends we keep offering paid Pro.
const TRIAL_OFFER_MS = 14 * DAY_MS

/** The ended trial to follow up with a paid-Pro offer, or null. */
export async function endedProTrialToOffer(userId: string, now = new Date()): Promise<string | null> {
  const t = await getProTrialState(userId, now)
  if (!t.endedAt || !t.ref) return null
  return now.getTime() - t.endedAt.getTime() < TRIAL_OFFER_MS ? t.ref : null
}
