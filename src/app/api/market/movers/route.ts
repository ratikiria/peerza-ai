import { NextResponse } from "next/server"

interface Mover {
  symbol: string
  name: string
  change: number
  up: boolean
}

interface MoversResponse {
  gainers: Mover[]
  losers: Mover[]
}

const cache = new Map<string, { data: MoversResponse; ts: number }>()
const TTL = 2 * 60_000 // 2 minutes

const FETCH_TIMEOUT_MS = 5000

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }, (e) => { clearTimeout(id); reject(e) })
  })
}

// Curated mega-cap watchlist for stock movers — broad sector coverage
const STOCK_BASKET: { sym: string; name: string }[] = [
  { sym: "NVDA",  name: "NVIDIA" },
  { sym: "AAPL",  name: "Apple" },
  { sym: "MSFT",  name: "Microsoft" },
  { sym: "GOOGL", name: "Alphabet" },
  { sym: "AMZN",  name: "Amazon" },
  { sym: "META",  name: "Meta Platforms" },
  { sym: "TSLA",  name: "Tesla" },
  { sym: "BRK-B", name: "Berkshire Hathaway" },
  { sym: "JPM",   name: "JPMorgan Chase" },
  { sym: "V",     name: "Visa" },
  { sym: "MA",    name: "Mastercard" },
  { sym: "WMT",   name: "Walmart" },
  { sym: "XOM",   name: "Exxon Mobil" },
  { sym: "CVX",   name: "Chevron" },
  { sym: "JNJ",   name: "Johnson & Johnson" },
  { sym: "PG",    name: "Procter & Gamble" },
  { sym: "KO",    name: "Coca-Cola" },
  { sym: "PEP",   name: "PepsiCo" },
  { sym: "AVGO",  name: "Broadcom" },
  { sym: "AMD",   name: "AMD" },
  { sym: "NFLX",  name: "Netflix" },
  { sym: "DIS",   name: "Disney" },
  { sym: "INTC",  name: "Intel" },
  { sym: "BAC",   name: "Bank of America" },
  { sym: "PFE",   name: "Pfizer" },
  { sym: "ORCL",  name: "Oracle" },
  { sym: "CRM",   name: "Salesforce" },
  { sym: "ADBE",  name: "Adobe" },
  { sym: "BABA",  name: "Alibaba" },
  { sym: "UBER",  name: "Uber" },
]

// Major forex pairs — most-traded, broad coverage
const FOREX_BASKET: { sym: string; name: string }[] = [
  { sym: "EURUSD=X", name: "EUR / USD" },
  { sym: "GBPUSD=X", name: "GBP / USD" },
  { sym: "USDJPY=X", name: "USD / JPY" },
  { sym: "USDCHF=X", name: "USD / CHF" },
  { sym: "AUDUSD=X", name: "AUD / USD" },
  { sym: "NZDUSD=X", name: "NZD / USD" },
  { sym: "USDCAD=X", name: "USD / CAD" },
  { sym: "EURGBP=X", name: "EUR / GBP" },
  { sym: "EURJPY=X", name: "EUR / JPY" },
  { sym: "GBPJPY=X", name: "GBP / JPY" },
  { sym: "USDMXN=X", name: "USD / MXN" },
  { sym: "USDCNY=X", name: "USD / CNY" },
]

async function yahooChange(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`
    const res = await withTimeout(
      fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, cache: "no-store" }),
      FETCH_TIMEOUT_MS
    )
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    const prev  = meta?.chartPreviousClose ?? meta?.previousClose
    if (price == null || prev == null || prev === 0) return null
    return ((price - prev) / prev) * 100
  } catch { return null }
}

async function fetchCryptoMovers(): Promise<MoversResponse> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=80&page=1&sparkline=false&price_change_percentage=24h",
    { headers: { accept: "application/json" }, cache: "no-store" }
  )
  if (!res.ok) throw new Error("crypto upstream error")
  const coins: { symbol: string; name: string; price_change_percentage_24h: number | null }[] = await res.json()
  const valid = coins.filter((c) => typeof c.price_change_percentage_24h === "number")
  const sorted = [...valid].sort(
    (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
  )
  return {
    gainers: sorted.slice(0, 5).map((c) => ({
      symbol: c.symbol.toUpperCase(), name: c.name,
      change: parseFloat((c.price_change_percentage_24h ?? 0).toFixed(2)), up: true,
    })),
    losers: sorted.slice(-5).reverse().map((c) => ({
      symbol: c.symbol.toUpperCase(), name: c.name,
      change: parseFloat((c.price_change_percentage_24h ?? 0).toFixed(2)), up: false,
    })),
  }
}

async function fetchBasketMovers(basket: { sym: string; name: string }[]): Promise<MoversResponse> {
  const results = await Promise.all(
    basket.map(async (b) => {
      const change = await yahooChange(b.sym)
      return change != null ? { ...b, change } : null
    })
  )
  const valid = results.filter((r): r is { sym: string; name: string; change: number } => r !== null)
  const sorted = [...valid].sort((a, b) => b.change - a.change)
  return {
    gainers: sorted.slice(0, 5).map((r) => ({
      symbol: r.sym.replace("=X", "").replace("-", "."),
      name: r.name,
      change: parseFloat(r.change.toFixed(2)),
      up: true,
    })),
    losers: sorted.slice(-5).reverse().map((r) => ({
      symbol: r.sym.replace("=X", "").replace("-", "."),
      name: r.name,
      change: parseFloat(r.change.toFixed(2)),
      up: false,
    })),
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = (url.searchParams.get("type") ?? "crypto").toLowerCase()
  const validType = type === "stocks" || type === "forex" ? type : "crypto"

  const cached = cache.get(validType)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    let result: MoversResponse
    if (validType === "stocks")     result = await fetchBasketMovers(STOCK_BASKET)
    else if (validType === "forex") result = await fetchBasketMovers(FOREX_BASKET)
    else                            result = await fetchCryptoMovers()

    if (result.gainers.length > 0 || result.losers.length > 0) {
      cache.set(validType, { data: result, ts: Date.now() })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ gainers: [], losers: [] })
  }
}
