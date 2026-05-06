import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pending = await db.connection.findMany({
    where: { receiverId: session.user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
        select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
      },
    },
  })

  return NextResponse.json(pending)
}
