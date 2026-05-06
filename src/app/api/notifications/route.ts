import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sinceParam = searchParams.get("since")
  const since = sinceParam ? new Date(sinceParam) : null
  const validSince = since && !isNaN(since.getTime()) ? since : null

  const notifications = await db.notification.findMany({
    where: {
      receiverId: session.user.id,
      ...(validSince ? { createdAt: { gt: validSince } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: validSince ? 20 : 50,
    include: {
      triggerer: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  })

  return NextResponse.json(notifications)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.notification.updateMany({
    where: { receiverId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ ok: true })
}
