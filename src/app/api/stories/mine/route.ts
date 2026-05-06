import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/stories/mine — current user's active stories (all of them) with
// viewers, reactions, and replies. Sorted oldest→newest so the viewer plays
// them in chronological order.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const stories = await db.story.findMany({
    where: {
      authorId:  session.user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
    include: {
      views: {
        orderBy: { viewedAt: "desc" },
        include: {
          viewer: { select: { id: true, name: true, username: true, image: true } },
        },
      },
      reactions: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, username: true, image: true } },
        },
      },
      replies: {
        orderBy: { createdAt: "desc" },
        include: {
          from: { select: { id: true, name: true, username: true, image: true } },
        },
      },
      _count: { select: { views: true, reactions: true, replies: true } },
    },
  })

  if (stories.length === 0) return NextResponse.json([])

  return NextResponse.json(
    stories.map((s) => ({
      id:        s.id,
      mediaUrl:  s.mediaUrl,
      caption:   s.caption,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      viewCount:     s._count.views,
      reactionCount: s._count.reactions,
      replyCount:    s._count.replies,
      views: s.views.map((v) => ({
        viewedAt: v.viewedAt.toISOString(),
        viewer:   v.viewer,
      })),
      reactions: s.reactions.map((r) => ({
        emoji:     r.emoji,
        createdAt: r.createdAt.toISOString(),
        user:      r.user,
      })),
      replies: s.replies.map((r) => ({
        id:        r.id,
        text:      r.text,
        createdAt: r.createdAt.toISOString(),
        from:      r.from,
      })),
    }))
  )
}
