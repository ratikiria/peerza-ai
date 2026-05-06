import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const GAME_IDS = ["guess-direction", "build-portfolio", "read-tape"] as const
const PERIODS = ["day", "week", "month", "all"] as const

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const gameId = searchParams.get("gameId")
  const period = (searchParams.get("period") || "week") as (typeof PERIODS)[number]
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)))

  if (gameId && !(GAME_IDS as readonly string[]).includes(gameId)) {
    return NextResponse.json({ error: "Invalid gameId" }, { status: 400 })
  }
  if (!(PERIODS as readonly string[]).includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 })
  }

  const since = (() => {
    const now = Date.now()
    if (period === "day") return new Date(now - 24 * 60 * 60 * 1000)
    if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000)
    if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000)
    return null
  })()

  const where = {
    ...(gameId ? { gameId } : {}),
    ...(since ? { completedAt: { gte: since } } : {}),
  }

  // Best-per-user inside the period: order by returnPct desc, take many, then de-dup by user.
  const rows = await db.gameResult.findMany({
    where,
    orderBy: { returnPct: "desc" },
    take: 200,
    select: {
      id: true,
      gameId: true,
      returnPct: true,
      finalBalance: true,
      pnl: true,
      completedAt: true,
      user: {
        select: { id: true, username: true, name: true, image: true, isPremium: true, isPro: true },
      },
    },
  })

  const seen = new Set<string>()
  const top: typeof rows = []
  for (const r of rows) {
    const key = `${r.user.id}:${gameId ?? r.gameId}`
    if (seen.has(key)) continue
    seen.add(key)
    top.push(r)
    if (top.length >= limit) break
  }

  return NextResponse.json({
    period,
    gameId: gameId ?? null,
    count: top.length,
    entries: top.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      gameId: r.gameId,
      returnPct: r.returnPct,
      finalBalance: r.finalBalance,
      pnl: r.pnl,
      completedAt: r.completedAt,
      user: r.user,
    })),
  })
}
