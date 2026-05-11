import { NextResponse } from "next/server"
import { stooqToYahoo } from "@/lib/market"

const cache = new Map<string, { data: unknown; ts: number }>()
const TTL = 30_000

const DEFAULT_CRYPTO = "bitcoin"
const DEFAULT_STOOQ  = "xauusd,nvda.us,dx.f,^spx"

const FETCH_TIMEOUT_MS = 3500 // hard cap so a slow source can't drag down the response

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }, (err) => { clearTimeout(id); reject(err) })
  })
}

function fixJson(raw: string): string {
  // Stooq sometimes emits empty volume: {"volume":} — fix it
  return raw.replace(/"volume"\s*:\s*}/g, '"volume":0}')
            .replace(/"volume"\s*:\s*,/g, '"volume":0,')
}

async function fetchStooq(symbol: string): Promise<{ close: number; open: number } | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=json`
    const res = await withTimeout(
      fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS, "stooq"
    )
    if (!res.ok) return null
    const text = await res.text()
    const data = JSON.parse(fixJson(text))
    const sym  = data?.symbols?.[0]
    if (!sym || sym.close == null || sym.close === 0) return null
    return { close: sym.close, open: sym.open ?? sym.close }
  } catch {
    return null
  }
}

// Yahoo v8 chart — same source the chart endpoint uses. Reliable globally for
// equities/ETFs/indices/forex. Returns regularMarketPrice + previous close + native currency.
async function fetchYahoo(yahooSym: string): Promise<{ close: number; open: number; currency?: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`
    const res = await withTimeout(
      fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS, "yahoo"
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const meta = result.meta
    const price = meta?.regularMarketPrice
    const prev  = meta?.chartPreviousClose ?? meta?.previousClose
    if (price == null || prev == null || price === 0) return null
    // Use previous close as "open" so percent-change math reads as today's move
    return { close: price, open: prev, currency: meta?.currency }
  } catch {
    return null
  }
}

// ── FX rates: USD per native unit ────────────────────────────────────────────
// 5-min cache. Uses Yahoo's chart endpoint for forex pairs.

const fxCache = new Map<string, { rate: number; ts: number }>()
const FX_TTL = 5 * 60 * 1000

// Map currency code → { yahoo symbol, invert }
// invert=false: yahoo regularMarketPrice IS USD-per-native (e.g. GBPUSD = USD per GBP)
// invert=true:  yahoo gives native-per-USD, we invert (e.g. USDJPY = JPY per USD)
const FX_MAP: Record<string, { sym: string; invert: boolean }> = {
  GBP: { sym: "GBPUSD=X", invert: false },
  EUR: { sym: "EURUSD=X", invert: false },
  AUD: { sym: "AUDUSD=X", invert: false },
  NZD: { sym: "NZDUSD=X", invert: false },
  JPY: { sym: "USDJPY=X", invert: true  },
  CHF: { sym: "USDCHF=X", invert: true  },
  CAD: { sym: "USDCAD=X", invert: true  },
  HKD: { sym: "USDHKD=X", invert: true  },
  CNY: { sym: "USDCNY=X", invert: true  },
  INR: { sym: "USDINR=X", invert: true  },
  BRL: { sym: "USDBRL=X", invert: true  },
  MXN: { sym: "USDMXN=X", invert: true  },
  ZAR: { sym: "USDZAR=X", invert: true  },
  SEK: { sym: "USDSEK=X", invert: true  },
  NOK: { sym: "USDNOK=X", invert: true  },
  DKK: { sym: "USDDKK=X", invert: true  },
  PLN: { sym: "USDPLN=X", invert: true  },
  KRW: { sym: "USDKRW=X", invert: true  },
  SGD: { sym: "USDSGD=X", invert: true  },
  TRY: { sym: "USDTRY=X", invert: true  },
  IDR: { sym: "USDIDR=X", invert: true  },
  THB: { sym: "USDTHB=X", invert: true  },
  ILS: { sym: "USDILS=X", invert: true  },
  TWD: { sym: "USDTWD=X", invert: true  },
}

async function getUsdRate(currency: string): Promise<number | null> {
  if (!currency) return null
  const code = currency.toUpperCase()
  if (code === "USD") return 1
  // Yahoo notation: "GBp" = pence, value is GBP/100. Resolve via GBP rate.
  if (currency === "GBp" || code === "GBX" || code === "GBP_PENCE") {
    const gbp = await getUsdRate("GBP")
    return gbp == null ? null : gbp * 0.01
  }
  if (code === "ILA") { // Israeli agorot
    const ils = await getUsdRate("ILS")
    return ils == null ? null : ils * 0.01
  }
  if (code === "ZAC") { // South African cents
    const zar = await getUsdRate("ZAR")
    return zar == null ? null : zar * 0.01
  }

  const mapped = FX_MAP[code]
  if (!mapped) return null

  const cached = fxCache.get(code)
  if (cached && Date.now() - cached.ts < FX_TTL) return cached.rate

  const r = await fetchYahoo(mapped.sym)
  if (!r) return null
  const native = r.close
  if (!native || native === 0) return null
  const rate = mapped.invert ? 1 / native : native
  fxCache.set(code, { rate, ts: Date.now() })
  return rate
}

// Race Stooq + Yahoo for a stooq symbol. Takes whichever returns first with valid data.
// US equities + Stooq-native instruments win on Stooq; international tickers usually
// only Yahoo can resolve, so this falls through quickly.
async function fetchStockQuote(stooqSym: string): Promise<{ close: number; open: number; currency?: string } | null> {
  const yahooSym = stooqToYahoo(stooqSym)
  return new Promise((resolve) => {
    let settled = false
    let pending = 2
    function maybeFinish(value: { close: number; open: number; currency?: string } | null) {
      if (settled) return
      if (value) { settled = true; resolve(value); return }
      pending -= 1
      if (pending === 0) resolve(null)
    }
    fetchStooq(stooqSym).then(maybeFinish, () => maybeFinish(null))
    fetchYahoo(yahooSym).then(maybeFinish, () => maybeFinish(null))
  })
}

// Display name / symbol override map
const DISPLAY: Record<string, { symbol: string; name: string }> = {
  "xauusd": { symbol: "GOLD",  name: "Gold"          },
  "xagusd": { symbol: "SILV",  name: "Silver"         },
  "dx.f":   { symbol: "DXY",   name: "US Dollar"      },
  "cl.f":   { symbol: "OIL",   name: "Crude Oil"      },
  "ng.f":   { symbol: "GAS",   name: "Nat. Gas"       },
  "^spx":   { symbol: "S&P500",name: "S&P 500"        },
  "^dji":   { symbol: "DOW",   name: "Dow Jones"      },
  "^ndq":   { symbol: "NDQ",   name: "NASDAQ"         },
  "^vix":   { symbol: "VIX",   name: "Volatility"     },
  "^tnx":   { symbol: "10Y",   name: "10yr Treasury"  },
  "^rut":   { symbol: "RUT",   name: "Russell 2000"   },
  "btc.v":  { symbol: "BTC",   name: "Bitcoin"        },
  "eth.v":  { symbol: "ETH",   name: "Ethereum"       },
}

function displayFor(stooq: string): { symbol: string; name: string } {
  const key = stooq.toLowerCase()
  if (DISPLAY[key]) return DISPLAY[key]
  // US equity: "nvda.us" → "NVDA"
  const clean = key.replace(/\.(us|uk|de|jp|hk)$/i, "").replace(/^\^/, "")
  return { symbol: clean.toUpperCase(), name: clean.toUpperCase() }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawCrypto = searchParams.get("crypto")
  const rawStooq  = searchParams.get("stooq")

  // Only fall back to defaults when BOTH params are missing (legacy "show watchlist" behavior).
  // Single-param callers (e.g. trade form fetching one symbol) get exactly what they asked for.
  const usingDefaults = rawCrypto === null && rawStooq === null
  const cryptoParam = rawCrypto ?? (usingDefaults ? DEFAULT_CRYPTO : "")
  const stooqParam  = rawStooq  ?? (usingDefaults ? DEFAULT_STOOQ  : "")

  const cacheKey = `${cryptoParam}|${stooqParam}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  const prices: {
    id: string; symbol: string; name: string
    price: number; change: number; up: boolean
    currency?: string; usdPrice?: number
  }[] = []

  const cryptoIds = cryptoParam.split(",").filter(Boolean)
  const stooqIds  = stooqParam.split(",").filter(Boolean)
  const expectedTotal = cryptoIds.length + stooqIds.length

  // CoinGecko returns empty from many cloud datacenter IPs (Railway included —
  // observed 2026-05-12). When that happens, fall back to Yahoo's crypto pairs
  // (e.g. BTC-USD) which serve reliably from any IP.
  const CRYPTO_TO_YAHOO: Record<string, string> = {
    bitcoin:       "BTC-USD",
    ethereum:      "ETH-USD",
    solana:        "SOL-USD",
    binancecoin:   "BNB-USD",
    cardano:       "ADA-USD",
    ripple:        "XRP-USD",
    dogecoin:      "DOGE-USD",
    polkadot:      "DOT-USD",
    "avalanche-2": "AVAX-USD",
    chainlink:     "LINK-USD",
    polygon:       "MATIC-USD",
    litecoin:      "LTC-USD",
    cosmos:        "ATOM-USD",
    uniswap:       "UNI-USD",
  }
  const CRYPTO_SYMBOL: Record<string, string> = {
    bitcoin: "BTC", ethereum: "ETH", solana: "SOL", binancecoin: "BNB",
    cardano: "ADA", ripple: "XRP", dogecoin: "DOGE", polkadot: "DOT",
    "avalanche-2": "AVAX", chainlink: "LINK", polygon: "MATIC",
    litecoin: "LTC", cosmos: "ATOM", uniswap: "UNI",
  }
  const CRYPTO_NAME: Record<string, string> = {
    bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana", binancecoin: "BNB",
    cardano: "Cardano", ripple: "XRP", dogecoin: "Dogecoin", polkadot: "Polkadot",
    "avalanche-2": "Avalanche", chainlink: "Chainlink", polygon: "Polygon",
    litecoin: "Litecoin", cosmos: "Cosmos", uniswap: "Uniswap",
  }

  await Promise.allSettled([
    // CoinGecko for crypto (already in USD)
    cryptoIds.length > 0 && fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(",")}&vs_currencies=usd&include_24hr_change=true&precision=2`,
      { headers: { accept: "application/json" }, cache: "no-store" }
    ).then(async (r) => {
      if (!r.ok) return
      const d = await r.json()
      for (const id of cryptoIds) {
        if (!d[id]) continue
        const name = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ")
        prices.push({
          id,
          symbol: id === "bitcoin" ? "BTC" : id === "ethereum" ? "ETH" : id === "solana" ? "SOL" : id.slice(0, 5).toUpperCase(),
          name:   id === "bitcoin" ? "Bitcoin" : id === "ethereum" ? "Ethereum" : id === "solana" ? "Solana" : name,
          price:  d[id].usd,
          change: parseFloat((d[id].usd_24h_change ?? 0).toFixed(2)),
          up:     (d[id].usd_24h_change ?? 0) >= 0,
          currency: "USD",
          usdPrice: d[id].usd,
        })
      }
    }),

    // Stocks / indices / commodities — race Stooq vs Yahoo, take fastest valid
    ...stooqIds.map(async (sym) => {
      const result = await fetchStockQuote(sym)
      if (!result) return
      const change = result.open !== 0
        ? parseFloat((((result.close - result.open) / result.open) * 100).toFixed(2))
        : 0
      const { symbol, name } = displayFor(sym)
      const currency = result.currency
      let usdPrice: number | undefined
      if (currency) {
        const rate = await getUsdRate(currency)
        if (rate != null) usdPrice = parseFloat((result.close * rate).toFixed(4))
      }
      prices.push({
        id: sym, symbol, name,
        price: result.close, change, up: change >= 0,
        currency, usdPrice,
      })
    }),
  ])

  // Yahoo fallback for any crypto id CoinGecko didn't return (rate-limited /
  // blocked / empty). Without this, the trade form's BUY button stays
  // disabled for crypto on hosts where CoinGecko is unreachable.
  const gotCryptoIds = new Set(
    prices.filter((p) => cryptoIds.includes(p.id)).map((p) => p.id),
  )
  const missingCrypto = cryptoIds.filter((id) => !gotCryptoIds.has(id))
  if (missingCrypto.length > 0) {
    await Promise.allSettled(
      missingCrypto.map(async (id) => {
        const yahooSym = CRYPTO_TO_YAHOO[id.toLowerCase()]
        if (!yahooSym) return
        const r = await fetchYahoo(yahooSym)
        if (!r) return
        const change = r.open !== 0
          ? parseFloat((((r.close - r.open) / r.open) * 100).toFixed(2))
          : 0
        prices.push({
          id,
          symbol: CRYPTO_SYMBOL[id] ?? id.slice(0, 5).toUpperCase(),
          name:   CRYPTO_NAME[id]   ?? (id.charAt(0).toUpperCase() + id.slice(1)),
          price: r.close,
          change,
          up: change >= 0,
          currency: "USD",
          usdPrice: r.close,
        })
      }),
    )
  }

  // Only cache if every requested asset returned data — otherwise the next
  // poll will retry and pick up whatever was timing out / cold.
  if (prices.length === expectedTotal && expectedTotal > 0) {
    cache.set(cacheKey, { data: prices, ts: Date.now() })
  }
  return NextResponse.json(prices)
}
