import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

const GAME_IDS = ["guess-direction", "build-portfolio", "read-tape"] as const

const DUEL_TTL_DAYS = 7

const createSchema = z.object({
  gameId: z.enum(GAME_IDS),
  seed: z.string().min(4).max(64),
  challengeeId: z.string().min(1).max(64),
  challengerPct: z.number().finite(),
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
  }

  const { gameId, seed, challengeeId, challengerPct } = parsed.data

  if (challengeeId === session.user.id) {
    return NextResponse.json({ error: "Cannot challenge yourself" }, { status: 400 })
  }

  const target = await db.user.findUnique({
    where: { id: challengeeId },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const expiresAt = new Date(Date.now() + DUEL_TTL_DAYS * 24 * 60 * 60 * 1000)

  const duel = await db.gameDuel.create({
    data: {
      gameId,
      seed,
      challengerId: session.user.id,
      challengeeId,
      challengerPct,
      expiresAt,
    },
  })

  if (await shouldNotify(challengeeId, "GAME_DUEL_INVITE")) {
    await db.notification.create({
      data: {
        type: "GAME_DUEL_INVITE",
        receiverId: challengeeId,
        triggeredBy: session.user.id,
        entityId: duel.id,
      },
    })
  }

  return NextResponse.json({ id: duel.id }, { status: 201 })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const box = searchParams.get("box") || "all" // "incoming" | "sent" | "all"

  const where =
    box === "incoming"
      ? { challengeeId: session.user.id }
      : box === "sent"
      ? { challengerId: session.user.id }
      : {
          OR: [
            { challengeeId: session.user.id },
            { challengerId: session.user.id },
          ],
        }

  const duels = await db.gameDuel.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      challenger: {
        select: { id: true, name: true, username: true, image: true },
      },
      challengee: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  })

  return NextResponse.json(duels)
}
