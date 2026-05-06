import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const patchSchema = z.object({ action: z.enum(["accept", "decline"]) })

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { userId } = await params
  const connection = await db.connection.findFirst({
    where: { requesterId: userId, receiverId: session.user.id, status: "PENDING" },
  })

  if (!connection) return NextResponse.json({ error: "Request not found" }, { status: 404 })

  if (parsed.data.action === "accept") {
    await db.connection.update({ where: { id: connection.id }, data: { status: "ACCEPTED" } })
    if (await shouldNotify(userId, "CONNECTION_ACCEPTED")) {
      await db.notification.create({
        data: {
          type: "CONNECTION_ACCEPTED",
          receiverId: userId,
          triggeredBy: session.user.id,
        },
      })
    }
    return NextResponse.json({ status: "ACCEPTED" })
  }

  await db.connection.delete({ where: { id: connection.id } })
  return NextResponse.json({ status: "DECLINED" })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { userId } = await params

  await db.connection.deleteMany({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId: userId },
        { requesterId: userId, receiverId: session.user.id },
      ],
    },
  })

  return NextResponse.json({ removed: true })
}
