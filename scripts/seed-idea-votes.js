// Seeds bull/bear sentiment votes on demo users' trade ideas so the sentiment
// bar under trade-idea cards has data in investor demos. Only the 10 demo
// users vote, only on each other's ideas; each vote is a deterministic hash of
// (voter, post), leaning ~60% toward the author's direction. Idempotent:
// clears these demo users' votes on demo posts first.
//
// Run: node scripts/seed-idea-votes.js          (local .env DATABASE_URL)
//      DATABASE_URL=<prod public url> node scripts/seed-idea-votes.js
require("dotenv").config({ quiet: true })
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const DEMO = ["human", "sarah_stocks", "marcus_trades", "emma_defi", "dparkfinance", "olivia_quant", "jrodriguez_fx", "sofia_macro", "ryan_theta", "priya_invest"]

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

async function main() {
  const users = await db.user.findMany({ where: { username: { in: DEMO } }, select: { id: true, username: true } })
  const ids = users.map((u) => u.id)
  const posts = await db.post.findMany({
    where: { authorId: { in: ids }, NOT: [{ analysis: { equals: null } }] },
    select: { id: true, authorId: true, analysis: true },
  })
  const ideas = posts.filter((p) => ["bullish", "bearish"].includes(p.analysis?.direction))

  const cleared = await db.ideaVote.deleteMany({ where: { userId: { in: ids }, postId: { in: ideas.map((p) => p.id) } } })
  const rows = []
  for (const p of ideas) {
    const authorBull = p.analysis.direction === "bullish"
    for (const u of users) {
      if (u.id === p.authorId) continue
      const r = hash(`${u.username}:${p.id}`)
      if (r < 0.25) continue // not everyone votes on everything
      const agrees = hash(`${p.id}:${u.username}:side`) < 0.6
      rows.push({ postId: p.id, userId: u.id, bullish: agrees ? authorBull : !authorBull })
    }
  }
  await db.ideaVote.createMany({ data: rows, skipDuplicates: true })
  console.log(`Cleared ${cleared.count}, created ${rows.length} votes on ${ideas.length} trade ideas.`)
  await db.$disconnect()
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
