import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const unread = await db.notification.count({
    where: { receiverId: session.user.id, isRead: false },
  })

  return NextResponse.json({ unread })
}
