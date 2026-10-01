import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const bodySchema = z.object({ bullish: z.boolean() })

// POST /api/posts/:postId/sentiment — side bullish or bearish on a trade idea.
// Voting the same side again clears the vote; the other side switches it.
export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { postId } = await params

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid vote" }, { status: 400 })
  const { bullish } = parsed.data

  const post = await db.post.findUnique({ where: { id: postId }, select: { analysis: true } })
  if (!post?.analysis) return NextResponse.json({ error: "Only trade ideas take sentiment votes" }, { status: 400 })

  const key = { postId_userId: { postId, userId: session.user.id } }
  const existing = await db.ideaVote.findUnique({ where: key })
  let mine: boolean | null = bullish
  if (existing?.bullish === bullish) {
    await db.ideaVote.delete({ where: key })
    mine = null
  } else if (existing) {
    await db.ideaVote.update({ where: key, data: { bullish } })
  } else {
    await db.ideaVote.create({ data: { postId, userId: session.user.id, bullish } })
  }

  const [bull, bear] = await Promise.all([
    db.ideaVote.count({ where: { postId, bullish: true } }),
    db.ideaVote.count({ where: { postId, bullish: false } }),
  ])
  return NextResponse.json({ bull, bear, mine })
}
