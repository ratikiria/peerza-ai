// Market data for Ranked Calls, server-only. Everything a ranked call needs —
// the locked entry, recent volatility, session hours and settlement candles —
// comes from Yahoo's chart API so entry and settlement use the same source.

import { CRYPTO_TO_YAHOO } from "@/lib/prices"
import { stooqToYahoo } from "@/lib/market"
import type { AssetKind, SessionHint } from "@/lib/ranked"

const FETCH_TIMEOUT_MS = 8000

export interface Candle { t: number; o: number; h: number; l: number; c: number }

interface YahooMeta {
  regularMarketPrice?: number
  regularMarketTime?: number
  gmtoffset?: number
  currentTradingPeriod?: { regular?: { start: number; end: number } }
}

interface ChartResult { meta: YahooMeta; candles: Candle[] }

/** Yahoo symbol for a trade idea's snapshotted price key, or null if unsupported. */
export function yahooSymbolFor(priceSource: "crypto" | "stooq", priceKey: string, ticker: string): string | null {
  if (priceSource === "crypto") {
    const mapped = CRYPTO_TO_YAHOO[priceKey.toLowerCase()]
    if (mapped) return mapped
    const t = ticker.trim().toUpperCase()
    return /^[A-Z0-9]{2,10}$/.test(t) ? `${t}-USD` : null
  }
  return stooqToYahoo(priceKey)
}

export function assetKindFor(priceSource: "crypto" | "stooq"): AssetKind {
  return priceSource === "crypto" ? "crypto" : "market"
}

async function fetchChart(symbol: string, query: string): Promise<ChartResult | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const ts: number[] = result.timestamp ?? []
    const q = result.indicators?.quote?.[0] ?? {}
    const candles: Candle[] = []
    for (let i = 0; i < ts.length; i++) {
      const c = q.close?.[i]
      if (c == null || !Number.isFinite(c)) continue
      candles.push({ t: ts[i] * 1000, o: q.open?.[i] ?? c, h: q.high?.[i] ?? c, l: q.low?.[i] ?? c, c })
    }
    return { meta: result.meta ?? {}, candles }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface RankQuote {
  symbol: string
  price: number
  /** Stdev of daily returns over ~3 months, in percent. Null if too little history. */
  dailySigmaPct: number | null
  session: SessionHint | null
}

const quoteCache = new Map<string, { at: number; quote: RankQuote }>()
const QUOTE_TTL_MS = 60_000

export async function getRankQuote(symbol: string): Promise<RankQuote | null> {
  const hit = quoteCache.get(symbol)
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit.quote

  const chart = await fetchChart(symbol, "range=3mo&interval=1d")
  const price = chart?.meta.regularMarketPrice
  if (!chart || price == null || !Number.isFinite(price) || price <= 0) return null

  const closes = chart.candles.map((c) => c.c)
  let dailySigmaPct: number | null = null
  if (closes.length >= 15) {
    const rets: number[] = []
    for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]))
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length
    const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1)
    dailySigmaPct = Math.sqrt(variance) * 100
  }

  const reg = chart.meta.currentTradingPeriod?.regular
  const session: SessionHint | null = reg && chart.meta.gmtoffset != null
    ? { gmtOffsetSec: chart.meta.gmtoffset, regularStartMs: reg.start * 1000, regularEndMs: reg.end * 1000 }
    : null

  const quote: RankQuote = { symbol, price, dailySigmaPct, session }
  quoteCache.set(symbol, { at: Date.now(), quote })
  return quote
}

/**
 * Candles covering [fromMs, toMs]. Picks the finest interval Yahoo serves for
 * that age: 1m for the last week, 5m for ~2 months, 1h beyond.
 */
export async function getCandles(symbol: string, fromMs: number, toMs: number): Promise<{ candles: Candle[]; intervalMs: number } | null> {
  const age = Date.now() - fromMs
  const span = toMs - fromMs
  const DAY = 86_400_000
  const [interval, intervalMs] =
    age < 6.5 * DAY && span < 6.5 * DAY ? ["1m", 60_000]
    : age < 58 * DAY ? ["5m", 300_000]
    : ["1h", 3_600_000]
  const p1 = Math.floor(fromMs / 1000)
  const p2 = Math.ceil(toMs / 1000)
  const chart = await fetchChart(symbol, `period1=${p1}&period2=${p2}&interval=${interval}`)
  if (!chart) return null
  return { candles: chart.candles.filter((c) => c.t + intervalMs > fromMs && c.t <= toMs), intervalMs }
}
