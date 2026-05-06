import { db } from "@/lib/db"

export const TRACK_RECORD_THRESHOLD = 10

export interface TrackRecord {
  totalCalls: number
  callsHit: number
  accuracyPct: number | null   // null when totalCalls < threshold
  avgReturnPct: number | null  // null when callsHit === 0
  bestReturnPct: number | null
  threshold: number
  meetsThreshold: boolean
}

interface RawRow {
  total: number
  hits: number
  avg_return: number | null
  best_return: number | null
}

export async function getTrackRecord(userId: string): Promise<TrackRecord> {
  // A "tracked call" is a post with analysis.target set, a directional bullish/bearish
  // call, and a priceKey snapshotted (so outcome detection can run). Neutral calls
  // and posts without snapshotted price keys aren't trackable, so they don't count.
  const rows = await db.$queryRaw<RawRow[]>`
    SELECT
      COUNT(*)::int                                                          AS total,
      COUNT(*) FILTER (WHERE "outcomeStatus" = 'TARGET_HIT')::int            AS hits,
      AVG("outcomeReturnPct") FILTER (WHERE "outcomeStatus" = 'TARGET_HIT')  AS avg_return,
      MAX("outcomeReturnPct") FILTER (WHERE "outcomeStatus" = 'TARGET_HIT')  AS best_return
    FROM "Post"
    WHERE "authorId" = ${userId}
      AND analysis IS NOT NULL
      AND analysis->>'target'   IS NOT NULL
      AND analysis->>'priceKey' IS NOT NULL
      AND analysis->>'direction' IN ('bullish', 'bearish')
  `
  const r = rows[0] ?? { total: 0, hits: 0, avg_return: null, best_return: null }
  const total = r.total
  const meets = total >= TRACK_RECORD_THRESHOLD

  return {
    totalCalls: total,
    callsHit: r.hits,
    accuracyPct: meets && total > 0 ? parseFloat(((r.hits / total) * 100).toFixed(1)) : null,
    avgReturnPct: r.hits > 0 && r.avg_return != null ? parseFloat(Number(r.avg_return).toFixed(2)) : null,
    bestReturnPct: r.best_return != null ? parseFloat(Number(r.best_return).toFixed(2)) : null,
    threshold: TRACK_RECORD_THRESHOLD,
    meetsThreshold: meets,
  }
}
