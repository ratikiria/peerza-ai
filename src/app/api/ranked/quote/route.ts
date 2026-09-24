import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { assetKindFor, getRankQuote, yahooSymbolFor } from "@/lib/ranked-market"

// Live inputs for the ranked-call composer: the price the entry would lock
// at, the asset's recent volatility (for difficulty) and its session hours
// (for deadlines). The composer runs the same lib/ranked.ts math the server
// uses on submit, so the preview matches what gets stored.
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const source = url.searchParams.get("source")
  const key = url.searchParams.get("key") ?? ""
  const ticker = url.searchParams.get("ticker") ?? ""
  if ((source !== "crypto" && source !== "stooq") || !key) {
    return NextResponse.json({ error: "source and key required" }, { status: 400 })
  }

  const symbol = yahooSymbolFor(source, key, ticker)
  const quote = symbol ? await getRankQuote(symbol) : null
  if (!quote) return NextResponse.json({ rankable: false })

  return NextResponse.json({
    rankable: true,
    kind: assetKindFor(source),
    price: quote.price,
    dailySigmaPct: quote.dailySigmaPct,
    session: quote.session,
  })
}
