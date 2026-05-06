import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/ads/[id]/click — log click + 302 redirect to advertiser URL.
// Server-side redirect ensures the click is logged even if the click target opens in a new tab.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  const ad = await db.ad.findUnique({
    where: { id },
    select: { ctaUrl: true, status: true },
  })
  if (!ad || ad.status !== "APPROVED") {
    return NextResponse.json({ error: "Ad not available" }, { status: 404 })
  }

  // Best-effort log
  db.adClick.create({
    data: { adId: id, userId: session?.user?.id ?? null },
  }).catch(() => {})

  return NextResponse.redirect(ad.ctaUrl, 302)
}
