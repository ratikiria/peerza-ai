// Seeds demo Ranked Calls for the 10 demo users (investor demos).
//
// Honesty rules — nothing here picks winners:
//   • Past calls: entry is the REAL historical price at the call's start
//     (Yahoo daily open). Direction follows a fixed rule (the asset's 10-day
//     trend before the start), and the target is a fixed difficulty ratio from
//     the user's rotation. None of it looks at prices after the start.
//   • Calls are inserted OPEN. The app's own resolver (lib/ranked-resolver.ts,
//     every minute on prod) settles them against real candles — same code
//     path, points and reputation as a real user's call.
//   • Live calls: entry at the current price with real future deadlines;
//     they resolve over the coming weeks like any other call.
//
// Idempotent: deletes ranked calls previously created by THIS script
// (tagged analysis.seed = "demo-ranked") for the demo users, then recreates.
//
// Run: node scripts/seed-ranked-calls.js          (local .env DATABASE_URL)
//      DATABASE_URL=<prod public url> node scripts/seed-ranked-calls.js
require("dotenv").config({ quiet: true })
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const SEED_TAG = "demo-ranked"
const DAY = 86_400_000

// priceSource/priceKey match what the composer stores, so cards, ticker pages
// and the resolver treat these exactly like user-created calls.
const ASSETS = {
  BTC:  { yahoo: "BTC-USD",  priceSource: "crypto", priceKey: "bitcoin",  topic: "crypto", kind: "crypto" },
  ETH:  { yahoo: "ETH-USD",  priceSource: "crypto", priceKey: "ethereum", topic: "crypto", kind: "crypto" },
  SOL:  { yahoo: "SOL-USD",  priceSource: "crypto", priceKey: "solana",   topic: "crypto", kind: "crypto" },
  NVDA: { yahoo: "NVDA",     priceSource: "stooq",  priceKey: "nvda.us",  topic: "stocks", kind: "market" },
  AAPL: { yahoo: "AAPL",     priceSource: "stooq",  priceKey: "aapl.us",  topic: "stocks", kind: "market" },
  TSLA: { yahoo: "TSLA",     priceSource: "stooq",  priceKey: "tsla.us",  topic: "stocks", kind: "market" },
  MSFT: { yahoo: "MSFT",     priceSource: "stooq",  priceKey: "msft.us",  topic: "stocks", kind: "market" },
  META: { yahoo: "META",     priceSource: "stooq",  priceKey: "meta.us",  topic: "stocks", kind: "market" },
  AMZN: { yahoo: "AMZN",     priceSource: "stooq",  priceKey: "amzn.us",  topic: "stocks", kind: "market" },
  SPY:  { yahoo: "SPY",      priceSource: "stooq",  priceKey: "spy.us",   topic: "stocks", kind: "market" },
  "EUR/USD": { yahoo: "EURUSD=X", priceSource: "stooq", priceKey: "eurusd", topic: "forex", kind: "market" },
  "GBP/JPY": { yahoo: "GBPJPY=X", priceSource: "stooq", priceKey: "gbpjpy", topic: "forex", kind: "market" },
  GOLD: { yahoo: "GC=F",     priceSource: "stooq",  priceKey: "xauusd",   topic: "stocks", kind: "market" },
}

// Each demo user trades their persona's assets with their own style. The
// ratio rotation is how ambitious their targets are (1.0 = a typical move).
const USERS = [
  { username: "human",          assets: ["EUR/USD", "BTC", "GBP/JPY", "ETH"], tfs: ["1W", "1M"], ratios: [0.8, 1.1, 0.7] },
  { username: "sarah_stocks",   assets: ["NVDA", "AAPL", "MSFT", "META"],    tfs: ["1W", "1M"], ratios: [0.9, 0.7, 1.2] },
  { username: "marcus_trades",  assets: ["GOLD", "SPY", "TSLA"],             tfs: ["1W"],       ratios: [0.7, 1.0, 1.4] },
  { username: "emma_defi",      assets: ["ETH", "SOL", "BTC"],               tfs: ["1W", "1M"], ratios: [1.2, 0.9, 1.5] },
  { username: "dparkfinance",   assets: ["SPY", "MSFT", "AMZN"],             tfs: ["1M"],       ratios: [0.7, 0.8, 1.0] },
  { username: "olivia_quant",   assets: ["NVDA", "SPY", "BTC", "AAPL"],      tfs: ["1W"],       ratios: [0.6, 0.8, 0.7] },
  { username: "jrodriguez_fx",  assets: ["GBP/JPY", "EUR/USD", "GOLD"],      tfs: ["1W", "1M"], ratios: [0.9, 1.3, 0.8] },
  { username: "sofia_macro",    assets: ["GOLD", "SPY", "EUR/USD"],          tfs: ["1M"],       ratios: [1.0, 0.8, 1.2] },
  { username: "ryan_theta",     assets: ["TSLA", "NVDA", "META"],            tfs: ["1W"],       ratios: [1.4, 1.1, 1.7] },
  { username: "priya_invest",   assets: ["SPY", "AAPL", "MSFT", "AMZN"],     tfs: ["1M"],       ratios: [0.6, 0.7, 0.9] },
]

const PAST_PER_USER = 12   // RANK_MIN_CALLS is 10, so tiers can unlock
const LIVE_PER_USER = 2

// Mirrors lib/ranked.ts (typicalMovePct / difficultyRatio / TF windows).
const FALLBACK_SIGMA = { crypto: 3.5, market: 1.8 }
const TF = { "1W": { tradingDays: 5 }, "1M": { months: 1 } }
function windowDays(tf, kind) {
  const d = TF[tf]
  if (d.tradingDays) return kind === "crypto" ? d.tradingDays * (7 / 5) : d.tradingDays
  return d.months * (kind === "crypto" ? 30 : 21)
}
const typicalMove = (tf, kind, sigma) => (sigma > 0 ? sigma : FALLBACK_SIGMA[kind]) * Math.sqrt(windowDays(tf, kind))
function addMonths(ms, n) { const d = new Date(ms); d.setUTCMonth(d.getUTCMonth() + n); return d.getTime() }
function deadlineFor(tf, kind, start) {
  let end = TF[tf].months ? addMonths(start, TF[tf].months) : kind === "crypto" ? start + 7 * DAY : addWeekdays(start, 5)
  while (kind !== "crypto" && [0, 6].includes(new Date(end).getUTCDay())) end += DAY
  return end
}
function addWeekdays(ms, n) {
  let t = ms
  while (n > 0) { t += DAY; const wd = new Date(t).getUTCDay(); if (wd !== 0 && wd !== 6) n-- }
  return t
}
function fmt(p) {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 })
  if (p >= 10) return p.toFixed(2)
  return p.toFixed(4)
}

async function chart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } })
  if (!res.ok) throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`)
  const r = (await res.json())?.chart?.result?.[0]
  const q = r?.indicators?.quote?.[0] ?? {}
  const candles = (r?.timestamp ?? [])
    .map((t, i) => ({ t: t * 1000, o: q.open?.[i], c: q.close?.[i] }))
    .filter((c) => Number.isFinite(c.o) && Number.isFinite(c.c))
  return { candles, meta: r?.meta ?? {} }
}

// Std-dev of daily % returns over the 60 sessions before index i (no look-ahead).
function dailySigma(candles, i) {
  const rets = []
  for (let k = Math.max(1, i - 60); k < i; k++) rets.push((candles[k].c / candles[k - 1].c - 1) * 100)
  if (rets.length < 10) return 0
  const m = rets.reduce((a, b) => a + b, 0) / rets.length
  return Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1))
}

const LINES = {
  bullish: [
    "{T} holding its trend and pulling back into support. I think it pushes to {TG} before the deadline.",
    "Momentum still points up on {T}. Calling {TG} by the deadline — ranked, so I'm on the record.",
    "Higher lows all the way on {T}. Target {TG}, deadline locked.",
    "{T} buyers keep stepping in on every dip. Ranked call: {TG}.",
  ],
  bearish: [
    "{T} keeps failing at resistance. I expect a move down to {TG} before the deadline.",
    "Trend on {T} has rolled over. Calling {TG} — ranked, on the record.",
    "Lower highs on {T} and momentum fading. Target {TG}, deadline locked.",
    "Rallies on {T} keep getting sold. Ranked call: {TG}.",
  ],
}

function buildCall({ user, ticker, asset, tf, ratio, start, entry, sigma, dir, idx }) {
  const bull = dir === "bullish"
  const move = ratio * typicalMove(tf, asset.kind, sigma)
  const target = entry * (1 + (bull ? move : -move) / 100)
  const line = LINES[dir][idx % LINES[dir].length].replaceAll("{T}", `$${ticker}`).replaceAll("{TG}", fmt(target))
  const conviction = Math.max(2, Math.min(5, Math.round(5 - ratio * 1.5 + (idx % 2))))
  return {
    content: line,
    authorId: user.id,
    topics: [asset.topic],
    createdAt: new Date(start),
    updatedAt: new Date(start),
    analysis: {
      ticker, direction: dir, timeframe: tf, entry: fmt(entry), target: fmt(target),
      conviction, catalyst: "technical", position: "entered",
      priceSource: asset.priceSource, priceKey: asset.priceKey, seed: SEED_TAG,
    },
    outcomeStatus: "OPEN",
    rankedTf: tf,
    rankedSymbol: asset.yahoo,
    rankedStartsAt: new Date(start),
    rankedDeadline: new Date(deadlineFor(tf, asset.kind, start)),
    rankedEntry: entry,
    rankedTarget: parseFloat(target.toPrecision(8)),
    rankedDifficulty: parseFloat(ratio.toFixed(3)),
    rankedProgress: 0,
    rankedLastPrice: entry,
  }
}

async function main() {
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/\/.*$/, "")
  console.log(`Seeding demo ranked calls → ${host}`)

  const users = await db.user.findMany({ where: { username: { in: USERS.map((u) => u.username) } }, select: { id: true, username: true } })
  const byName = Object.fromEntries(users.map((u) => [u.username, u]))

  const charts = {}
  for (const [t, a] of Object.entries(ASSETS)) charts[t] = await chart(a.yahoo)

  const old = await db.post.deleteMany({
    where: { authorId: { in: users.map((u) => u.id) }, rankedDeadline: { not: null }, analysis: { path: ["seed"], equals: SEED_TAG } },
  })
  console.log(`  Cleared ${old.count} previously seeded ranked calls.`)

  const now = Date.now()
  const rows = []
  for (const cfg of USERS) {
    const user = byName[cfg.username]
    if (!user) { console.warn(`  @${cfg.username} not found — skipping`); continue }

    // Past calls: starts spread over ~40–200 days ago, each ending before today.
    for (let k = 0; k < PAST_PER_USER; k++) {
      const ticker = cfg.assets[k % cfg.assets.length]
      const asset = ASSETS[ticker]
      const tf = cfg.tfs[k % cfg.tfs.length]
      const ratio = cfg.ratios[k % cfg.ratios.length]
      const { candles } = charts[ticker]
      const targetStart = now - (45 + k * 13 + (cfg.username.length % 5)) * DAY
      const i = candles.findIndex((c) => c.t >= targetStart)
      if (i < 70) continue
      const start = candles[i].t
      if (deadlineFor(tf, asset.kind, start) > now - DAY) continue
      const trend = candles[i - 1].c / candles[i - 11].c - 1 // known before the start
      rows.push(buildCall({
        user, ticker, asset, tf, ratio, start, entry: candles[i].o, sigma: dailySigma(candles, i),
        dir: trend >= 0 ? "bullish" : "bearish", idx: k,
      }))
    }

    // Live calls: entry at the latest price, deadlines in the future.
    for (let k = 0; k < LIVE_PER_USER; k++) {
      const ticker = cfg.assets[(k + 1) % cfg.assets.length]
      const asset = ASSETS[ticker]
      const tf = cfg.tfs[(k + 1) % cfg.tfs.length]
      const ratio = cfg.ratios[(k + 2) % cfg.ratios.length]
      const { candles, meta } = charts[ticker]
      const i = candles.length - 1
      const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : candles[i].c
      const start = now - k * 60_000 // posted now, at the current price
      const trend = price / candles[i - 10].c - 1
      const call = buildCall({
        user, ticker, asset, tf, ratio, start, entry: price, sigma: dailySigma(candles, i),
        dir: trend >= 0 ? "bullish" : "bearish", idx: k + 1,
      })
      // Settle from now on, so only real price action after posting counts.
      call.rankedCheckedThrough = new Date(now)
      rows.push(call)
    }
  }

  for (const data of rows) await db.post.create({ data })
  const past = rows.filter((r) => r.rankedDeadline.getTime() < now).length
  console.log(`  Created ${rows.length} ranked calls (${past} past → resolver settles them, ${rows.length - past} live).`)
  await db.$disconnect()
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
