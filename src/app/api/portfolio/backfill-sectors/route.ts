import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { AssetType } from "@/lib/portfolio"
import { lookupKnownSector, defaultSectorForType, fetchYahooMeta } from "@/lib/portfolio-server"

// POST /api/portfolio/backfill-sectors — re-resolves sector/region for the
// caller's holdings using the new known-sector map + Yahoo fallback. Useful
// after the sector map is updated, or for old holdings created before the map
// existed.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const portfolio = await db.portfolio.findFirst({
    where: { userId: session.user.id },
    include: { holdings: true },
  })
  if (!portfolio) return NextResponse.json({ updated: 0 })

  let updated = 0
  for (const h of portfolio.holdings) {
    const known = lookupKnownSector(h.symbol)
    let sector = known.sector
    let region = known.region

    if (!sector && (h.assetType === "stock" || h.assetType === "etf")) {
      const meta = await fetchYahooMeta(h.symbol)
      sector ??= meta.sector
      region ??= meta.region
    }

    const defaults = defaultSectorForType(h.assetType as AssetType)
    sector ??= defaults.sector
    region ??= defaults.region

    if (sector !== h.sector || region !== h.region) {
      await db.portfolioHolding.update({
        where: { id: h.id },
        data: { sector, region },
      })
      updated += 1
    }
  }

  return NextResponse.json({ updated, total: portfolio.holdings.length })
}
