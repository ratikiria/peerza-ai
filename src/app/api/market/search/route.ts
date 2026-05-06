import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim()
  if (!q || q.length < 1) return NextResponse.json([])

  const results: {
    id: string; symbol: string; name: string; source: "crypto" | "yahoo"; type?: string
    cgId?: string; yahooSymbol?: string
  }[] = []

  await Promise.allSettled([
    // CoinGecko crypto search
    fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
      headers: { accept: "application/json" }, cache: "no-store",
    }).then(async (r) => {
      if (!r.ok) return
      const data = await r.json()
      for (const coin of (data.coins ?? []).slice(0, 4)) {
        results.push({
          id: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name,
          source: "crypto", cgId: coin.id, type: "Crypto",
        })
      }
    }),

    // Yahoo Finance search (stocks, ETFs, indices)
    fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, cache: "no-store" }
    ).then(async (r) => {
      if (!r.ok) return
      const data = await r.json()
      const allowed = ["EQUITY", "ETF", "INDEX", "CURRENCY", "FUTURE"]
      for (const quote of (data.quotes ?? [])) {
        if (!allowed.includes(quote.quoteType)) continue
        results.push({
          id: quote.symbol, symbol: quote.symbol,
          name: quote.longname ?? quote.shortname ?? quote.symbol,
          source: "yahoo", yahooSymbol: quote.symbol, type: quote.quoteType,
        })
      }
    }),
  ])

  return NextResponse.json(results.slice(0, 10))
}
