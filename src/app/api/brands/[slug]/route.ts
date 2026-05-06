import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/brands/[slug] — public brand details (excluding sensitive fields)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const brand = await db.brand.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true } },
      _count: { select: { ads: true } },
    },
  })
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = brand.ownerId === session.user.id
  return NextResponse.json({ ...brand, isOwner })
}
