import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [all, byGame] = await Promise.all([
    db.gameResult.findMany({
      where: { userId },
      orderBy: { returnPct: "desc" },
      take: 1,
    }),
    db.gameResult.groupBy({
      by: ["gameId"],
      where: { userId },
      _count: true,
      _max: { returnPct: true, finalBalance: true },
      _avg: { returnPct: true },
    }),
  ])

  const totalGames = byGame.reduce((s, g) => s + g._count, 0)
  const best = all[0] || null

  return NextResponse.json({
    totalGames,
    best: best
      ? {
          gameId: best.gameId,
          finalBalance: best.finalBalance,
          returnPct: best.returnPct,
          completedAt: best.completedAt,
        }
      : null,
    byGame: byGame.map((g) => ({
      gameId: g.gameId,
      played: g._count,
      bestReturnPct: g._max.returnPct,
      bestBalance: g._max.finalBalance,
      avgReturnPct: g._avg.returnPct,
    })),
  })
}
