import { db } from "@/lib/db"

export const GAME_META: Record<string, { title: string; href: string; emoji: string }> = {
  "guess-direction": {
    title: "Guess the Direction",
    href: "/games/guess-direction",
    emoji: "🎯",
  },
  "build-portfolio": {
    title: "Build the Portfolio",
    href: "/games/build-portfolio",
    emoji: "💼",
  },
  "read-tape": {
    title: "Read the Tape",
    href: "/games/read-tape",
    emoji: "📊",
  },
}

export interface UserGameStats {
  totalGames: number
  bestRun: {
    gameId: string
    gameTitle: string
    finalBalance: number
    returnPct: number
    completedAt: Date
  } | null
  byGame: Array<{
    gameId: string
    gameTitle: string
    played: number
    bestReturnPct: number | null
    bestBalance: number | null
    avgReturnPct: number | null
  }>
  recent: Array<{
    id: string
    gameId: string
    gameTitle: string
    finalBalance: number
    returnPct: number
    pnl: number
    completedAt: Date
  }>
}

export async function getUserGameStats(userId: string): Promise<UserGameStats> {
  const [best, byGame, recent] = await Promise.all([
    db.gameResult.findFirst({
      where: { userId },
      orderBy: { returnPct: "desc" },
    }),
    db.gameResult.groupBy({
      by: ["gameId"],
      where: { userId },
      _count: true,
      _max: { returnPct: true, finalBalance: true },
      _avg: { returnPct: true },
    }),
    db.gameResult.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: {
        id: true,
        gameId: true,
        finalBalance: true,
        returnPct: true,
        pnl: true,
        completedAt: true,
      },
    }),
  ])

  const totalGames = byGame.reduce((s, g) => s + g._count, 0)

  return {
    totalGames,
    bestRun: best
      ? {
          gameId: best.gameId,
          gameTitle: GAME_META[best.gameId]?.title ?? best.gameId,
          finalBalance: best.finalBalance,
          returnPct: best.returnPct,
          completedAt: best.completedAt,
        }
      : null,
    byGame: byGame.map((g) => ({
      gameId: g.gameId,
      gameTitle: GAME_META[g.gameId]?.title ?? g.gameId,
      played: g._count,
      bestReturnPct: g._max.returnPct,
      bestBalance: g._max.finalBalance,
      avgReturnPct: g._avg.returnPct,
    })),
    recent: recent.map((r) => ({
      id: r.id,
      gameId: r.gameId,
      gameTitle: GAME_META[r.gameId]?.title ?? r.gameId,
      finalBalance: r.finalBalance,
      returnPct: r.returnPct,
      pnl: r.pnl,
      completedAt: r.completedAt,
    })),
  }
}
