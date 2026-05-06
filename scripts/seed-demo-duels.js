// Seeds two demo duels:
//   1) An incoming pending duel from @alexchen_fx → main user (Play this!)
//   2) A completed duel from main user → @sarah_stocks (showcase result row)

const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

require("dotenv").config({ path: ".env" })
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

;(async () => {
  try {
    // Owner is the first-created user (per scripts/seed-demo.js convention) —
    // works whether you're rati@finsocial.dev locally or your real email in prod.
    const main = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, email: true },
    })
    if (!main) throw new Error("No users in DB. Sign up first.")

    const alex = await db.user.findUnique({ where: { email: "alex@finsocial.dev" }, select: { id: true, username: true } })
    const sarah = await db.user.findUnique({ where: { email: "sarah@finsocial.dev" }, select: { id: true, username: true } })
    if (!alex || !sarah) throw new Error("Demo users missing — run scripts/seed-demo.js first")

    console.log(`Main user: @${main.username} (${main.email})`)

    // Wipe prior demo duels touching these accounts so this is idempotent
    await db.gameDuel.deleteMany({
      where: {
        OR: [
          { challengerId: alex.id, challengeeId: main.id },
          { challengerId: main.id, challengeeId: sarah.id },
        ],
      },
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // (1) Pending incoming duel from Alex → main user, on Guess the Direction
    const incoming = await db.gameDuel.create({
      data: {
        gameId: "guess-direction",
        seed: "demo-incoming-" + Date.now().toString(36),
        challengerId: alex.id,
        challengeeId: main.id,
        challengerPct: 14.7,
        expiresAt,
      },
    })
    await db.notification.create({
      data: {
        type: "GAME_DUEL_INVITE",
        receiverId: main.id,
        triggeredBy: alex.id,
        entityId: incoming.id,
      },
    })
    console.log(`✓ Pending duel from @alexchen_fx (+14.7%) → /games/duels`)

    // (2) Completed duel: main user → Sarah, Build the Portfolio
    const completed = await db.gameDuel.create({
      data: {
        gameId: "build-portfolio",
        seed: "demo-completed-" + Date.now().toString(36),
        challengerId: main.id,
        challengeeId: sarah.id,
        challengerPct: 22.1,
        challengeePct: 18.4,
        challengeeAt: new Date(),
        expiresAt,
      },
    })
    await db.notification.create({
      data: {
        type: "GAME_DUEL_RESULT",
        receiverId: main.id,
        triggeredBy: sarah.id,
        entityId: completed.id,
      },
    })
    console.log(`✓ Completed duel vs @sarah_stocks (you 22.1% vs her 18.4% — you won)`)

    console.log("\nLog in and visit /games/duels.")
  } finally {
    await db.$disconnect()
  }
})()
