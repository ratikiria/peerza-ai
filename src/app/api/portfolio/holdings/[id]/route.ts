import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// DELETE /api/portfolio/holdings/[id] — remove a holding owned by the caller
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  const holding = await db.portfolioHolding.findUnique({
    where: { id },
    select: { id: true, portfolio: { select: { userId: true } } },
  })
  if (!holding || holding.portfolio.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  await db.portfolioHolding.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
