import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getQuotaStatus } from "@/lib/ai-quota"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const status = await getQuotaStatus(session.user.id)
  return NextResponse.json(status)
}
