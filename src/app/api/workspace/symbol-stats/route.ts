import { NextRequest, NextResponse } from "next/server"

interface Stats {
  symbol: string
  name: string
  price: number
  changePct: number
  volume24h?: number
  marketCap?: number
  high?: number
  low?: number
  highLabel?: string
  lowLabel?: string
  currency: string
  source: "crypto" | "stock"
}

const cache = new Map<string, { data: Stats; ts: number }>()
const TTL = 5 * 60 * 1000

const FETCH_TIMEOUT_MS = 4000
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }, (e) => { clearTimeout(id); reject(e) })
  })
}

const CG_BY_TICKER: Record<string, string> = {
  BTC:   "bitcoin",
  ETH:   "ethereum",
  SOL:   "solana",
  XRP:   "ripple",
  ADA:   "cardano",
  DOGE:  "dogecoin",
  DOT:   "polkadot",
  BNB:   "binancecoin",
  MATIC: "matic-network",
  AVAX:  "avalanche-2",
  LINK:  "chainlink",
  LTC:   "litecoin",
  SHIB:  "shiba-inu",
  TRX:   "tron",
  ATOM:  "cosmos",
  NEAR:  "near",
  ARB:   "arbitrum",
  OP:    "optimism",
  APT:   "aptos",
  SUI:   "sui",
  TON:   "the-open-network",
  PEPE:  "pepe",
  UNI:   "uniswap",
}

function tvToYahoo(tv: string): string | null {
  const upper = tv.toUpperCase()
  if (upper.startsWith("BINANCE:")) return null
  const indices: Record<string, string> = {
    "TVC:SPX":  "^GSPC",
    "TVC:NDX":  "^NDX",
    "TVC:DJI":  "^DJI",
    "TVC:VIX":  "^VIX",
    "TVC:UKX":  "^FTSE",
    "TVC:DAX":  "^GDAXI",
    "TVC:NI225":"^N225",
    "TVC:DXY":  "DX-Y.NYB",
    "TVC:USOIL":"CL=F",
    "TVC:NATURALGAS": "NG=F",
  }
  if (indices[upper]) return indices[upper]
  if (upper.startsWith("OANDA:")) return `${upper.slice(6)}=X`
  const colon = upper.indexOf(":")
  if (colon >= 0) return upper.slice(colon + 1)
  return upper
}

async function fetchYahoo(yahooSym: string): Promise<Stats | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=1y`
    const res = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        cache: "no-store",
      }),
      FETCH_TIMEOUT_MS, "yahoo",
    )
    if (!res.ok) return null
    const d = await res.json()
    const r = d?.chart?.result?.[0]
    if (!r) return null
    const m = r.meta
    const price = m?.regularMarketPrice
    const prev  = m?.chartPreviousClose ?? m?.previousClose
    if (price == null || prev == null || price === 0) return null
    const changePct = parseFloat((((price - prev) / prev) * 100).toFixed(2))
    return {
      symbol:    m?.symbol ?? yahooSym,
      name:      m?.longName ?? m?.shortName ?? m?.symbol ?? yahooSym,
      price,
      changePct,
      volume24h: typeof m?.regularMarketVolume === "number" ? m.regularMarketVolume : undefined,
      high:      typeof m?.fiftyTwoWeekHigh === "number" ? m.fiftyTwoWeekHigh : undefined,
      low:       typeof m?.fiftyTwoWeekLow  === "number" ? m.fiftyTwoWeekLow  : undefined,
      highLabel: "52w high",
      lowLabel:  "52w low",
      currency:  m?.currency ?? "USD",
      source:    "stock",
    }
  } catch {
    return null
  }
}

async function fetchCrypto(cgId: string): Promise<Stats | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
    const res = await withTimeout(
      fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS, "coingecko",
    )
    if (!res.ok) return null
    const d = await res.json()
    const md = d?.market_data
    if (!md) return null
    const price = md.current_price?.usd
    if (price == null) return null
    return {
      symbol:    (d.symbol ?? "").toUpperCase(),
      name:      d.name ?? cgId,
      price,
      changePct: parseFloat((md.price_change_percentage_24h ?? 0).toFixed(2)),
      volume24h: md.total_volume?.usd,
      marketCap: md.market_cap?.usd,
      high:      md.ath?.usd,
      low:       md.atl?.usd,
      highLabel: "ATH",
      lowLabel:  "ATL",
      currency:  "USD",
      source:    "crypto",
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tv = searchParams.get("tv")?.trim()
  if (!tv) return NextResponse.json({ error: "tv required" }, { status: 400 })

  const key = tv.toUpperCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  let stats: Stats | null = null

  if (key.startsWith("BINANCE:")) {
    const after = key.slice(8)
    const ticker = after.endsWith("USDT") ? after.slice(0, -4)
                 : after.endsWith("USD")  ? after.slice(0, -3)
                 : after
    const cgId = CG_BY_TICKER[ticker]
    if (cgId) stats = await fetchCrypto(cgId)
  } else {
    const yahoo = tvToYahoo(tv)
    if (yahoo) stats = await fetchYahoo(yahoo)
  }

  if (!stats) {
    return NextResponse.json({ error: "No data for this symbol" }, { status: 404 })
  }

  cache.set(key, { data: stats, ts: Date.now() })
  return NextResponse.json(stats)
}
