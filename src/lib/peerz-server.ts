// Peerz database writes. Every change to a balance goes through credit() or
// redeem(), which write the ledger row and the cached User.peerzBalance in one
// transaction. Rules and numbers live in lib/peerz.ts.

import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import type { RankTier } from "@/lib/ranked"
import {
  seasonAt, hitReward, RESOLVED_PEERZ, RESOLVED_DAILY_CAP, GENESIS_LIMIT,
  DUEL_WIN_PEERZ, DUEL_DAILY_CAP, DUEL_DAILY_CAP_PER_OPPONENT, CHECKIN_REWARDS,
  STORE_ITEMS, type StoreItemId,
} from "@/lib/peerz"

const DAY_MS = 86_400_000

// The seeded demo accounts never take a Genesis number — those go to real people.
const DEMO_EMAILS = new Set([
  "human@peerza.ai", "david@peerza.ai", "emma@peerza.ai", "james@peerza.ai", "marcus@peerza.ai",
  "olivia@peerza.ai", "priya@peerza.ai", "ryan@peerza.ai", "sarah@peerza.ai", "sofia@peerza.ai",
])

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
      genesis: call.author.genesisNo != null,
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

// ─── Genesis ────────────────────────────────────────────────────────────────

/** Give a real (non-demo) user the next Genesis number while any are left. */
export async function ensureGenesis(userId: string): Promise<number | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { genesisNo: true, email: true } })
    if (!user) return null
    if (user.genesisNo != null) return user.genesisNo
    if (DEMO_EMAILS.has(user.email.toLowerCase())) return null

    const top = await db.user.aggregate({ _max: { genesisNo: true } })
    const next = (top._max.genesisNo ?? 0) + 1
    if (next > GENESIS_LIMIT) return null
    try {
      // count 0 = this user got a number in a parallel request; loop re-reads it.
      const res = await db.user.updateMany({ where: { id: userId, genesisNo: null }, data: { genesisNo: next } })
      if (res.count > 0) return next
    } catch (err) {
      // Someone else took that number at the same moment — try the next one.
      if (!isUniqueViolation(err)) throw err
    }
  }
  return null
}

// ─── Store ──────────────────────────────────────────────────────────────────

export type RedeemResult =
  | { ok: true; balance: number }
  | { ok: false; error: string; status: number }

export async function redeem(userId: string, itemId: StoreItemId): Promise<RedeemResult> {
  const item = STORE_ITEMS.find((i) => i.id === itemId)
  if (!item) return { ok: false, error: "Unknown item", status: 400 }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      emailVerifiedAt: true, proExpiresAt: true,
      proMembership: { select: { status: true, stripeSubscriptionId: true, currentPeriodEnd: true } },
    },
  })
  if (!user) return { ok: false, error: "User not found", status: 404 }
  if (!user.emailVerifiedAt) return { ok: false, error: "Verify your email to spend Peerz", status: 403 }

  const now = new Date()
  if (item.id === "pro-week") {
    const m = user.proMembership
    if (m?.stripeSubscriptionId && m.status === "ACTIVE" && m.currentPeriodEnd > now) {
      return { ok: false, error: "You already have Pro through your subscription", status: 409 }
    }
  }

  const redemptionId = randomUUID()
  const ok = await db.$transaction(async (tx) => {
    // Conditional decrement: the balance can never go below zero.
    const res = await tx.user.updateMany({
      where: { id: userId, peerzBalance: { gte: item.cost } },
      data: { peerzBalance: { decrement: item.cost } },
    })
    if (res.count === 0) return false
    await tx.peerzLedger.create({
      data: {
        userId, amount: -item.cost, reason: "REDEEM", refId: redemptionId,
        season: seasonAt(now).id, meta: { itemId: item.id, name: item.name },
      },
    })
    if (item.id === "pro-week") {
      const from = user.proExpiresAt && user.proExpiresAt > now ? user.proExpiresAt : now
      await tx.user.update({
        where: { id: userId },
        data: { isPro: true, proExpiresAt: new Date(from.getTime() + 7 * DAY_MS) },
      })
    } else if (item.id === "aria-5") {
      await tx.user.update({ where: { id: userId }, data: { aiBonusQuestions: { increment: 5 } } })
    }
    return true
  })
  if (!ok) return { ok: false, error: "Not enough Peerz", status: 409 }

  const after = await db.user.findUnique({ where: { id: userId }, select: { peerzBalance: true } })
  return { ok: true, balance: after?.peerzBalance ?? 0 }
}
