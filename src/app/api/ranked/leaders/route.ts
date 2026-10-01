import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { RANK_MIN_CALLS } from "@/lib/ranked"

// GET /api/ranked/leaders — top Ranked Calls callers for the right-panel widget.
// Reads the denormalized User.rep* fields (see lib/reputation.ts), so it's one
// indexed query, no aggregation. Same bar as rank tiers: at least
// RANK_MIN_CALLS resolved calls (one lucky or unlucky call says nothing about
// skill), and the user hasn't hidden their track record.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await db.user.findMany({
    where: { repCalls: { gte: RANK_MIN_CALLS }, showTrackRecord: true },
    orderBy: [{ repScore: "desc" }, { repHits: "desc" }],
    take: 5,
    select: { id: true, name: true, username: true, image: true, repScore: true, repCalls: true, repHits: true, repTier: true },
  })

  return NextResponse.json(
    { leaders: users, minCalls: RANK_MIN_CALLS },
    { headers: { "Cache-Control": "private, max-age=120" } },
  )
}
