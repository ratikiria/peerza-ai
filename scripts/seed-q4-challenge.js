// Seeds the live "Q4 Trading Showdown" (Oct 1 – Dec 31 2026) for investor demos.
//
// Honest by construction: every demo trade is entered at the asset's CURRENT
// real market price (Yahoo), so returns start near 0% and then move only with
// the real market over the quarter. No invented entry prices.
//
// Safe with existing data:
//   • An older challenge with the same name but different dates (the May one,
//     which has real user trades) is RENAMED to "Spring Trading Showdown",
//     never deleted.
//   • Re-running only rebuilds the Q4 challenge this script created
//     (matched by name + start date).
//
// Run: node scripts/seed-q4-challenge.js            (local .env DATABASE_URL)
//      DATABASE_URL=<prod public url> node scripts/seed-q4-challenge.js
require("dotenv").config({ quiet: true })
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const NAME = "Q4 Trading Showdown"
const START = new Date("2026-10-01T00:00:00Z")
const END = new Date("2026-12-31T23:59:59Z")
const CAPITAL = 100_000

const PARTICIPANTS = [
  "human", "sarah_stocks", "marcus_trades", "emma_defi", "dparkfinance",
  "olivia_quant", "jrodriguez_fx", "sofia_macro", "ryan_theta", "priya_invest",
  "mike_swing", "lisa_options", "james_crypto", "anna_value", "raj_gold",
  "taylor_etf", "chris_macro2", "nina_smallcap", "leo_index", "maya_short",
]

// priceKey / assetType exactly as the app's trade route stores them.
const ASSETS = [
  { symbol: "BTC",    name: "Bitcoin",         assetType: "crypto",    priceKey: "bitcoin",     yahoo: "BTC-USD" },
  { symbol: "ETH",    name: "Ethereum",        assetType: "crypto",    priceKey: "ethereum",    yahoo: "ETH-USD" },
  { symbol: "SOL",    name: "Solana",          assetType: "crypto",    priceKey: "solana",      yahoo: "SOL-USD" },
  { symbol: "BNB",    name: "BNB",             assetType: "crypto",    priceKey: "binancecoin", yahoo: "BNB-USD" },
  { symbol: "NVDA",   name: "NVIDIA Corp",     assetType: "stock",     priceKey: "nvda.us",     yahoo: "NVDA" },
  { symbol: "AAPL",   name: "Apple Inc",       assetType: "stock",     priceKey: "aapl.us",     yahoo: "AAPL" },
  { symbol: "TSLA",   name: "Tesla Inc",       assetType: "stock",     priceKey: "tsla.us",     yahoo: "TSLA" },
  { symbol: "MSFT",   name: "Microsoft Corp",  assetType: "stock",     priceKey: "msft.us",     yahoo: "MSFT" },
  { symbol: "META",   name: "Meta Platforms",  assetType: "stock",     priceKey: "meta.us",     yahoo: "META" },
  { symbol: "AMZN",   name: "Amazon.com Inc",  assetType: "stock",     priceKey: "amzn.us",     yahoo: "AMZN" },
  { symbol: "GOOGL",  name: "Alphabet Inc",    assetType: "stock",     priceKey: "googl.us",    yahoo: "GOOGL" },
  { symbol: "AMD",    name: "Advanced Micro",  assetType: "stock",     priceKey: "amd.us",      yahoo: "AMD" },
  { symbol: "NFLX",   name: "Netflix Inc",     assetType: "stock",     priceKey: "nflx.us",     yahoo: "NFLX" },
  { symbol: "SILVER", name: "Silver",          assetType: "commodity", priceKey: "xagusd",      yahoo: "SI=F" },
]

// Deterministic per-user randomness, so re-runs produce the same portfolios.
function rng(seed) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1_000_000) / 1_000_000 }
}

async function livePrice(yahoo) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=5d`,
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } })
  const p = (await r.json())?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!Number.isFinite(p) || p <= 0) throw new Error(`no price for ${yahoo}`)
  return p
}

async function main() {
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/\/.*$/, "")
  console.log(`Seeding ${NAME} → ${host}`)

  // 1. Rename an older challenge with this name (keeps its real trades).
  const older = await db.challenge.findMany({ where: { name: NAME, NOT: { startDate: START } } })
  for (const c of older) {
    await db.challenge.update({ where: { id: c.id }, data: { name: "Spring Trading Showdown" } })
    console.log(`  Renamed older "${NAME}" (${c.startDate.toISOString().slice(0, 10)}) → "Spring Trading Showdown"`)
  }

  // 2. Rebuild the Q4 challenge this script owns.
  const mine = await db.challenge.findMany({ where: { name: NAME, startDate: START } })
  for (const c of mine) await db.challenge.delete({ where: { id: c.id } })
  if (mine.length) console.log(`  Removed ${mine.length} previous seeded copy`)

  const creator = await db.user.findUnique({ where: { username: "ratikiria" } })
  const users = await db.user.findMany({ where: { username: { in: PARTICIPANTS } } })
  if (users.length < 10) throw new Error(`only ${users.length} demo users found`)

  const prices = {}
  for (const a of ASSETS) prices[a.symbol] = await livePrice(a.yahoo)
  console.log("  Live prices:", Object.entries(prices).map(([s, p]) => `${s} ${p}`).join(", "))

  const challenge = await db.challenge.create({
    data: {
      name: NAME,
      description: "Top traders compete with $100k virtual capital through Q4. Mix crypto, stocks, commodities. Real prices, live leaderboard.",
      creatorId: creator?.id ?? users[0].id,
      type: "PUBLIC",
      startDate: START,
      endDate: END,
      virtualCapital: CAPITAL,
      assetClasses: ["crypto", "stocks", "commodities"],
      maxParticipants: null,
      leaderboardVisible: true,
      status: "ACTIVE",
    },
  })

  const now = Date.now()
  for (const u of users) {
    const r = rng(u.username + ":q4")
    const picks = [...ASSETS].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 4)) // 3–6 assets
    let cash = CAPITAL
    const holdings = [], trades = []
    for (const a of picks) {
      const budget = Math.round(cash * (0.15 + r() * 0.25))
      if (budget < 500) continue
      const price = prices[a.symbol]
      const quantity = budget / price
      // Placed during the first hours of the challenge, at today's real price.
      const at = new Date(Math.max(START.getTime(), now - (5 + r() * 120) * 60_000))
      trades.push({ symbol: a.symbol, name: a.name, assetType: a.assetType, priceKey: a.priceKey, side: "BUY", quantity, price, total: budget, createdAt: at })
      holdings.push({ symbol: a.symbol, name: a.name, assetType: a.assetType, priceKey: a.priceKey, quantity, avgCost: price })
      cash -= budget
    }
    const participant = await db.challengeParticipant.create({
      data: { challengeId: challenge.id, userId: u.id, cashBalance: Number(cash.toFixed(2)) },
    })
    for (const h of holdings) await db.holding.create({ data: { participantId: participant.id, ...h } })
    for (const t of trades) await db.trade.create({ data: { participantId: participant.id, ...t } })
  }

  console.log(`  Created "${NAME}" (${challenge.id}) with ${users.length} participants, ${START.toISOString().slice(0, 10)} → ${END.toISOString().slice(0, 10)}`)
  await db.$disconnect()
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
