import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugify } from "@/lib/slug"

const createSchema = z.object({
  name:          z.string().min(2).max(60).trim(),
  legalName:     z.string().max(120).optional(),
  bio:           z.string().max(280).optional(),
  logoUrl:       z.string().max(2_000_000).optional(), // base64 or URL
  website:       z.string().url().max(500).optional(),
  country:       z.string().length(2),
  regulator:     z.string().max(60).optional(),
  licenseNumber: z.string().max(60).optional(),
})

// GET /api/brands — list brands the current user owns
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const brands = await db.brand.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ads: true } } },
  })
  return NextResponse.json(brands)
}

// POST /api/brands — create a new brand (unverified by default)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
  }

  // Generate a unique slug
  const baseSlug = slugify(parsed.data.name)
  if (!baseSlug) return NextResponse.json({ error: "Invalid name" }, { status: 400 })

  let slug = baseSlug
  let suffix = 0
  while (await db.brand.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
    if (suffix > 100) return NextResponse.json({ error: "Could not generate unique slug" }, { status: 500 })
  }

  const brand = await db.brand.create({
    data: {
      ownerId: session.user.id,
      name: parsed.data.name,
      slug,
      legalName: parsed.data.legalName ?? null,
      bio: parsed.data.bio ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
      website: parsed.data.website ?? null,
      country: parsed.data.country.toUpperCase(),
      regulator: parsed.data.regulator ?? null,
      licenseNumber: parsed.data.licenseNumber ?? null,
    },
  })

  return NextResponse.json(brand, { status: 201 })
}
