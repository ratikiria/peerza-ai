import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkIn } from "@/lib/peerz-server"

// Called once per app load by the navbar counter; only the first call of the
// UTC day pays out.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await checkIn(session.user.id)
  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { peerzBalance: true } })
  return NextResponse.json({
    awarded: result?.awarded ?? 0,
    streak: result?.streak ?? null,
    balance: me?.peerzBalance ?? 0,
  })
}
