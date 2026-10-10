// Pays Peerz for Ranked Calls and duels that resolved before Peerz existed,
// using the app's own award code (lib/peerz-server.ts) so the numbers match
// what the live resolver pays.
//
// Idempotent: the ledger's (userId, reason, refId) key means re-running only
// fills gaps. Calls are processed oldest-first so Hot Hand streaks and the
// daily resolved-call cap come out the same as if Peerz had been live.
//
// Run: node scripts/backfill-peerz.js          (local .env DATABASE_URL)
//      DATABASE_URL=<prod public url> node scripts/backfill-peerz.js
require("dotenv").config({ quiet: true })
const path = require("path")
const { createJiti } = require("jiti")

const jiti = createJiti(__filename, { alias: { "@": path.resolve(__dirname, "../src") } })

async function main() {
  const { db } = await jiti.import("@/lib/db")
  const { awardRankedCall, awardDuelWin } = await jiti.import("@/lib/peerz-server")

  const calls = await db.post.findMany({
    where: { rankedDeadline: { not: null }, outcomeStatus: { in: ["TARGET_HIT", "EXPIRED"] } },
    orderBy: { outcomeAt: "asc" },
    select: { id: true },
  })
  let i = 0
  for (const c of calls) {
    await awardRankedCall(c.id)
    if (++i % 25 === 0) console.log(`calls ${i}/${calls.length}`)
  }
  console.log(`calls done: ${calls.length}`)

  const duels = await db.gameDuel.findMany({
    where: { challengeePct: { not: null } },
    orderBy: { challengeeAt: "asc" },
    select: { id: true },
  })
  for (const d of duels) await awardDuelWin(d.id)
  console.log(`duels done: ${duels.length}`)

  const totals = await db.user.findMany({
    where: { peerzBalance: { gt: 0 } },
    orderBy: { peerzBalance: "desc" },
    select: { username: true, peerzBalance: true },
  })
  for (const t of totals) console.log(`  @${t.username.padEnd(16)} ${t.peerzBalance}`)
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
