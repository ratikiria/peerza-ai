import { NextResponse } from "next/server"

const KEY = "dc6zaTOxFJmzC"

const cache = new Map<string, { data: unknown; ts: number }>()
const TTL = 5 * 60_000

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get("q")?.trim() ?? ""
  const type = q ? "search" : "trending"

  const cacheKey = `${type}:${q}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const params = new URLSearchParams({
      api_key: KEY,
      rating:  "g",
      limit:   "18",
      ...(q ? { q } : {}),
    })
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/${type}?${params}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })

    const data = await res.json()
    const gifs = (data.data ?? []).map((g: any) => ({
      id:       g.id,
      title:    g.title ?? "",
      preview:  g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url ?? "",
      original: g.images?.original?.url          ?? g.images?.fixed_height?.url  ?? "",
    }))

    cache.set(cacheKey, { data: gifs, ts: Date.now() })
    return NextResponse.json(gifs)
  } catch {
    return NextResponse.json([])
  }
}
