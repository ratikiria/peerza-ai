import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
      likes:  { select: { userId: true, reaction: true } },
      _count: { select: { comments: true, likes: true } },
      originalPost: {
        include: {
          author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
        },
      },
      poll: {
        select: {
          id: true, question: true, options: true, authorId: true,
          votes: { select: { userId: true, optionIndex: true } },
        },
      },
    },
  })

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(post)
}

const editSchema = z.object({
  content: z.string().trim().min(1).max(1000),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const body = await req.json().catch(() => null)
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const updated = await db.post.update({
    where: { id: postId },
    data: { content: parsed.data.content, editedAt: new Date() },
    select: { id: true, content: true, editedAt: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  })

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.post.delete({ where: { id: postId } })
  return NextResponse.json({ deleted: true })
}
