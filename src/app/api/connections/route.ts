import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const sendSchema = z.object({ targetUserId: z.string() })

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const connections = await db.connection.findMany({
    where: {
      OR: [
        { requesterId: session.user.id, status: "ACCEPTED" },
        { receiverId: session.user.id, status: "ACCEPTED" },
      ],
    },
    include: {
      requester: { select: { id: true, name: true, username: true, image: true } },
      receiver: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  return NextResponse.json(connections)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { targetUserId } = parsed.data

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 })
  }

  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId: targetUserId },
        { requesterId: targetUserId, receiverId: session.user.id },
      ],
    },
  })

  if (existing) return NextResponse.json({ error: "Connection already exists" }, { status: 409 })

  const connection = await db.connection.create({
    data: { requesterId: session.user.id, receiverId: targetUserId, status: "PENDING" },
  })

  if (await shouldNotify(targetUserId, "CONNECTION_REQUEST")) {
    await db.notification.create({
      data: {
        type: "CONNECTION_REQUEST",
        receiverId: targetUserId,
        triggeredBy: session.user.id,
        entityId: connection.id,
      },
    })
  }

  return NextResponse.json(connection, { status: 201 })
}
