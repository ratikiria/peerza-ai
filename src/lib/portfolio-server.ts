import "server-only"
import { db } from "@/lib/db"
import type { AssetType } from "@/lib/portfolio"
import { lookupKnownSector } from "@/lib/sectors"

// Re-export so existing API routes can keep importing from this module.
// (The actual map lives in `lib/sectors.ts` so the client can use it too.)
export { lookupKnownSector }

// Default sectors when an asset type already implies a bucket.
export function defaultSectorForType(assetType: AssetType): { sector: string | null; region: string | null } {
  if (assetType === "crypto") return { sector: "Crypto", region: "Global" }
  if (assetType === "cash")   return { sector: "Cash", region: "Global" }
  if (assetType === "bond")   return { sector: "Fixed Income", region: null }
  if (assetType === "etf")    return { sector: "ETF / Diversified", region: null }  // safe fallback
  return { sector: null, region: null }
}

// Get or create the caller's primary portfolio. We allow only one for v1 —
// users rarely want multiple, and it keeps the UI simple.
export async function getOrCreatePortfolio(userId: string) {
  const existing = await db.portfolio.findFirst({
    where: { userId },
    include: { holdings: { orderBy: { addedAt: "desc" } } },
  })
  if (existing) return existing
  return db.portfolio.create({
    data: { userId },
    include: { holdings: true },
  })
}

// Best-effort sector + region lookup for a stock ticker via Yahoo's quoteSummary.
// Returns nulls on failure — analysis falls back to "Unknown" bucket gracefully.
export async function fetchYahooMeta(symbol: string): Promise<{ sector: string | null; region: string | null }> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,summaryProfile,price`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return { sector: null, region: null }
    const data = await res.json()
    const result = data?.quoteSummary?.result?.[0]
    const sector = result?.assetProfile?.sector ?? result?.summaryProfile?.sector ?? null
    const country = result?.assetProfile?.country ?? result?.summaryProfile?.country ?? null
    return { sector, region: countryToRegion(country) }
  } catch {
    return { sector: null, region: null }
  }
}

function countryToRegion(country: string | null): string | null {
  if (!country) return null
  const c = country.toLowerCase()
  if (c.includes("united states") || c.includes("usa")) return "US"
  if (["canada", "mexico"].some((x) => c.includes(x))) return "Americas"
  if (["united kingdom", "germany", "france", "spain", "italy", "netherlands", "switzerland", "ireland", "sweden", "norway", "denmark", "finland", "belgium", "austria", "portugal"].some((x) => c.includes(x))) return "EU"
  if (["china", "japan", "korea", "taiwan", "hong kong", "singapore"].some((x) => c.includes(x))) return "APAC"
  if (["india", "indonesia", "thailand", "vietnam", "malaysia", "philippines"].some((x) => c.includes(x))) return "EM-Asia"
  if (["brazil", "argentina", "chile", "colombia"].some((x) => c.includes(x))) return "LATAM"
  return "Other"
}
