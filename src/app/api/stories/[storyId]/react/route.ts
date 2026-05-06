import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

// Allowed reaction emojis. Keeping this fixed prevents misuse (storing arbitrary
// strings) and lets the UI render a stable reaction bar without surprises.
const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "🔥", "👏", "🚀"] as const
const reactSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
})

// POST /api/stories/[storyId]/react — set or replace the current user's reaction.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { storyId } = await params

  const body = await req.json()
  const parsed = reactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid emoji" }, { status: 400 })

  const story = await db.story.findFirst({
    where: { id: storyId, expiresAt: { gt: new Date() } },
    select: { authorId: true },
  })
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 })
  if (story.authorId === session.user.id) {
    return NextResponse.json({ error: "Cannot react to your own story" }, { status: 400 })
  }

  await db.storyReaction.upsert({
    where:  { storyId_userId: { storyId, userId: session.user.id } },
    create: { storyId, userId: session.user.id, emoji: parsed.data.emoji },
    update: { emoji: parsed.data.emoji, createdAt: new Date() },
  })

  // Notify the author. Use entityId so the client can deep-link back to the
  // story in the future if we add a notification-click handler.
  await db.notification.create({
    data: {
      type:        "STORY_REACTION",
      receiverId:  story.authorId,
      triggeredBy: session.user.id,
      entityId:    storyId,
    },
  })

  return NextResponse.json({ ok: true, emoji: parsed.data.emoji })
}

// DELETE /api/stories/[storyId]/react — remove the current user's reaction.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { storyId } = await params

  await db.storyReaction.deleteMany({
    where: { storyId, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
