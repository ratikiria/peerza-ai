import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCandles, yahooSymbolFor } from "@/lib/ranked-market"

// GET /api/market/spark?source=crypto|stooq&key=<priceKey>&ticker=<T>&from=<ms>&to=<ms>&ctx=<ms>
// Close prices for a trade-idea sparkline. Yahoo-backed (same source and
// symbol mapping as the Ranked Calls resolver), downsampled to ≤ 60 points.

const MAX_POINTS = 60
const TTL_MS = 10 * 60_000
const cache = new Map<string, { at: number; closes: number[] }>()

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(req.url).searchParams
  const source = q.get("source")
  const key = q.get("key") ?? ""
  const ticker = q.get("ticker") ?? ""
  const now = Date.now()
  const from = Number(q.get("from"))
  const to = Math.min(now, Number(q.get("to")) || now)
  if ((source !== "crypto" && source !== "stooq") || !key || !Number.isFinite(from) || from >= to) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 })
  }

  const symbol = yahooSymbolFor(source, key, ticker)
  if (!symbol) return NextResponse.json({ closes: [] })

  // Context before the call (client passes ~the call's own window) so a fresh
  // call still shows the trend it was made into, not a flat stub.
  const ctx = Math.min(Math.max(Number(q.get("ctx")) || 0, 6 * 3_600_000), 400 * 86_400_000)
  const start = from - ctx
  // Bucket the cache key so near-identical requests share an entry.
  const ck = `${symbol}:${Math.round(start / TTL_MS)}:${Math.round(to / TTL_MS)}`
  const hit = cache.get(ck)
  if (hit && now - hit.at < TTL_MS) return NextResponse.json({ closes: hit.closes })

  const data = await getCandles(symbol, start, to)
  const all = data?.candles.map((c) => c.c) ?? []
  const step = Math.max(1, Math.ceil(all.length / MAX_POINTS))
  const closes = all.filter((_, i) => i % step === 0 || i === all.length - 1)
  if (closes.length > 0) cache.set(ck, { at: now, closes })
  return NextResponse.json(
    { closes },
    { headers: { "Cache-Control": "private, max-age=300" } },
  )
}
