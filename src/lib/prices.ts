// Single-asset price fetch for trade execution. Mirrors the source logic from
// /api/market/prices but exposed as a library function so server routes can
// skip the self-HTTP roundtrip.
//
// Why the lib exists: /api/challenges/[id]/trade was doing
// `fetch(`${baseUrl}/api/market/prices?...`)` to its own origin. From a Railway
// container that loopback goes out through Railway's edge → DNS → TLS → back
// in, adding 500–1500ms of latency on top of the upstream provider call, and
// occasionally just times out under load. Calling this function directly
// avoids all of that and gives the trade route a single, predictable hop.

import { stooqToYahoo } from "./market"

const FETCH_TIMEOUT_MS = 5000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    p.then(
      (v) => { clearTimeout(id); resolve(v) },
      (err) => { clearTimeout(id); reject(err) },
    )
  })
}

// Stooq occasionally emits malformed JSON when a row's volume field is empty:
// `"volume":}` or `"volume":,`. Repair both before parsing.
function fixStooqJson(raw: string): string {
  return raw
    .replace(/"volume"\s*:\s*}/g, '"volume":0}')
    .replace(/"volume"\s*:\s*,/g, '"volume":0,')
}

async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=json`
    const res = await withTimeout(
      fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS,
      "stooq",
    )
    if (!res.ok) return null
    const text = await res.text()
    const data = JSON.parse(fixStooqJson(text))
    const sym = data?.symbols?.[0]
    if (!sym || sym.close == null || sym.close === 0) return null
    return sym.close as number
  } catch {
    return null
  }
}

async function fetchYahoo(yahooSym: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`
    const res = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        cache: "no-store",
      }),
      FETCH_TIMEOUT_MS,
      "yahoo",
    )
    if (!res.ok) return null
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (price == null || price === 0) return null
    return price as number
  } catch {
    return null
  }
}

async function fetchCoinGecko(id: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&precision=2`
    const res = await withTimeout(
      fetch(url, { headers: { accept: "application/json" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS,
      "coingecko",
    )
    if (!res.ok) return null
    const data = await res.json()
    const price = data?.[id]?.usd
    if (price == null || price === 0) return null
    return price as number
  } catch {
    return null
  }
}

/**
 * Fetch a single asset's current USD price for trade execution.
 *
 * - Crypto: CoinGecko by id (e.g. "bitcoin", "ethereum", "solana").
 * - Everything else: race Stooq + Yahoo for the same Stooq-style key
 *   (e.g. "nvda.us") and take whichever returns first with a valid price.
 *
 * Returns null if every source failed.
 */
export async function fetchAssetPrice(priceKey: string, assetType: string): Promise<number | null> {
  if (assetType === "crypto") {
    return fetchCoinGecko(priceKey)
  }
  const yahooSym = stooqToYahoo(priceKey)
  return new Promise((resolve) => {
    let settled = false
    let pending = 2
    function maybeFinish(value: number | null) {
      if (settled) return
      if (value != null) {
        settled = true
        resolve(value)
        return
      }
      pending -= 1
      if (pending === 0) resolve(null)
    }
    fetchStooq(priceKey).then(maybeFinish, () => maybeFinish(null))
    fetchYahoo(yahooSym).then(maybeFinish, () => maybeFinish(null))
  })
}
