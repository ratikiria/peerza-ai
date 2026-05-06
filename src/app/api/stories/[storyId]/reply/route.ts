import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const replySchema = z.object({
  text: z.string().min(1).max(500),
})

// POST /api/stories/[storyId]/reply — send a text reply to a story. Stored on
// the StoryReply table and surfaced to the author via a notification + the
// "own story" viewer panel.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { storyId } = await params

  const body = await req.json()
  const parsed = replySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid reply" }, { status: 400 })

  const story = await db.story.findFirst({
    where: { id: storyId, expiresAt: { gt: new Date() } },
    select: { authorId: true },
  })
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 })
  if (story.authorId === session.user.id) {
    return NextResponse.json({ error: "Cannot reply to your own story" }, { status: 400 })
  }

  const reply = await db.storyReply.create({
    data: {
      storyId,
      fromUserId: session.user.id,
      text:       parsed.data.text.trim(),
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
    },
  })

  await db.notification.create({
    data: {
      type:        "STORY_REPLY",
      receiverId:  story.authorId,
      triggeredBy: session.user.id,
      entityId:    storyId,
    },
  })

  return NextResponse.json({
    id:        reply.id,
    text:      reply.text,
    createdAt: reply.createdAt.toISOString(),
  }, { status: 201 })
}
