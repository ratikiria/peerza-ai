import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/ads/serve?topics=crypto,stocks&limit=2&placement=FEED
// Returns approved ads filtered by user country, topics, schedule, placement, and verification.
// Limit caps how many ads to return — call sites slot them in feed at intervals.
const VALID_PLACEMENTS = ["FEED", "SIDEBAR", "WORKSPACE"] as const
type Placement = (typeof VALID_PLACEMENTS)[number]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ ads: [] })

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { country: true },
  })
  const country = me?.country?.toUpperCase() ?? null

  const { searchParams } = new URL(req.url)
  const topicsParam = searchParams.get("topics")?.trim() || ""
  const requestedTopics = topicsParam
    ? topicsParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []
  const limit = Math.max(1, Math.min(10, parseInt(searchParams.get("limit") ?? "3", 10)))
  const placementParam = (searchParams.get("placement") ?? "FEED").toUpperCase() as Placement
  const placement: Placement = VALID_PLACEMENTS.includes(placementParam) ? placementParam : "FEED"

  const now = new Date()

  // Base filter: APPROVED + within schedule window + placement match.
  // Topic + country filters applied below as Postgres arrays are easier to reason about there.
  const ads = await db.ad.findMany({
    where: {
      status: "APPROVED",
      placements: { has: placement },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    take: 50, // pool to randomize from
    orderBy: { createdAt: "desc" },
    include: {
      brand: { select: { id: true, name: true, slug: true, logoUrl: true, verifiedAt: true } },
    },
  })

  // Apply geo gating and topic filtering in JS (clearer + small N)
  const filtered = ads.filter((ad) => {
    // Country gate
    if (country) {
      if (ad.restrictedCountries.length > 0 && ad.restrictedCountries.includes(country)) return false
      if (ad.allowedCountries.length > 0 && !ad.allowedCountries.includes(country)) return false
    } else {
      // Unknown country: skip ads with any geo restriction (safer default)
      if (ad.restrictedCountries.length > 0 || ad.allowedCountries.length > 0) return false
    }
    // Topic match: if ad has no topics, it's eligible for everyone
    if (ad.topics.length > 0) {
      // If user asked for specific topics, ad must overlap. Otherwise (no filter), any topic OK.
      if (requestedTopics.length > 0 && !ad.topics.some((t) => requestedTopics.includes(t))) {
        return false
      }
    }
    return true
  })

  // Shuffle and take limit
  const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, limit)

  return NextResponse.json({
    ads: shuffled.map((ad) => ({
      id: ad.id,
      headline: ad.headline,
      body: ad.body,
      imageUrl: ad.imageUrl,
      ctaLabel: ad.ctaLabel,
      // Note: ctaUrl is intentionally NOT exposed — clicks go through /api/ads/[id]/click for tracking
      topics: ad.topics,
      disclaimer: ad.disclaimer,
      brand: ad.brand,
    })),
  })
}
