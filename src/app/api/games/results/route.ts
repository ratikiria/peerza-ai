import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const GAME_IDS = ["guess-direction", "build-portfolio", "read-tape"] as const

const resultSchema = z.object({
  gameId: z.enum(GAME_IDS),
  startingBalance: z.number().nonnegative(),
  finalBalance: z.number().nonnegative(),
  pnl: z.number(),
  returnPct: z.number(),
  roundsPlayed: z.number().int().min(0).max(50),
  winRate: z.number().min(0).max(1),
  durationSec: z.number().int().min(0).max(7200),
  scenarios: z.array(z.string().max(80)).max(50).default([]),
  duelId: z.string().min(1).max(64).nullish(),
  seed: z.string().min(1).max(64).nullish(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = resultSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const r = parsed.data
  const result = await db.gameResult.create({
    data: {
      userId: session.user.id,
      gameId: r.gameId,
      startingBalance: r.startingBalance,
      finalBalance: r.finalBalance,
      pnl: r.pnl,
      returnPct: r.returnPct,
      roundsPlayed: r.roundsPlayed,
      winRate: r.winRate,
      durationSec: r.durationSec,
      scenarios: r.scenarios,
    },
  })

  // Was this a personal best for the game?
  const better = await db.gameResult.count({
    where: {
      userId: session.user.id,
      gameId: r.gameId,
      returnPct: { gt: r.returnPct },
    },
  })

  // If the run was attached to a duel, lock in the challengee's score and
  // ping the challenger. Silently no-ops if anything looks off — we don't
  // want a duel mismatch to fail an otherwise-valid save.
  let duelPayload: {
    id: string
    challengerPct: number
    challengeePct: number
    youWon: boolean
    tied: boolean
  } | null = null

  if (r.duelId) {
    const duel = await db.gameDuel.findUnique({ where: { id: r.duelId } })
    if (
      duel &&
      duel.challengeeId === session.user.id &&
      duel.gameId === r.gameId &&
      duel.challengeePct === null &&
      (!r.seed || r.seed === duel.seed)
    ) {
      const updated = await db.gameDuel.update({
        where: { id: duel.id },
        data: {
          challengeePct: r.returnPct,
          challengeeAt: new Date(),
        },
      })

      if (await shouldNotify(duel.challengerId, "GAME_DUEL_RESULT")) {
        await db.notification.create({
          data: {
            type: "GAME_DUEL_RESULT",
            receiverId: duel.challengerId,
            triggeredBy: session.user.id,
            entityId: duel.id,
          },
        })
      }

      duelPayload = {
        id: updated.id,
        challengerPct: updated.challengerPct,
        challengeePct: r.returnPct,
        youWon: r.returnPct > updated.challengerPct,
        tied: r.returnPct === updated.challengerPct,
      }
    }
  }

  return NextResponse.json({
    id: result.id,
    isPersonalBest: better === 0,
    duel: duelPayload,
  })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const gameId = searchParams.get("gameId")
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

  const results = await db.gameResult.findMany({
    where: {
      userId: session.user.id,
      ...(gameId && (GAME_IDS as readonly string[]).includes(gameId) ? { gameId } : {}),
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  })

  return NextResponse.json(results)
}
