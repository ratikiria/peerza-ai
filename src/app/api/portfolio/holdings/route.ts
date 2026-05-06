import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { yahooToStooq } from "@/lib/market"
import { ASSET_TYPES, type AssetType } from "@/lib/portfolio"
import { getOrCreatePortfolio, fetchYahooMeta, lookupKnownSector, defaultSectorForType } from "@/lib/portfolio-server"

// DELETE /api/portfolio/holdings — clear ALL holdings in the caller's portfolio.
// Use with care; the UI gates this behind a confirm dialog.
export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const portfolio = await db.portfolio.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!portfolio) return NextResponse.json({ deleted: 0 })

  const { count } = await db.portfolioHolding.deleteMany({ where: { portfolioId: portfolio.id } })
  return NextResponse.json({ deleted: count })
}

interface AddBody {
  source: "crypto" | "yahoo"  // matches /api/market/search response
  id: string                  // CoinGecko id or Yahoo symbol
  symbol: string              // display symbol
  name: string
  assetType: AssetType
  quantity: number
  avgCost?: number | null
  sector?: string | null
  region?: string | null
}

// POST /api/portfolio/holdings — add a holding to the caller's portfolio.
// Sector/region auto-fetched from Yahoo for stocks/ETFs when not provided.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: AddBody
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }) }

  // Validate
  if (!body.symbol || !body.name) return NextResponse.json({ error: "missing_symbol" }, { status: 400 })
  if (!ASSET_TYPES.includes(body.assetType)) return NextResponse.json({ error: "invalid_asset_type" }, { status: 400 })
  if (typeof body.quantity !== "number" || body.quantity <= 0) {
    return NextResponse.json({ error: "invalid_quantity" }, { status: 400 })
  }
  if (body.avgCost != null && (typeof body.avgCost !== "number" || body.avgCost < 0)) {
    return NextResponse.json({ error: "invalid_cost" }, { status: 400 })
  }

  // Resolve priceKey — same convention used by /api/market/prices
  const priceKey = body.source === "crypto" ? body.id : yahooToStooq(body.id)

  // Resolve sector/region. Order: client override → hardcoded map → Yahoo → type default.
  // The hardcoded map covers ~100 popular tickers with curated buckets that are
  // far more reliable than Yahoo's quoteSummary (which rate-limits and has gaps,
  // especially for ETFs).
  let sector = body.sector ?? null
  let region = body.region ?? null

  if (!sector || !region) {
    const known = lookupKnownSector(body.symbol)
    sector ??= known.sector
    region ??= known.region
  }

  if (!sector && (body.assetType === "stock" || body.assetType === "etf") && body.source === "yahoo") {
    const meta = await fetchYahooMeta(body.id)
    sector ??= meta.sector
    region ??= meta.region
  }

  // Final fallback by asset type so the analysis always has a non-null bucket
  const defaults = defaultSectorForType(body.assetType)
  sector ??= defaults.sector
  region ??= defaults.region

  const portfolio = await getOrCreatePortfolio(session.user.id)

  // Upsert by (portfolioId, symbol) — re-adding the same ticker updates qty/cost
  const holding = await db.portfolioHolding.upsert({
    where: { portfolioId_symbol: { portfolioId: portfolio.id, symbol: body.symbol.toUpperCase() } },
    update: {
      name: body.name,
      assetType: body.assetType,
      priceKey,
      quantity: body.quantity,
      avgCost: body.avgCost ?? null,
      sector,
      region,
    },
    create: {
      portfolioId: portfolio.id,
      symbol: body.symbol.toUpperCase(),
      name: body.name,
      assetType: body.assetType,
      priceKey,
      quantity: body.quantity,
      avgCost: body.avgCost ?? null,
      sector,
      region,
    },
  })

  return NextResponse.json({ holding })
}
