import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const WINDOWS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7  * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
}

interface TickerRow {
  ticker: string
  count: number
  bullish: number
  bearish: number
  neutral: number
  avg_conviction: number | null
}
interface PrevRow { ticker: string; count: number }

interface CacheEntry {
  ts: number
  data: any
}
const cache = new Map<string, CacheEntry>()
const TTL = 60 * 1000

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const windowKey = searchParams.get("window") ?? "7d"
  const ms = WINDOWS[windowKey] ?? WINDOWS["7d"]

  const cached = cache.get(windowKey)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  const now = Date.now()
  const since      = new Date(now - ms)
  const prevSince  = new Date(now - 2 * ms)
  const prevUntil  = since

  const [rows, prevRows] = await Promise.all([
    db.$queryRaw<TickerRow[]>`
      SELECT
        analysis->>'ticker' as ticker,
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE analysis->>'direction' = 'bullish')::int as bullish,
        COUNT(*) FILTER (WHERE analysis->>'direction' = 'bearish')::int as bearish,
        COUNT(*) FILTER (WHERE analysis->>'direction' = 'neutral')::int as neutral,
        AVG(NULLIF(analysis->>'conviction','')::float) as avg_conviction
      FROM "Post"
      WHERE analysis IS NOT NULL
        AND analysis->>'ticker' IS NOT NULL
        AND analysis->>'ticker' <> ''
        AND "createdAt" >= ${since}
      GROUP BY analysis->>'ticker'
      ORDER BY count DESC
      LIMIT 10
    `,
    db.$queryRaw<PrevRow[]>`
      SELECT analysis->>'ticker' as ticker, COUNT(*)::int as count
      FROM "Post"
      WHERE analysis IS NOT NULL
        AND analysis->>'ticker' IS NOT NULL
        AND analysis->>'ticker' <> ''
        AND "createdAt" >= ${prevSince}
        AND "createdAt" <  ${prevUntil}
      GROUP BY analysis->>'ticker'
    `,
  ])

  const prevMap = new Map(prevRows.map((r) => [r.ticker, r.count]))

  const tickers = rows.map((r) => {
    const prev = prevMap.get(r.ticker) ?? 0
    let trend: "up" | "down" | "flat" = "flat"
    if (prev === 0 && r.count > 0) trend = "up"
    else if (r.count >= prev * 1.2) trend = "up"
    else if (r.count <= prev * 0.8) trend = "down"
    return {
      ticker: r.ticker,
      count: r.count,
      bullish: r.bullish,
      bearish: r.bearish,
      neutral: r.neutral,
      avgConviction: r.avg_conviction != null ? Number(r.avg_conviction.toFixed(1)) : null,
      prevCount: prev,
      trend,
    }
  })

  const payload = { window: windowKey, tickers }
  cache.set(windowKey, { ts: Date.now(), data: payload })
  return NextResponse.json(payload)
}
