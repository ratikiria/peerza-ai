// Trade outcome detection — checks open Trade Idea posts and stamps TARGET_HIT
// when the live price reaches the target. Beginner-safe: never flips a post to
// a "wrong" or "stopped out" state. Posts that never hit just stay OPEN silently.

import { db } from "@/lib/db"

interface AnalysisShape {
  ticker?: string
  direction?: "bullish" | "bearish" | "neutral"
  entry?: string
  target?: string
  priceKey?: string
  priceSource?: "crypto" | "stooq"
}

const RECHECK_MIN_INTERVAL_MS = 5 * 60 * 1000 // don't recheck the same post within 5 min

function parseNumeric(s?: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[, ]/g, "").trim()
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

async function fetchPriceFor(priceKey: string, priceSource: "crypto" | "stooq", baseUrl: string, cookieHeader: string): Promise<number | null> {
  const param = priceSource === "crypto" ? `crypto=${encodeURIComponent(priceKey)}` : `stooq=${encodeURIComponent(priceKey)}`
  try {
    const res = await fetch(`${baseUrl}/api/market/prices?${param}`, { headers: { cookie: cookieHeader } })
    if (!res.ok) return null
    const data: { id: string; price: number; usdPrice?: number }[] = await res.json()
    const entry = Array.isArray(data) ? data[0] : null
    if (!entry) return null
    // Prefer USD price for cross-currency consistency, fall back to native
    return entry.usdPrice ?? entry.price ?? null
  } catch {
    return null
  }
}

interface PostForCheck {
  id: string
  analysis: unknown
  outcomeStatus: "OPEN" | "TARGET_HIT"
  outcomeCheckedAt: Date | null
}

export async function checkOutcomesForPosts(posts: PostForCheck[], baseUrl: string, cookieHeader: string): Promise<void> {
  const now = Date.now()
  const candidates = posts.filter((p) => {
    if (p.outcomeStatus !== "OPEN") return false
    if (!p.analysis || typeof p.analysis !== "object") return false
    const a = p.analysis as AnalysisShape
    if (!a.target || !a.priceKey || !a.priceSource) return false
    if (a.direction !== "bullish" && a.direction !== "bearish") return false
    if (p.outcomeCheckedAt && now - p.outcomeCheckedAt.getTime() < RECHECK_MIN_INTERVAL_MS) return false
    return true
  })

  if (candidates.length === 0) return

  // Batch by unique priceKey to minimize fetches. Group by source.
  const cryptoKeys = new Set<string>()
  const stooqKeys = new Set<string>()
  for (const p of candidates) {
    const a = p.analysis as AnalysisShape
    if (a.priceSource === "crypto") cryptoKeys.add(a.priceKey!)
    else stooqKeys.add(a.priceKey!)
  }

  const priceMap: Record<string, number> = {}
  await Promise.allSettled([
    cryptoKeys.size > 0 && fetch(`${baseUrl}/api/market/prices?crypto=${encodeURIComponent([...cryptoKeys].join(","))}`, {
      headers: { cookie: cookieHeader },
    }).then(async (r) => {
      if (!r.ok) return
      const arr: { id: string; price: number }[] = await r.json()
      if (Array.isArray(arr)) for (const e of arr) priceMap[`crypto:${e.id}`] = e.price
    }),
    stooqKeys.size > 0 && fetch(`${baseUrl}/api/market/prices?stooq=${encodeURIComponent([...stooqKeys].join(","))}`, {
      headers: { cookie: cookieHeader },
    }).then(async (r) => {
      if (!r.ok) return
      const arr: { id: string; price: number; usdPrice?: number }[] = await r.json()
      if (Array.isArray(arr)) for (const e of arr) priceMap[`stooq:${e.id}`] = e.usdPrice ?? e.price
    }),
  ])

  // Evaluate each candidate
  const updates: { id: string; status: "OPEN" | "TARGET_HIT"; returnPct?: number }[] = []
  for (const p of candidates) {
    const a = p.analysis as AnalysisShape
    const target = parseNumeric(a.target)
    const entry  = parseNumeric(a.entry)
    if (target == null) continue
    const cur = priceMap[`${a.priceSource}:${a.priceKey}`]
    if (cur == null) continue

    const hit = a.direction === "bullish" ? cur >= target : cur <= target
    if (hit) {
      const baseline = entry ?? cur
      // Return = move in the direction of the call, expressed as positive %
      const move = a.direction === "bullish"
        ? ((target - baseline) / baseline) * 100
        : ((baseline - target) / baseline) * 100
      const returnPct = parseFloat(move.toFixed(2))
      updates.push({ id: p.id, status: "TARGET_HIT", returnPct })
    } else {
      updates.push({ id: p.id, status: "OPEN" })
    }
  }

  // Persist (parallel, fire-and-forget — the response doesn't wait on this for
  // the current user since we already updated the in-memory `posts` below)
  await Promise.allSettled(updates.map((u) => {
    if (u.status === "TARGET_HIT") {
      return db.post.update({
        where: { id: u.id },
        data: {
          outcomeStatus: "TARGET_HIT",
          outcomeAt: new Date(),
          outcomeReturnPct: u.returnPct,
          outcomeCheckedAt: new Date(),
        },
      })
    }
    return db.post.update({
      where: { id: u.id },
      data: { outcomeCheckedAt: new Date() },
    })
  }))

  // Mutate the in-memory posts so the response reflects the fresh outcome
  for (const u of updates) {
    const p = posts.find((x) => x.id === u.id)
    if (p && u.status === "TARGET_HIT") {
      p.outcomeStatus = "TARGET_HIT"
      ;(p as PostForCheck & { outcomeAt?: Date; outcomeReturnPct?: number }).outcomeAt = new Date()
      ;(p as PostForCheck & { outcomeAt?: Date; outcomeReturnPct?: number }).outcomeReturnPct = u.returnPct
    }
  }
}
