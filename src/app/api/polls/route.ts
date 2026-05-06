import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const createSchema = z.object({
  question: z.string().trim().min(1).max(280),
  options:  z.array(z.string().trim().min(1).max(80)).min(2).max(6),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const poll = await db.poll.create({
    data: {
      authorId: session.user.id,
      question: parsed.data.question,
      options: parsed.data.options,
    },
    select: { id: true },
  })

  return NextResponse.json(poll, { status: 201 })
}
