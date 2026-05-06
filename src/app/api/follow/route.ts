import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const followSchema = z.object({ targetUserId: z.string() })

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = followSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { targetUserId } = parsed.data

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
  }

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
  })

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } })
    return NextResponse.json({ following: false })
  }

  await db.follow.create({
    data: { followerId: session.user.id, followingId: targetUserId },
  })

  if (await shouldNotify(targetUserId, "FOLLOW")) {
    await db.notification.create({
      data: {
        type: "FOLLOW",
        receiverId: targetUserId,
        triggeredBy: session.user.id,
      },
    })
  }

  return NextResponse.json({ following: true }, { status: 201 })
}
