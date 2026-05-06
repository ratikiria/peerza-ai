import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const body = await req.json().catch(() => ({}))
  const reaction: string = body?.reaction ?? "👍"

  const existing = await db.like.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  })

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction — unlike
      await db.like.delete({ where: { id: existing.id } })
      return NextResponse.json({ liked: false, reaction: null })
    }
    // Different reaction — update
    const updated = await db.like.update({
      where: { id: existing.id },
      data: { reaction },
    })
    return NextResponse.json({ liked: true, reaction: updated.reaction })
  }

  const like = await db.like.create({ data: { postId, userId: session.user.id, reaction } })

  // Notify post author (not if reacting to own post)
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
  if (post && post.authorId !== session.user.id && (await shouldNotify(post.authorId, "POST_LIKE"))) {
    await db.notification.create({
      data: {
        type: "POST_LIKE",
        receiverId: post.authorId,
        triggeredBy: session.user.id,
        entityId: postId,
      },
    })
  }

  return NextResponse.json({ liked: true, reaction: like.reaction }, { status: 201 })
}
