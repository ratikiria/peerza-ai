import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/users/[id]/following — list who this user follows.
// Returns 403 if the target has hideFollowList enabled and the requester isn't them.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id
  const { id } = await params

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, hideFollowList: true },
  })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (target.hideFollowList && target.id !== me) {
    return NextResponse.json({ error: "Hidden" }, { status: 403 })
  }

  const follows = await db.follow.findMany({
    where: { followerId: target.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      following: { select: { id: true, name: true, username: true, image: true, isPro: true } },
    },
  })

  const followingIds = follows.map((f) => f.following.id)
  const myFollows = followingIds.length === 0 ? [] : await db.follow.findMany({
    where: { followerId: me, followingId: { in: followingIds } },
    select: { followingId: true },
  })
  const followingSet = new Set(myFollows.map((f) => f.followingId))

  const users = follows.map((f) => ({
    ...f.following,
    isFollowing: followingSet.has(f.following.id),
    isMe: f.following.id === me,
  }))

  return NextResponse.json({ users })
}
