import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/ranked/leaders — top Ranked Calls callers for the right-panel widget.
// Reads the denormalized User.rep* fields (see lib/reputation.ts), so it's one
// indexed query, no aggregation. Only users with resolved calls who haven't
// hidden their track record are listed.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await db.user.findMany({
    where: { repCalls: { gt: 0 }, showTrackRecord: true },
    orderBy: [{ repScore: "desc" }, { repHits: "desc" }],
    take: 5,
    select: { id: true, name: true, username: true, image: true, repScore: true, repCalls: true, repHits: true, repTier: true },
  })

  return NextResponse.json(
    { leaders: users },
    { headers: { "Cache-Control": "private, max-age=120" } },
  )
}
