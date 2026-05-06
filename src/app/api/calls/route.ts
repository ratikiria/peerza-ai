import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

// POST /api/calls — initiate a call
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { receiverId, kind } = body
  if (!receiverId) return NextResponse.json({ error: "receiverId required" }, { status: 400 })

  const callKind = kind === "VIDEO" ? "VIDEO" : "AUDIO"

  const call = await db.call.create({
    data: {
      initiatorId: session.user.id,
      receiverId,
      status: "RINGING",
      kind: callKind,
    },
  })

  if (await shouldNotify(receiverId, "CALL")) {
    await db.notification.create({
      data: {
        type: "CALL",
        receiverId,
        triggeredBy: session.user.id,
        entityId: call.id,
      },
    })
  }

  return NextResponse.json(call, { status: 201 })
}

// GET /api/calls — get pending incoming calls for the current user
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const calls = await db.call.findMany({
    where: {
      receiverId: session.user.id,
      status: "RINGING",
    },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      initiator: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  return NextResponse.json(calls)
}
