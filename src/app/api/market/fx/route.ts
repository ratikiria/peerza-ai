import { NextResponse } from "next/server"

// GET /api/market/fx?base=USD&symbols=EUR,GBP,GEL
// Backed by open.er-api.com (free, no key, ~165 currencies including GEL).
// Cached at the edge for ~1 hour — upstream rates update once per day.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const base = (searchParams.get("base") || "USD").toUpperCase().slice(0, 3)
  const symbols = (searchParams.get("symbols") || "")
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Z]{3}$/.test(s) && s !== base)

  if (symbols.length === 0) {
    return NextResponse.json({ base, rates: {} })
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return NextResponse.json({ base, rates: {}, error: "Upstream error" }, { status: 502 })
    }
    const data = await res.json() as {
      result: string
      base_code: string
      rates: Record<string, number>
      time_last_update_utc?: string
    }
    if (data.result !== "success") {
      return NextResponse.json({ base, rates: {}, error: "Upstream not OK" }, { status: 502 })
    }
    const filtered: Record<string, number> = {}
    for (const sym of symbols) {
      if (data.rates[sym] != null) filtered[sym] = data.rates[sym]
    }
    return NextResponse.json({
      base: data.base_code,
      date: data.time_last_update_utc ?? new Date().toISOString(),
      rates: filtered,
    })
  } catch {
    return NextResponse.json({ base, rates: {}, error: "Network error" }, { status: 502 })
  }
}
