import { NextResponse } from "next/server"

const TTL = 5 * 60_000 // 5 minutes
const cache: Record<string, { data: unknown; ts: number }> = {}

function normaliseLabel(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes("extreme fear"))  return "Extreme Fear"
  if (s.includes("fear"))          return "Fear"
  if (s.includes("extreme greed")) return "Extreme Greed"
  if (s.includes("greed"))         return "Greed"
  return "Neutral"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") === "stocks" ? "stocks" : "crypto"

  if (cache[type] && Date.now() - cache[type].ts < TTL) {
    return NextResponse.json(cache[type].data)
  }

  if (type === "stocks") {
    try {
      const res = await fetch(
        "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: "https://www.cnn.com/markets/fear-and-greed",
            Accept: "application/json",
          },
          cache: "no-store",
        }
      )
      if (res.ok) {
        const data = await res.json()
        const fg = data?.fear_and_greed
        if (fg?.score != null) {
          const result = { value: Math.round(fg.score), label: normaliseLabel(fg.rating ?? "Neutral"), type: "stocks" }
          cache[type] = { data: result, ts: Date.now() }
          return NextResponse.json(result)
        }
      }
    } catch {}
    const fallback = { value: 50, label: "Neutral", type: "stocks" }
    cache[type] = { data: fallback, ts: Date.now() }
    return NextResponse.json(fallback)
  }

  // Crypto — alternative.me
  try {
    const res = await fetch(
      "https://api.alternative.me/fng/?limit=1",
      { headers: { accept: "application/json" }, cache: "no-store" }
    )
    if (res.ok) {
      const data = await res.json()
      const entry = data?.data?.[0]
      const result = {
        value: parseInt(entry?.value ?? "50"),
        label: normaliseLabel(entry?.value_classification ?? "Neutral"),
        type: "crypto",
      }
      cache[type] = { data: result, ts: Date.now() }
      return NextResponse.json(result)
    }
  } catch {}

  const fallback = { value: 50, label: "Neutral", type: "crypto" }
  cache[type] = { data: fallback, ts: Date.now() }
  return NextResponse.json(fallback)
}
