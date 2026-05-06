import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/stories/[storyId]/view — record that current user viewed this story
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { storyId } = await params

  const story = await db.story.findFirst({
    where: { id: storyId, expiresAt: { gt: new Date() } },
    select: { authorId: true },
  })
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 })

  // Don't count views from story author
  if (story.authorId === session.user.id) return NextResponse.json({ ok: true })

  await db.storyView.upsert({
    where:  { storyId_viewerId: { storyId, viewerId: session.user.id } },
    create: { storyId, viewerId: session.user.id },
    update: { viewedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
