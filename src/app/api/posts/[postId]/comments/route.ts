import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const createCommentSchema = z
  .object({
    content: z.string().min(1).max(500).optional(),
    imageUrl: z.string().max(600000).optional(),
    parentId: z.string().optional(),
  })
  .refine((d) => d.content || d.imageUrl, {
    message: "Comment must have text or an image",
  })

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
      likes:  { select: { userId: true, reaction: true } },
    },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const body = await req.json()
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  // If replying, validate the parent exists and belongs to this post; flatten chains so
  // every reply points at the root comment (single level of nesting).
  let resolvedParentId: string | null = null
  let parentAuthorId: string | null = null
  if (parsed.data.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, postId: true, parentId: true, authorId: true },
    })
    if (!parent || parent.postId !== postId) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 })
    }
    resolvedParentId = parent.parentId ?? parent.id
    parentAuthorId = parent.authorId
  }

  const comment = await db.comment.create({
    data: {
      content: parsed.data.content ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      postId,
      authorId: session.user.id,
      parentId: resolvedParentId,
    },
    include: {
      author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
      likes:  { select: { userId: true, reaction: true } },
    },
  })

  // Notify post author for top-level comments; notify parent comment author for replies
  const notifyTarget = resolvedParentId ? parentAuthorId : post.authorId
  if (notifyTarget && notifyTarget !== session.user.id && (await shouldNotify(notifyTarget, "POST_COMMENT"))) {
    await db.notification.create({
      data: {
        type: "POST_COMMENT",
        receiverId: notifyTarget,
        triggeredBy: session.user.id,
        entityId: postId,
      },
    })
  }

  return NextResponse.json(comment, { status: 201 })
}
