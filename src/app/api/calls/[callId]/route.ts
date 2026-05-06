import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { callId } = await params

  const call = await db.call.findUnique({
    where: { id: callId },
    include: {
      initiator: { select: { id: true, name: true, username: true, image: true } },
      receiver: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isParticipant = call.initiatorId === session.user.id || call.receiverId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json(call)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { callId } = await params

  const call = await db.call.findUnique({ where: { id: callId } })
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isParticipant = call.initiatorId === session.user.id || call.receiverId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { status } = await req.json()

  const data: Record<string, unknown> = { status }
  if (status === "ACTIVE") data.startedAt = new Date()
  if (["ENDED", "MISSED", "DECLINED"].includes(status)) data.endedAt = new Date()

  const updated = await db.call.update({ where: { id: callId }, data })
  return NextResponse.json(updated)
}
