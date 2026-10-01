import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPortfolios, portfolioInput } from "@/lib/portfolio-server"
import { MAX_PORTFOLIOS } from "@/lib/portfolio-themes"

// GET /api/portfolio — all of the caller's portfolios with holdings.
// Live prices are fetched separately by the client via /api/market/prices.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const portfolios = await listPortfolios(session.user.id)
  return NextResponse.json({ portfolios })
}

// POST /api/portfolio — create another portfolio.
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const parsed = portfolioInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })

  const count = await db.portfolio.count({ where: { userId: session.user.id } })
  if (count >= MAX_PORTFOLIOS) return NextResponse.json({ error: "limit_reached" }, { status: 400 })

  const portfolio = await db.portfolio.create({
    data: { userId: session.user.id, ...parsed.data },
    include: { holdings: true },
  })
  return NextResponse.json({ portfolio }, { status: 201 })
}
