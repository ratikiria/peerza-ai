import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/ads/[id]/impression — log that this user saw this ad
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  // Best-effort log — never fails the request
  try {
    await db.adImpression.create({
      data: { adId: id, userId: session?.user?.id ?? null },
    })
  } catch {}
  return NextResponse.json({ ok: true })
}
