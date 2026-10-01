// Challenge.status is stored, but nothing used to advance it as dates passed,
// so a finished challenge kept showing "Live". This moves statuses forward by
// date; it runs on a timer from instrumentation.ts and is cheap (two indexed
// updateMany calls that usually touch zero rows).

import { db } from "@/lib/db"

export async function syncChallengeStatuses(now = new Date()): Promise<number> {
  const ended = await db.challenge.updateMany({
    where: { status: { in: ["UPCOMING", "ACTIVE"] }, endDate: { lte: now } },
    data: { status: "ENDED" },
  })
  const started = await db.challenge.updateMany({
    where: { status: "UPCOMING", startDate: { lte: now }, endDate: { gt: now } },
    data: { status: "ACTIVE" },
  })
  return ended.count + started.count
}

/** Start the once-a-minute sync loop. Idempotent across hot reloads. */
export function startChallengeStatusSync(intervalMs = 60_000) {
  const g = globalThis as unknown as { __challengeSync?: ReturnType<typeof setInterval> }
  if (g.__challengeSync) return
  const tick = () => { syncChallengeStatuses().catch((err) => console.error("[challenges] status sync failed", err)) }
  g.__challengeSync = setInterval(tick, intervalMs)
  setTimeout(tick, 10_000) // first pass shortly after boot
}
