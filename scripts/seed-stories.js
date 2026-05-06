// Adds demo stories for the 10 demo users. About half the users get a single
// story, the rest get 2–3 stories each so the multi-story viewer can be
// exercised in the demo. Run with: node scripts/seed-stories.js
require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

// Build a colourful SVG story card and return it as a base64 data URL
function makeStoryImage(bgFrom, bgTo, emoji, line1, line2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgFrom}"/>
      <stop offset="100%" stop-color="${bgTo}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <text x="200" y="240" text-anchor="middle" font-size="80" font-family="serif">${emoji}</text>
  <text x="200" y="320" text-anchor="middle" font-size="28" font-weight="bold" fill="white" font-family="sans-serif">${line1}</text>
  <text x="200" y="360" text-anchor="middle" font-size="20" fill="rgba(255,255,255,0.75)" font-family="sans-serif">${line2}</text>
  <text x="200" y="560" text-anchor="middle" font-size="16" fill="rgba(255,255,255,0.4)" font-family="sans-serif">peerio.ai</text>
</svg>`
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64")
}

// Each entry is one user's full story queue. `hoursAgo` is how long before
// "now" the story was posted — smaller = newer. The viewer plays them
// oldest→newest so list them in posting order.
const STORY_QUEUES = [
  {
    username: "alexchen_fx",
    stories: [
      { hoursAgo: 9, mediaUrl: makeStoryImage("#0f2027", "#2c5364", "📈", "EUR/USD Setup", "Key support at 1.0820"), caption: "Watching this level closely today 👀" },
      { hoursAgo: 5, mediaUrl: makeStoryImage("#0f2027", "#3a8dde", "🎯", "Entry Triggered", "Long from 1.0825"), caption: "In on the bounce — stop at 1.0790" },
      { hoursAgo: 1, mediaUrl: makeStoryImage("#0f2027", "#11998e", "💚", "+45 pips", "Trail stop to BE"), caption: "Risk-free runner now 🚀" },
    ],
  },
  {
    username: "sarah_stocks",
    stories: [
      { hoursAgo: 8, mediaUrl: makeStoryImage("#1a1a2e", "#e94560", "🏦", "TSLA Earnings Play", "Options flow looking bullish"), caption: "Big week for tech earnings 🚀" },
      { hoursAgo: 3, mediaUrl: makeStoryImage("#1a1a2e", "#f39c12", "📞", "Calls Filling", "Heavy delta on weeklies"), caption: "Smart money positioning early" },
    ],
  },
  {
    username: "marcus_trades",
    stories: [
      { hoursAgo: 7, mediaUrl: makeStoryImage("#134e5e", "#71b280", "₿", "BTC Breakout?", "65k resistance is the key"), caption: "Watching BTC closely, accumulating dips" },
    ],
  },
  {
    username: "emma_defi",
    stories: [
      { hoursAgo: 11, mediaUrl: makeStoryImage("#4a00e0", "#8e2de2", "🔗", "DeFi Yields on Fire", "ETH staking at 4.2% APR"), caption: "Yield farming season is back 🌱" },
      { hoursAgo: 6, mediaUrl: makeStoryImage("#4a00e0", "#0093e9", "🌊", "TVL Climbing", "+12% in 24h across L2s"), caption: "Capital is rotating in fast" },
      { hoursAgo: 2, mediaUrl: makeStoryImage("#4a00e0", "#ff6ec4", "🎁", "Airdrop Hunt", "5 protocols to farm right now"), caption: "DM me for the list" },
    ],
  },
  {
    username: "dparkfinance",
    stories: [
      { hoursAgo: 6, mediaUrl: makeStoryImage("#11998e", "#38ef7d", "📊", "S&P 500 Analysis", "ATH incoming this week?"), caption: "Macro looking very bullish right now" },
      { hoursAgo: 1, mediaUrl: makeStoryImage("#11998e", "#fceabb", "🔔", "Breakout Confirmed", "Volume + breadth aligned"), caption: "Trend trade, hold the runners" },
    ],
  },
  {
    username: "olivia_quant",
    stories: [
      { hoursAgo: 4, mediaUrl: makeStoryImage("#1c1c1c", "#f7971e", "🤖", "Algo Running", "Sharpe ratio: 2.3 this month"), caption: "Quant strategy crushing it lately 📉➡️📈" },
    ],
  },
  {
    username: "jrodriguez_fx",
    stories: [
      { hoursAgo: 10, mediaUrl: makeStoryImage("#2c3e50", "#e74c3c", "💱", "GBP/JPY Long", "+180 pips today 🎉"), caption: "Carry trade still alive and well!" },
      { hoursAgo: 4, mediaUrl: makeStoryImage("#2c3e50", "#ffb347", "📐", "Trendline Touch", "Buying the bounce again"), caption: "Same setup, different week" },
    ],
  },
  {
    username: "sofia_macro",
    stories: [
      { hoursAgo: 5, mediaUrl: makeStoryImage("#0a0a0a", "#ffd700", "🌍", "Macro Monday", "Fed decision drops Wednesday"), caption: "All eyes on Powell this week" },
    ],
  },
  {
    username: "ryan_theta",
    stories: [
      { hoursAgo: 12, mediaUrl: makeStoryImage("#141e30", "#243b55", "⏳", "Theta Gang", "Selling premium like a pro"), caption: "Time decay is my best friend 🙂" },
      { hoursAgo: 7, mediaUrl: makeStoryImage("#141e30", "#9b59b6", "🎰", "30-Delta Sweet Spot", "Iron condors paying weekly"), caption: "Boring is profitable" },
      { hoursAgo: 2, mediaUrl: makeStoryImage("#141e30", "#16a085", "🟢", "Closed at 50%", "Locking in early"), caption: "Mechanical exits keep me sane" },
    ],
  },
  {
    username: "priya_invest",
    stories: [
      { hoursAgo: 8, mediaUrl: makeStoryImage("#000428", "#004e92", "💎", "Diamond Hands", "Long-term conviction pays"), caption: "5-year portfolio up 340% 💪" },
      { hoursAgo: 3, mediaUrl: makeStoryImage("#000428", "#ff7e5f", "🌱", "DCA Day", "Adding to core positions"), caption: "Boring habit, exciting results" },
    ],
  },
]

async function main() {
  console.log("Seeding demo stories...")

  const usernames = STORY_QUEUES.map((q) => q.username)
  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  })

  const usernameToId = Object.fromEntries(users.map((u) => [u.username, u.id]))

  // Wipe existing stories for these users so re-seeding is idempotent.
  await db.story.deleteMany({
    where: { authorId: { in: users.map((u) => u.id) } },
  })

  const now = Date.now()
  const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000

  let created = 0
  let multiCount = 0
  for (const queue of STORY_QUEUES) {
    const authorId = usernameToId[queue.username]
    if (!authorId) {
      console.warn(`  User ${queue.username} not found — skipping`)
      continue
    }
    for (const s of queue.stories) {
      const createdAt = new Date(now - s.hoursAgo * 60 * 60 * 1000)
      const expiresAt = new Date(createdAt.getTime() + STORY_LIFETIME_MS)
      await db.story.create({
        data: { mediaUrl: s.mediaUrl, caption: s.caption, authorId, createdAt, expiresAt },
      })
      created++
    }
    const n = queue.stories.length
    if (n > 1) multiCount++
    console.log(`  ✓ @${queue.username}: ${n} ${n === 1 ? "story" : "stories"}`)
  }

  console.log(`\nDone — ${created} stories across ${STORY_QUEUES.length} users (${multiCount} have multiple).`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
