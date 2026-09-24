// Settles open Ranked Calls against market candles. Runs every minute from
// instrumentation.ts (single always-on instance on Railway). Each pass scans
// only candles newer than what it saw last time, so checks stay cheap.

import { db } from "@/lib/db"
import { getCandles } from "@/lib/ranked-market"
import { pointsIfHit, pointsIfMissed, progressToward } from "@/lib/ranked"
import { recomputeReputation } from "@/lib/reputation"
import { shouldNotify } from "@/lib/notification-prefs"

const BATCH = 40
// Wait this long past the deadline before calling a miss, so late-arriving
// candles covering the final minutes are included.
const FINALIZE_GRACE_MS = 10 * 60_000
// If a call can't get any market data this long after its deadline, void it.
const VOID_AFTER_MS = 24 * 3_600_000

type Status = "TARGET_HIT" | "EXPIRED" | "VOID"

interface OpenCall {
  id: string
  authorId: string
  analysis: unknown
  createdAt: Date
  rankedSymbol: string | null
  rankedStartsAt: Date | null
  rankedDeadline: Date | null
  rankedEntry: number | null
  rankedTarget: number | null
  rankedDifficulty: number | null
  rankedProgress: number | null
  rankedLastPrice: number | null
  rankedCheckedThrough: Date | null
}

async function finalize(call: OpenCall, status: Status, data: {
  at: Date; entry?: number | null; progress?: number | null; lastPrice?: number | null
}) {
  const ratio = call.rankedDifficulty ?? 1
  const points = status === "TARGET_HIT" ? pointsIfHit(ratio) : status === "EXPIRED" ? -pointsIfMissed(ratio) : 0
  const entry = data.entry ?? call.rankedEntry
  const target = call.rankedTarget
  const returnPct = status === "TARGET_HIT" && entry && target
    ? parseFloat((Math.abs((target - entry) / entry) * 100).toFixed(2))
    : null

  // Guard on OPEN so a concurrent pass can't settle the same call twice.
  const res = await db.post.updateMany({
    where: { id: call.id, outcomeStatus: "OPEN" },
    data: {
      outcomeStatus: status,
      outcomeAt: data.at,
      outcomeReturnPct: returnPct,
      outcomeCheckedAt: new Date(),
      rankedPoints: points,
      rankedEntry: entry,
      rankedProgress: status === "TARGET_HIT" ? 1 : data.progress ?? call.rankedProgress,
      rankedLastPrice: data.lastPrice ?? call.rankedLastPrice,
    },
  })
  if (res.count === 0) return

  await recomputeReputation(call.authorId)
  if (status !== "VOID" && await shouldNotify(call.authorId, "RANKED_CALL_RESULT")) {
    await db.notification.create({
      data: { type: "RANKED_CALL_RESULT", receiverId: call.authorId, triggeredBy: call.authorId, entityId: call.id },
    })
  }
}

async function settleOne(call: OpenCall, now: number): Promise<void> {
  if (!call.rankedSymbol || !call.rankedStartsAt || !call.rankedDeadline || call.rankedTarget == null) return
  const dir = (call.analysis as { direction?: string } | null)?.direction
  if (dir !== "bullish" && dir !== "bearish") return
  const bull = dir === "bullish"
  const start = call.rankedStartsAt.getTime()
  const deadline = call.rankedDeadline.getTime()
  const target = call.rankedTarget
  const from = Math.max(start, call.rankedCheckedThrough?.getTime() ?? start)
  const to = Math.min(now, deadline)

  const data = to > from ? await getCandles(call.rankedSymbol, from, to) : { candles: [], intervalMs: 60_000 }
  if (!data) {
    if (now > deadline + VOID_AFTER_MS) await finalize(call, "VOID", { at: new Date(now) })
    return
  }
  // Only candles that opened after the clock started can count toward a hit.
  const candles = data.candles.filter((c) => c.t >= start)

  let entry = call.rankedEntry
  if (entry == null) {
    // Posted while the market was closed: entry is the first price after the open.
    if (candles.length === 0) {
      if (now > deadline + VOID_AFTER_MS) await finalize(call, "VOID", { at: new Date(now) })
      return
    }
    entry = candles[0].o
    const gappedPast = bull ? entry >= target : entry <= target
    if (gappedPast) {
      // The market opened beyond the target — nobody should get free points for that.
      await finalize(call, "VOID", { at: new Date(candles[0].t), entry })
      return
    }
  }

  let progress = call.rankedProgress ?? 0
  for (const c of candles) {
    const extreme = bull ? c.h : c.l
    if (bull ? c.h >= target : c.l <= target) {
      await finalize(call, "TARGET_HIT", { at: new Date(Math.max(c.t, start)), entry, progress: 1, lastPrice: c.c })
      return
    }
    progress = Math.max(progress, progressToward(entry, target, extreme))
  }
  const lastPrice = candles.length ? candles[candles.length - 1].c : call.rankedLastPrice

  if (now >= deadline + FINALIZE_GRACE_MS) {
    const everTraded = lastPrice != null || candles.length > 0
    await finalize(call, everTraded ? "EXPIRED" : "VOID", { at: new Date(deadline), entry, progress, lastPrice })
    return
  }

  await db.post.update({
    where: { id: call.id },
    data: {
      rankedEntry: entry,
      rankedProgress: progress,
      rankedLastPrice: lastPrice,
      // Re-read from the last candle next time: the newest one may still be forming.
      rankedCheckedThrough: new Date(candles.length ? candles[candles.length - 1].t : from),
      outcomeCheckedAt: new Date(now),
    },
  })
}

let running = false

/** One settlement pass. Safe to call concurrently — overlapping calls no-op. */
export async function settleRankedCalls(now = Date.now()): Promise<number> {
  if (running) return 0
  running = true
  try {
    const due = await db.post.findMany({
      where: { outcomeStatus: "OPEN", rankedDeadline: { not: null }, rankedStartsAt: { lte: new Date(now) } },
      orderBy: { outcomeCheckedAt: { sort: "asc", nulls: "first" } },
      take: BATCH,
      select: {
        id: true, authorId: true, analysis: true, createdAt: true,
        rankedSymbol: true, rankedStartsAt: true, rankedDeadline: true, rankedEntry: true, rankedTarget: true,
        rankedDifficulty: true, rankedProgress: true, rankedLastPrice: true, rankedCheckedThrough: true,
      },
    })
    for (const call of due) {
      try { await settleOne(call, now) } catch (err) { console.error("[ranked] settle failed", call.id, err) }
    }
    return due.length
  } finally {
    running = false
  }
}

/** Start the once-a-minute settlement loop. Idempotent across hot reloads. */
export function startRankedResolver(intervalMs = 60_000) {
  const g = globalThis as unknown as { __rankedResolver?: ReturnType<typeof setInterval> }
  if (g.__rankedResolver) return
  const tick = () => { settleRankedCalls().catch((err) => console.error("[ranked] pass failed", err)) }
  g.__rankedResolver = setInterval(tick, intervalMs)
  setTimeout(tick, 15_000) // first pass shortly after boot
}
