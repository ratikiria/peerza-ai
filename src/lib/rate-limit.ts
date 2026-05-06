import { NextResponse } from "next/server"

// In-memory sliding-window rate limiter.
// Single-instance only — swap the backing store for Upstash/Redis when going multi-instance.

const buckets = new Map<string, number[]>()
let cleanupCounter = 0

export interface RateLimitResult {
  ok: boolean
  retryAfter: number // seconds
  remaining: number
}

export function consume(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs
  const stamps = (buckets.get(key) ?? []).filter((t) => t > cutoff)

  if (stamps.length >= max) {
    const oldest = stamps[0]
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    buckets.set(key, stamps)
    return { ok: false, retryAfter, remaining: 0 }
  }

  stamps.push(now)
  buckets.set(key, stamps)

  if (++cleanupCounter % 200 === 0) sweep(now)

  return { ok: true, retryAfter: 0, remaining: max - stamps.length }
}

function sweep(now: number) {
  // Drop fully-expired buckets so the map doesn't grow forever.
  // Use a 1h horizon — longer than any window we use.
  const horizon = now - 60 * 60 * 1000
  for (const [key, stamps] of buckets) {
    const last = stamps[stamps.length - 1]
    if (last == null || last < horizon) buckets.delete(key)
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]!.trim()
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    "unknown"
  )
}

export function tooManyRequests(retryAfter: number, message = "Too many attempts. Please try again later.") {
  return NextResponse.json(
    { error: message, retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    }
  )
}

// Reset a key — for tests, or after a successful auth event if you want to clear penalties.
export function reset(key: string) {
  buckets.delete(key)
}
