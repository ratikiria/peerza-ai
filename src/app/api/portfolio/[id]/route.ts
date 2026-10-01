import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getOwnedPortfolio, portfolioInput } from "@/lib/portfolio-server"

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/portfolio/:id — rename / change emoji or theme color.
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  if (!(await getOwnedPortfolio(session.user.id, id))) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const parsed = portfolioInput.partial().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })

  const portfolio = await db.portfolio.update({ where: { id }, data: parsed.data, include: { holdings: true } })
  return NextResponse.json({ portfolio })
}

// DELETE /api/portfolio/:id — delete a portfolio and its holdings.
// The last remaining portfolio can't be deleted (clear its holdings instead).
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  if (!(await getOwnedPortfolio(session.user.id, id))) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const count = await db.portfolio.count({ where: { userId: session.user.id } })
  if (count <= 1) return NextResponse.json({ error: "last_portfolio" }, { status: 400 })

  await db.portfolio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
