import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/users/[id]/followers — list followers of the user with this id.
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
    where: { followingId: target.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      follower: { select: { id: true, name: true, username: true, image: true, isPro: true } },
    },
  })

  const followerIds = follows.map((f) => f.follower.id)
  const myFollows = followerIds.length === 0 ? [] : await db.follow.findMany({
    where: { followerId: me, followingId: { in: followerIds } },
    select: { followingId: true },
  })
  const followingSet = new Set(myFollows.map((f) => f.followingId))

  const users = follows.map((f) => ({
    ...f.follower,
    isFollowing: followingSet.has(f.follower.id),
    isMe: f.follower.id === me,
  }))

  return NextResponse.json({ users })
}
