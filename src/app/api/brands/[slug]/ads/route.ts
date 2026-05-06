import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { reviewAd, decisionToStatus } from "@/lib/ad-review"

const TOPIC_VALUES = ["crypto", "stocks", "forex", "options"] as const

const createAdSchema = z.object({
  headline:           z.string().min(3).max(80).trim(),
  body:               z.string().min(10).max(280).trim(),
  imageUrl:           z.string().max(2_000_000).optional(),
  ctaLabel:           z.string().min(2).max(30).trim(),
  ctaUrl:             z.string().url().max(500),
  topics:             z.array(z.enum(TOPIC_VALUES)).max(4).optional(),
  allowedCountries:   z.array(z.string().length(2)).max(50).optional(),
  restrictedCountries: z.array(z.string().length(2)).max(50).optional(),
  startsAt:           z.string().datetime().optional(),
  endsAt:             z.string().datetime().optional(),
  budgetUsd:          z.number().positive().max(1_000_000).optional(),
  disclaimer:         z.string().max(280).optional(),
  submit:             z.boolean().optional(), // if true, status = PENDING_REVIEW (else DRAFT)
})

// GET /api/brands/[slug]/ads — list ads for this brand (owner only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const brand = await db.brand.findUnique({ where: { slug }, select: { id: true, ownerId: true } })
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (brand.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const ads = await db.ad.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { impressions: true, clicks: true } } },
  })
  return NextResponse.json(ads)
}

// POST /api/brands/[slug]/ads — create a new ad (owner only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const brand = await db.brand.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, verifiedAt: true, name: true, regulator: true, licenseNumber: true },
  })
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (brand.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createAdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const startsAt = data.startsAt ? new Date(data.startsAt) : null
  const endsAt = data.endsAt ? new Date(data.endsAt) : null
  if (startsAt && endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
  }

  // Submitted ads start as PENDING_REVIEW, then the AI moves them to
  // APPROVED / HUMAN_QUEUE / REJECTED. Saved-but-not-submitted stay DRAFT.
  let status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "HUMAN_QUEUE" | "REJECTED" = data.submit ? "PENDING_REVIEW" : "DRAFT"
  let reviewNotes: string | null = null
  let riskFlags: string[] = []
  let reviewedBy: string | null = null
  let reviewedAt: Date | null = null

  if (data.submit) {
    const review = await reviewAd({
      brandName: brand.name,
      brandRegulator: brand.regulator,
      brandLicenseNumber: brand.licenseNumber,
      headline: data.headline,
      body: data.body,
      ctaLabel: data.ctaLabel,
      ctaUrl: data.ctaUrl,
      topics: data.topics ?? [],
      disclaimer: data.disclaimer,
      restrictedCountries: (data.restrictedCountries ?? []).map((c) => c.toUpperCase()),
    })

    if (review) {
      status = decisionToStatus(review.decision)
      reviewNotes = [review.rationale, review.suggested_fix && `Suggested: ${review.suggested_fix}`]
        .filter(Boolean).join("\n\n") || null
      riskFlags = review.risk_flags
      reviewedBy = "ai"
      reviewedAt = new Date()
    } else {
      // No API key or review failed → safe default: send to human queue
      status = "HUMAN_QUEUE"
      reviewNotes = "Auto-review unavailable. Awaiting human moderator."
    }
  }

  const ad = await db.ad.create({
    data: {
      brandId: brand.id,
      headline: data.headline,
      body: data.body,
      imageUrl: data.imageUrl ?? null,
      ctaLabel: data.ctaLabel,
      ctaUrl: data.ctaUrl,
      topics: data.topics ?? [],
      allowedCountries: (data.allowedCountries ?? []).map((c) => c.toUpperCase()),
      restrictedCountries: (data.restrictedCountries ?? []).map((c) => c.toUpperCase()),
      startsAt,
      endsAt,
      budgetUsd: data.budgetUsd ?? null,
      disclaimer: data.disclaimer ?? null,
      status,
      reviewNotes,
      riskFlags,
      reviewedBy,
      reviewedAt,
    },
  })

  return NextResponse.json(ad, { status: 201 })
}
