// Seeds an active investment challenge with ~20 participants and varied portfolios.
// Run with: node scripts/seed-investments.js
require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")
const bcrypt = require("bcryptjs")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const EXTRA_USERS = [
  { name: "Mike Reynolds",  username: "mike_swing",   email: "mike@finsocial.dev",   bio: "Swing trader, 5-day holds. Tech and energy plays.",                interests: ["Stocks"] },
  { name: "Lisa Park",      username: "lisa_options", email: "lisa@finsocial.dev",   bio: "Options strategist | iron condors and credit spreads only.",       interests: ["Options"] },
  { name: "James Wu",       username: "james_crypto", email: "jameswu@finsocial.dev",  bio: "Crypto maxi since 2017. BTC + select alts only.",                interests: ["Crypto"] },
  { name: "Anna Kowalski",  username: "anna_value",   email: "anna@finsocial.dev",   bio: "Value investor. Cheap stocks with strong balance sheets.",         interests: ["Stocks"] },
  { name: "Raj Patel",      username: "raj_gold",     email: "raj@finsocial.dev",    bio: "Gold bug + commodity rotation. Hedging the dollar.",               interests: ["Commodities"] },
  { name: "Taylor Brooks",  username: "taylor_etf",   email: "taylor@finsocial.dev", bio: "Boring ETF investor — 3-fund portfolio, dollar-cost averaging.",   interests: ["ETFs"] },
  { name: "Chris Walker",   username: "chris_macro2", email: "chris@finsocial.dev",  bio: "Global macro trades. Watching central banks and yield curves.",    interests: ["Forex", "Stocks"] },
  { name: "Nina Santos",    username: "nina_smallcap",email: "nina@finsocial.dev",   bio: "Small-cap explorer. Looking for the next 10-bagger.",              interests: ["Stocks"] },
  { name: "Leo Costa",      username: "leo_index",    email: "leo@finsocial.dev",    bio: "Just buy the index. SPX + QQQ until I retire.",                    interests: ["ETFs"] },
  { name: "Maya Tan",       username: "maya_short",   email: "maya@finsocial.dev",   bio: "Short-side specialist. Spotting overvaluation + fraud.",           interests: ["Stocks"] },
]

// Asset universe — symbol, display name, type, and the priceKey our API uses
const ASSETS = [
  // Crypto
  { symbol: "BTC",   name: "Bitcoin",        assetType: "crypto", priceKey: "bitcoin",      basePrice: 77000 },
  { symbol: "ETH",   name: "Ethereum",       assetType: "crypto", priceKey: "ethereum",     basePrice: 2300  },
  { symbol: "SOL",   name: "Solana",         assetType: "crypto", priceKey: "solana",       basePrice: 180   },
  { symbol: "BNB",   name: "BNB",            assetType: "crypto", priceKey: "binancecoin",  basePrice: 580   },
  { symbol: "ADA",   name: "Cardano",        assetType: "crypto", priceKey: "cardano",      basePrice: 0.55  },
  // Stocks
  { symbol: "NVDA",  name: "NVIDIA Corp",       assetType: "stock", priceKey: "nvda.us",  basePrice: 200 },
  { symbol: "AAPL",  name: "Apple Inc",          assetType: "stock", priceKey: "aapl.us",  basePrice: 270 },
  { symbol: "TSLA",  name: "Tesla Inc",          assetType: "stock", priceKey: "tsla.us",  basePrice: 380 },
  { symbol: "MSFT",  name: "Microsoft Corp",     assetType: "stock", priceKey: "msft.us",  basePrice: 420 },
  { symbol: "META",  name: "Meta Platforms",     assetType: "stock", priceKey: "meta.us",  basePrice: 600 },
  { symbol: "AMZN",  name: "Amazon.com Inc",     assetType: "stock", priceKey: "amzn.us",  basePrice: 230 },
  { symbol: "GOOGL", name: "Alphabet Inc",       assetType: "stock", priceKey: "googl.us", basePrice: 200 },
  { symbol: "AMD",   name: "Advanced Micro",     assetType: "stock", priceKey: "amd.us",   basePrice: 165 },
  { symbol: "NFLX",  name: "Netflix Inc",        assetType: "stock", priceKey: "nflx.us",  basePrice: 760 },
]

const STARTING_CAPITAL = 100_000
const CHALLENGE_NAME = "Q4 Trading Showdown"

function rnd(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rnd(min, max + 1)) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

async function ensureUser(u) {
  const existing = await db.user.findUnique({ where: { email: u.email } })
  if (existing) return existing
  const passwordHash = await bcrypt.hash("demo1234", 10)
  return db.user.create({
    data: {
      name: u.name,
      username: u.username,
      email: u.email,
      passwordHash,
      bio: u.bio,
      interests: u.interests,
      isVerified: true,
    },
  })
}

async function main() {
  console.log("🌱 Seeding investment challenge with 20 demo participants...\n")

  // Step 1: ensure 10 extra demo users exist (combined with the existing 10 from seed-demo.js → 20 total)
  console.log("👥 Ensuring 10 extra demo users exist...")
  for (const u of EXTRA_USERS) {
    await ensureUser(u)
  }

  // Step 2: pick exactly the 20 demo users by username — the 10 from
  // seed-demo.js plus the 10 EXTRA_USERS above. Email-suffix matching used to
  // miss Alex Chen (`human@peerza.ai`) because his email isn't on @finsocial.dev.
  const DEMO_USERNAMES = [
    "human", "sarah_stocks", "marcus_trades", "emma_defi", "dparkfinance",
    "olivia_quant", "jrodriguez_fx", "sofia_macro", "ryan_theta", "priya_invest",
    ...EXTRA_USERS.map((u) => u.username),
  ]
  const demoUsers = await db.user.findMany({
    where: { username: { in: DEMO_USERNAMES } },
  })

  if (demoUsers.length < 10) {
    console.error(`❌ Only found ${demoUsers.length} demo users — run scripts/seed-demo.js first.`)
    process.exit(1)
  }
  console.log(`   ✓ ${demoUsers.length} demo users available`)

  // Step 3: main user owns the challenge but does NOT participate — they have
  // their own /portfolio for their real activity. Participants stay at 20.
  const mainUser = await db.user.findUnique({ where: { username: "ratikiria" } })
  const allParticipants = demoUsers

  // Step 4: get-or-create the demo challenge
  let challenge = await db.challenge.findFirst({
    where: { name: CHALLENGE_NAME },
  })
  if (challenge) {
    console.log(`\n🗑️  Resetting existing challenge "${CHALLENGE_NAME}"...`)
    await db.challenge.delete({ where: { id: challenge.id } })
  }

  console.log(`\n🏆 Creating challenge "${CHALLENGE_NAME}"...`)
  const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // started 5 days ago
  const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)  // ends in 14 days
  challenge = await db.challenge.create({
    data: {
      name: CHALLENGE_NAME,
      description: "Top traders compete with $100k virtual capital. Mix crypto, stocks, commodities. Top performer wins bragging rights.",
      creatorId: mainUser?.id ?? allParticipants[0].id,
      type: "PUBLIC",
      startDate: start,
      endDate: end,
      virtualCapital: STARTING_CAPITAL,
      assetClasses: ["crypto", "stocks", "commodities"],
      maxParticipants: null,
      leaderboardVisible: true,
      status: "ACTIVE",
    },
  })
  console.log(`   ✓ Challenge id: ${challenge.id}`)

  // Step 5: for each participant, simulate a portfolio
  console.log(`\n💼 Building portfolios for ${allParticipants.length} participants...`)

  for (const user of allParticipants) {
    let cashBalance = STARTING_CAPITAL
    const numAssets = randInt(3, 7)
    const chosen = shuffle(ASSETS).slice(0, numAssets)

    // Track holdings as {priceKey: { quantity, totalCost }}
    const holdings = {}
    const trades = []

    // Decide overall portfolio bias for this user (-30% to +35% target)
    const targetReturn = rnd(-0.30, 0.35)

    for (const asset of chosen) {
      // Allocate a random share of remaining cash to this asset (15-40%)
      const allocPct = rnd(0.15, 0.40)
      const budget = Math.min(cashBalance * allocPct, cashBalance * 0.6)
      if (budget < 100) continue

      // Buy price relative to base — lean toward giving us our target return
      // If target is +20%, average buy was ~17% below current; if -20%, average buy was ~25% above current
      const avgPriceFactor = 1 - (targetReturn * (0.7 + Math.random() * 0.4))
      const buyPrice = asset.basePrice * Math.max(0.5, avgPriceFactor)
      const quantity = budget / buyPrice
      if (quantity <= 0) continue

      // Stagger trade time across last 5 days
      const tradeTime = new Date(Date.now() - rnd(0.5, 5) * 24 * 60 * 60 * 1000)

      trades.push({
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.assetType,
        priceKey: asset.priceKey,
        side: "BUY",
        quantity,
        price: buyPrice,
        total: budget,
        createdAt: tradeTime,
      })

      holdings[asset.priceKey] = {
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.assetType,
        priceKey: asset.priceKey,
        quantity,
        avgCost: buyPrice,
      }

      cashBalance -= budget
    }

    // 30% chance of partial sell on one position (for trade history realism)
    if (Math.random() < 0.3 && Object.keys(holdings).length > 0) {
      const sellKey = pick(Object.keys(holdings))
      const h = holdings[sellKey]
      const sellQty = h.quantity * rnd(0.2, 0.5)
      const sellPriceFactor = 0.95 + Math.random() * 0.10 // ±5% of avg
      const sellPrice = h.avgCost * sellPriceFactor
      const proceeds = sellQty * sellPrice
      const sellTime = new Date(Date.now() - rnd(0.1, 1.0) * 24 * 60 * 60 * 1000)

      trades.push({
        symbol: h.symbol,
        name: h.name,
        assetType: h.assetType,
        priceKey: h.priceKey,
        side: "SELL",
        quantity: sellQty,
        price: sellPrice,
        total: proceeds,
        createdAt: sellTime,
      })

      h.quantity -= sellQty
      cashBalance += proceeds
      if (h.quantity < 0.000001) delete holdings[sellKey]
    }

    // Persist participant + holdings + trades
    const participant = await db.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        cashBalance: Number(cashBalance.toFixed(2)),
      },
    })

    for (const h of Object.values(holdings)) {
      await db.holding.create({
        data: {
          participantId: participant.id,
          symbol: h.symbol,
          name: h.name,
          assetType: h.assetType,
          priceKey: h.priceKey,
          quantity: h.quantity,
          avgCost: h.avgCost,
        },
      })
    }

    for (const t of trades) {
      await db.trade.create({
        data: {
          participantId: participant.id,
          symbol: t.symbol,
          name: t.name,
          assetType: t.assetType,
          priceKey: t.priceKey,
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          total: t.total,
          createdAt: t.createdAt,
        },
      })
    }

    console.log(`   ✓ @${user.username.padEnd(18)} ${trades.length} trades · ${Object.keys(holdings).length} holdings · $${cashBalance.toFixed(0)} cash`)
  }

  console.log(`\n🎉 Done! Visit /investments to see "${CHALLENGE_NAME}" with ${allParticipants.length} participants.`)
  console.log(`   Demo user passwords: demo1234`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
