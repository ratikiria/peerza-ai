import { NextRequest, NextResponse } from "next/server"
import { consume } from "@/lib/rate-limit"

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"])

const SKIP_PREFIXES = [
  "/api/auth/",      // NextAuth handles its own CSRF + we rate-limit register/forgot-password directly
  "/api/webhooks/",  // Stripe & Coinbase webhooks are signature-verified and originate cross-origin
  "/api/calls/signal/", // WebRTC signaling fires often during a call
]

// CSRF: routes that legitimately accept cross-origin requests (must verify by other means).
const CSRF_SKIP_PREFIXES = [
  "/api/auth/",      // NextAuth has built-in CSRF tokens
  "/api/webhooks/",  // Cross-origin by design, signature-verified
]

const PER_IP_MAX = 60
const PER_IP_WINDOW_MS = 60 * 1000

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]!.trim()
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    "unknown"
  )
}

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const host = req.headers.get("host")
  if (!host) return false

  // Build the set of acceptable origins. Always trust the request host.
  // Allow extra origins via env (comma-separated), e.g. for staging/preview.
  const allowed = new Set<string>([`http://${host}`, `https://${host}`])
  const extra = process.env.ALLOWED_ORIGINS
  if (extra) {
    for (const o of extra.split(",")) allowed.add(o.trim())
  }

  if (origin) return allowed.has(origin)

  // Fall back to Referer when Origin is missing (some browsers omit it for same-origin).
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      return allowed.has(refOrigin)
    } catch {
      return false
    }
  }

  // Neither header present on a state-changing request → reject.
  return false
}

export function proxy(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) return NextResponse.next()

  const path = req.nextUrl.pathname
  if (!path.startsWith("/api/")) return NextResponse.next()

  const skipAll = SKIP_PREFIXES.some((p) => path.startsWith(p))
  if (!skipAll) {
    // 1. CSRF: verify request originates from an allowed origin
    const skipCsrf = CSRF_SKIP_PREFIXES.some((p) => path.startsWith(p))
    if (!skipCsrf && !originAllowed(req)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      )
    }

    // 2. Per-IP rate limit (safety net across all mutating routes)
    const ip = clientIp(req)
    const limit = consume(`api:ip:${ip}`, PER_IP_MAX, PER_IP_WINDOW_MS)
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down.", retryAfter: limit.retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfter),
            "Cache-Control": "no-store",
          },
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
