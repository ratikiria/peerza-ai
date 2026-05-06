import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥"]

const likeSchema = z.object({
  reaction: z.string().refine((r) => REACTIONS.includes(r), { message: "Invalid reaction" }),
})

export async function POST(req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { commentId } = await params

  const body = await req.json().catch(() => null)
  const parsed = likeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  })
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 })

  // Toggle: if user already reacted with this same emoji, remove it; otherwise upsert.
  const existing = await db.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId: session.user.id } },
  })

  if (existing && existing.reaction === parsed.data.reaction) {
    await db.commentLike.delete({ where: { id: existing.id } })
    return NextResponse.json({ removed: true })
  }

  const like = await db.commentLike.upsert({
    where: { commentId_userId: { commentId, userId: session.user.id } },
    create: { commentId, userId: session.user.id, reaction: parsed.data.reaction },
    update: { reaction: parsed.data.reaction },
  })

  // Notify comment author (skip self-likes and dedup by recreating only on first like)
  if (!existing && comment.authorId !== session.user.id && (await shouldNotify(comment.authorId, "POST_LIKE"))) {
    await db.notification.create({
      data: {
        type: "POST_LIKE",
        receiverId: comment.authorId,
        triggeredBy: session.user.id,
        entityId: comment.postId,
      },
    })
  }

  return NextResponse.json(like)
}
