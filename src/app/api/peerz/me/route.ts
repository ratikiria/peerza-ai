import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureGenesis } from "@/lib/genesis"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const genesisNo = await ensureGenesis(session.user.id)
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { peerzBalance: true, checkinStreak: true, lastCheckinAt: true },
  })
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)
  return NextResponse.json({
    balance: me.peerzBalance,
    genesisNo,
    checkinStreak: me.checkinStreak,
    checkedInToday: me.lastCheckinAt?.toISOString().slice(0, 10) === today,
  })
}
