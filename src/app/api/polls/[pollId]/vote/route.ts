import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const voteSchema = z.object({
  optionIndex: z.number().int().min(0).max(5).nullable(),
})

export async function POST(req: Request, { params }: { params: Promise<{ pollId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id
  const { pollId } = await params

  const body = await req.json().catch(() => null)
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { optionIndex } = parsed.data

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { id: true, options: true },
  })
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  if (optionIndex !== null && optionIndex >= poll.options.length) {
    return NextResponse.json({ error: "Option out of range" }, { status: 400 })
  }

  if (optionIndex === null) {
    await db.pollVote.deleteMany({ where: { pollId, userId: me } })
  } else {
    await db.pollVote.upsert({
      where: { pollId_userId: { pollId, userId: me } },
      update: { optionIndex },
      create: { pollId, userId: me, optionIndex },
    })
  }

  const votes = await db.pollVote.findMany({
    where: { pollId },
    select: { userId: true, optionIndex: true },
  })

  return NextResponse.json({ votes })
}
