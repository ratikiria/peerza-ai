import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const MAX_PINS = 3

// POST /api/posts/[postId]/pin — toggle pin state for the post (own posts only).
// Enforces a max of 3 pinned posts per user.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, pinned: true },
  })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (post.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (post.pinned) {
    await db.post.update({ where: { id: postId }, data: { pinned: false } })
    return NextResponse.json({ pinned: false })
  }

  // Trying to pin — enforce max
  const pinCount = await db.post.count({
    where: { authorId: session.user.id, pinned: true },
  })
  if (pinCount >= MAX_PINS) {
    return NextResponse.json({
      error: `You can pin up to ${MAX_PINS} posts. Unpin one first.`,
    }, { status: 400 })
  }

  await db.post.update({ where: { id: postId }, data: { pinned: true } })
  return NextResponse.json({ pinned: true })
}
