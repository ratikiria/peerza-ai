import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getOrCreatePortfolio } from "@/lib/portfolio-server"

// GET /api/portfolio — returns the caller's primary portfolio + holdings.
// Live prices are fetched separately by the client via /api/market/prices.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const portfolio = await getOrCreatePortfolio(session.user.id)
  return NextResponse.json({ portfolio })
}
