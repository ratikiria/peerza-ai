import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface ContextPayload {
  lastCall: {
    ticker: string
    direction: "bullish" | "bearish" | "neutral"
    conviction: number | null
    postId: string
    createdAt: string
  } | null
  activeChallenge: {
    id: string
    name: string
    returnPct: number
    rank: number
    totalParticipants: number
  } | null
}

const cache = new Map<string, { data: ContextPayload; ts: number }>()
const TTL = 60 * 1000

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId } = await params

  const cached = cache.get(userId)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data)
  }

  // ── Last call: most recent post by this user with analysis.ticker ──────────
  const callRows = await db.$queryRaw<
    { id: string; createdAt: Date; ticker: string; direction: string; conviction: number | null }[]
  >`
    SELECT
      id,
      "createdAt",
      analysis->>'ticker'                            AS ticker,
      analysis->>'direction'                         AS direction,
      NULLIF(analysis->>'conviction','')::float      AS conviction
    FROM "Post"
    WHERE "authorId" = ${userId}
      AND analysis IS NOT NULL
      AND analysis->>'ticker' IS NOT NULL
      AND analysis->>'ticker' <> ''
    ORDER BY "createdAt" DESC
    LIMIT 1
  `

  let lastCall: ContextPayload["lastCall"] = null
  if (callRows.length > 0) {
    const r = callRows[0]
    if (r.direction === "bullish" || r.direction === "bearish" || r.direction === "neutral") {
      lastCall = {
        ticker: r.ticker,
        direction: r.direction,
        conviction: r.conviction != null ? Math.round(r.conviction) : null,
        postId: r.id,
        createdAt: r.createdAt.toISOString(),
      }
    }
  }

  // ── Active challenge: most recently joined ACTIVE challenge with rank ──────
  const participation = await db.challengeParticipant.findFirst({
    where: {
      userId,
      challenge: { status: "ACTIVE", leaderboardVisible: true },
    },
    orderBy: { joinedAt: "desc" },
    include: {
      challenge: { select: { id: true, name: true, virtualCapital: true } },
    },
  })

  let activeChallenge: ContextPayload["activeChallenge"] = null
  if (participation) {
    // Fetch all participants for ranking
    const all = await db.challengeParticipant.findMany({
      where: { challengeId: participation.challengeId },
      include: { holdings: true },
    })

    const cryptoKeys = new Set<string>()
    const stooqKeys = new Set<string>()
    for (const p of all) {
      for (const h of p.holdings) {
        if (h.assetType === "crypto") cryptoKeys.add(h.priceKey)
        else stooqKeys.add(h.priceKey)
      }
    }

    const priceMap: Record<string, number> = {}
    const baseUrl = req.nextUrl.origin
    const cookieHeader = req.headers.get("cookie") || ""

    try {
      if (cryptoKeys.size > 0) {
        const res = await fetch(
          `${baseUrl}/api/market/prices?crypto=${encodeURIComponent([...cryptoKeys].join(","))}`,
          { headers: { cookie: cookieHeader } }
        )
        const data: { id: string; price: number }[] = await res.json()
        if (Array.isArray(data)) for (const e of data) priceMap[e.id] = e.price
      }
      if (stooqKeys.size > 0) {
        const res = await fetch(
          `${baseUrl}/api/market/prices?stooq=${encodeURIComponent([...stooqKeys].join(","))}`,
          { headers: { cookie: cookieHeader } }
        )
        const data: { id: string; price: number }[] = await res.json()
        if (Array.isArray(data)) for (const e of data) priceMap[e.id] = e.price
      }
    } catch {
      // fallback to avgCost below
    }

    const ranked = all
      .map((p) => {
        const holdingsValue = p.holdings.reduce((sum, h) => {
          const price = priceMap[h.priceKey] ?? h.avgCost
          return sum + h.quantity * price
        }, 0)
        const totalValue = p.cashBalance + holdingsValue
        const returnPct =
          ((totalValue - participation.challenge.virtualCapital) / participation.challenge.virtualCapital) * 100
        return { userId: p.userId, returnPct }
      })
      .sort((a, b) => b.returnPct - a.returnPct)

    const myIdx = ranked.findIndex((r) => r.userId === userId)
    if (myIdx >= 0) {
      activeChallenge = {
        id: participation.challenge.id,
        name: participation.challenge.name,
        returnPct: ranked[myIdx].returnPct,
        rank: myIdx + 1,
        totalParticipants: ranked.length,
      }
    }
  }

  const payload: ContextPayload = { lastCall, activeChallenge }
  cache.set(userId, { data: payload, ts: Date.now() })
  return NextResponse.json(payload)
}
