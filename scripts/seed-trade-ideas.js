// Seeds ~3 trade-idea posts per demo user. Each post has a structured
// `analysis` field (ticker / direction / timeframe / entry / target / conviction
// / catalyst / position) so it renders as a trade-idea card and shows up in
// ticker community panels and outcome tracking.
//
// Idempotent: clears prior trade-idea posts authored by these demo users
// before re-creating, so re-running doesn't pile up duplicates. Posts without
// an `analysis` field (the plain text posts from seed-demo.js) are untouched.
//
// Run with: node scripts/seed-trade-ideas.js
//   (locally) — uses .env's DATABASE_URL
//   (prod)    — railway run node scripts/seed-trade-ideas.js
require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

// Per-user trade ideas. Tickers chosen to match each user's stated persona in
// seed-demo.js (forex/crypto for Alex, equities for Sarah, futures for Marcus,
// DeFi for Emma, macro indices for D. Park, quant baskets for Olivia, GBP/JPY
// for J. Rodriguez, macro for Sofia, options for Ryan, index ETFs for Priya).
//
// `hoursAgo` is how long before "now" the post was created; smaller = newer.
// `direction`: bullish | bearish | neutral
// `timeframe`: 1H | 4H | 1D | 1W | 1M
// `catalyst`:  technical | fundamental | news | macro | sentiment
// `position`:  holding | watching | entered | exited | paper
// `conviction`: 1–5
const IDEAS = [
  {
    username: "human", // Alex Chen — forex + crypto
    posts: [
      {
        hoursAgo: 22, content: "EUR/USD finally breaking above 1.0900 after a week of compression. Clean structure shift on the 4H, MACD turning, and DXY rolling over. Long from 1.0905, targeting 1.0980 then 1.1050. Stop tight at 1.0860.",
        analysis: { ticker: "EUR/USD", direction: "bullish", timeframe: "4H", entry: "1.0905", target: "1.1050", conviction: 4, catalyst: "technical", position: "entered" },
      },
      {
        hoursAgo: 14, content: "BTC consolidating between 65k–68k for six straight sessions. Volatility compression like this rarely resolves sideways. CME gap at 71k is the magnet. Accumulating on dips below 66k. Bias: bullish.",
        analysis: { ticker: "BTC", direction: "bullish", timeframe: "1D", entry: "66000", target: "71000", conviction: 4, catalyst: "technical", position: "holding" },
      },
      {
        hoursAgo: 6, content: "GBP/JPY parabolic move is overdue for a pullback. RSI on the daily is screaming overbought (78), and BoJ headlines getting louder. Watching for a short setup near 198.50 — not entered yet.",
        analysis: { ticker: "GBP/JPY", direction: "bearish", timeframe: "1D", entry: "198.50", target: "194.00", conviction: 3, catalyst: "sentiment", position: "watching" },
      },
    ],
  },
  {
    username: "sarah_stocks", // equity analyst, tech + healthcare
    posts: [
      {
        hoursAgo: 20, content: "NVDA into earnings — Street at $5.58 EPS, data center revenue is the only number that matters. 12 straight beats. I'm holding through the print, sizing trimmed. Above $22B in DC and we gap to 1,000+.",
        analysis: { ticker: "NVDA", direction: "bullish", timeframe: "1W", entry: "905", target: "1020", conviction: 4, catalyst: "fundamental", position: "holding" },
      },
      {
        hoursAgo: 11, content: "TSLA breaking 185 on real volume for the first time in six weeks. Margins bottomed last quarter, FSD adoption curve is steepening. Entered a starter position at 187, adding on a hold above 192.",
        analysis: { ticker: "TSLA", direction: "bullish", timeframe: "1D", entry: "187", target: "210", conviction: 3, catalyst: "fundamental", position: "entered" },
      },
      {
        hoursAgo: 3, content: "META AI monetization just getting started — Reels ad load, Threads ramp, custom silicon savings all compounding. Don't see it under $480 again for a while. Long-term hold.",
        analysis: { ticker: "META", direction: "bullish", timeframe: "1M", target: "560", conviction: 5, catalyst: "fundamental", position: "holding" },
      },
    ],
  },
  {
    username: "marcus_trades", // day trader, ES + NQ
    posts: [
      {
        hoursAgo: 23, content: "ES gap from last Friday filled this morning at 5,247. Six-day wait for that. Took the trade, +24 points, out before lunch. Index futures hate unfilled gaps — one of the most reliable plays on the board.",
        analysis: { ticker: "ES", direction: "bullish", timeframe: "1H", entry: "5247", target: "5275", conviction: 4, catalyst: "technical", position: "exited" },
      },
      {
        hoursAgo: 13, content: "NQ losing the 18,400 pivot on rising volume. Short bias for the rest of the session. Risk above 18,450, first target 18,280. Don't fight the tape — let it come to you.",
        analysis: { ticker: "NQ", direction: "bearish", timeframe: "1H", entry: "18400", target: "18280", conviction: 3, catalyst: "technical", position: "entered" },
      },
      {
        hoursAgo: 4, content: "Unusual options flow: SPY 2.1M premium on the 460 puts expiring three weeks out. Smart money hedging or speculating on a pullback? Either way, I'm neutral here and waiting for the tape to confirm.",
        analysis: { ticker: "SPY", direction: "neutral", timeframe: "4H", conviction: 2, catalyst: "sentiment", position: "watching" },
      },
    ],
  },
  {
    username: "emma_defi", // crypto + DeFi
    posts: [
      {
        hoursAgo: 19, content: "ETH staking yield holding at 4.2% APR while gas fees compress. Solana basis trade also juicy at 8%+. Rotating some idle stables into LSTs — not a trade, just a yield bump.",
        analysis: { ticker: "ETH", direction: "bullish", timeframe: "1M", target: "4200", conviction: 3, catalyst: "fundamental", position: "holding" },
      },
      {
        hoursAgo: 9, content: "SOL setting up a textbook continuation pattern on the daily. Higher lows since the 140 bottom, volume building. Long bias above 162, invalidation below 152.",
        analysis: { ticker: "SOL", direction: "bullish", timeframe: "1D", entry: "162", target: "195", conviction: 4, catalyst: "technical", position: "entered" },
      },
      {
        hoursAgo: 2, content: "LINK underperforming the whole alt complex for three months. Either it's a coiled spring or a falling knife. Paper trading a long from 13.50 with target 17.20 — won't risk real capital until structure improves.",
        analysis: { ticker: "LINK", direction: "bullish", timeframe: "1W", entry: "13.50", target: "17.20", conviction: 2, catalyst: "technical", position: "paper" },
      },
    ],
  },
  {
    username: "dparkfinance", // macro / S&P indices
    posts: [
      {
        hoursAgo: 21, content: "S&P 500 grinding into ATH territory. Breadth finally confirming — advance/decline line, equal weight, all hitting new highs together. This is the cleanest macro tape in 18 months.",
        analysis: { ticker: "SPX", direction: "bullish", timeframe: "1W", target: "5500", conviction: 4, catalyst: "macro", position: "holding" },
      },
      {
        hoursAgo: 12, content: "DXY rolling over below 104. Historically that's been rocket fuel for risk assets globally. Long EM equities and gold as the diversified expression.",
        analysis: { ticker: "DXY", direction: "bearish", timeframe: "1M", entry: "103.80", target: "100.50", conviction: 3, catalyst: "macro", position: "entered" },
      },
      {
        hoursAgo: 5, content: "10Y yield back below 4.30%. If we lose 4.20% next, the duration trade really gets going. Watching TLT for a confirmation breakout — not in yet.",
        analysis: { ticker: "TLT", direction: "bullish", timeframe: "1W", entry: "95", target: "103", conviction: 3, catalyst: "macro", position: "watching" },
      },
    ],
  },
  {
    username: "olivia_quant", // systematic / quant
    posts: [
      {
        hoursAgo: 18, content: "Cross-sectional momentum book +2.3% this week. Top deciles dominated by semis (NVDA, AVGO, AMD) and industrials. Bottom deciles loaded with rate-sensitive names. The factor regime is intact.",
        analysis: { ticker: "AVGO", direction: "bullish", timeframe: "1W", conviction: 4, catalyst: "technical", position: "holding" },
      },
      {
        hoursAgo: 10, content: "Vol carry signal flipping bullish on QQQ for the first time since February. Realized < implied across all tenors. Selling a small strangle for the next two weeks.",
        analysis: { ticker: "QQQ", direction: "neutral", timeframe: "4H", conviction: 3, catalyst: "technical", position: "entered" },
      },
      {
        hoursAgo: 1, content: "Mean reversion signal triggered on XLE — three-day Z-score at -2.1. Historical hit rate at this extreme: 68% with a 1.4% mean payoff over 5 days. Entered.",
        analysis: { ticker: "XLE", direction: "bullish", timeframe: "1D", entry: "88.40", target: "90.50", conviction: 3, catalyst: "technical", position: "entered" },
      },
    ],
  },
  {
    username: "jrodriguez_fx", // pure forex
    posts: [
      {
        hoursAgo: 17, content: "GBP/JPY long from yesterday closed +180 pips. Setup was textbook — trendline retest, BoJ tape still dovish, BoE on hold. Carry trade keeps printing money while everyone calls the top.",
        analysis: { ticker: "GBP/JPY", direction: "bullish", timeframe: "4H", entry: "196.20", target: "198.00", conviction: 4, catalyst: "macro", position: "exited" },
      },
      {
        hoursAgo: 8, content: "AUD/USD looking heavy after weak China PMIs. Below 0.6580 opens up 0.6480. Short bias on rallies into 0.6620.",
        analysis: { ticker: "AUD/USD", direction: "bearish", timeframe: "1D", entry: "0.6620", target: "0.6480", conviction: 3, catalyst: "macro", position: "watching" },
      },
      {
        hoursAgo: 1, content: "USD/CAD coiling under 1.3700 for two weeks. Squeeze setting up. Direction will follow oil — if WTI breaks 80 to the upside, CAD strength wins and short USD/CAD pays.",
        analysis: { ticker: "USD/CAD", direction: "bearish", timeframe: "4H", conviction: 2, catalyst: "macro", position: "watching" },
      },
    ],
  },
  {
    username: "sofia_macro", // macro
    posts: [
      {
        hoursAgo: 16, content: "Gold making new ATHs while real yields are still positive. That's a regime tell — central bank buying is structural, not tactical. Holding XAU exposure regardless of dollar zigs and zags.",
        analysis: { ticker: "XAUUSD", direction: "bullish", timeframe: "1M", target: "2500", conviction: 5, catalyst: "macro", position: "holding" },
      },
      {
        hoursAgo: 7, content: "Crude finally stretching higher. OPEC+ discipline is the bedrock, but the China demand impulse is the surprise. Long WTI 80, scaling out at 86.",
        analysis: { ticker: "USOIL", direction: "bullish", timeframe: "1W", entry: "80.20", target: "86.50", conviction: 4, catalyst: "fundamental", position: "entered" },
      },
      {
        hoursAgo: 2, content: "Copper breaking out — Doctor Copper signalling that the global manufacturing pulse is reaccelerating. FCX is my preferred equity expression of the trade.",
        analysis: { ticker: "FCX", direction: "bullish", timeframe: "1W", entry: "52", target: "62", conviction: 3, catalyst: "macro", position: "entered" },
      },
    ],
  },
  {
    username: "ryan_theta", // options seller
    posts: [
      {
        hoursAgo: 15, content: "SPY weekly iron condor 500/505/520/525 for $1.35 credit. IV rank at 32%, breakevens give us plenty of room. Theta does the work, take off at 50% profit.",
        analysis: { ticker: "SPY", direction: "neutral", timeframe: "1W", conviction: 3, catalyst: "technical", position: "entered" },
      },
      {
        hoursAgo: 6, content: "Selling cash-secured puts in AAPL at the 175 strike for next month. Happy to own at that price, IV elevated into the earnings cycle. 1.8% return for the cycle.",
        analysis: { ticker: "AAPL", direction: "bullish", timeframe: "1M", entry: "175", conviction: 4, catalyst: "fundamental", position: "entered" },
      },
      {
        hoursAgo: 1, content: "Earnings vol crush trade — selling MSFT 425/440 strangle for $4.10 right before the print. Implied move is 4.2%, history says actual is 2.8%. Edge is in the IV mean reversion.",
        analysis: { ticker: "MSFT", direction: "neutral", timeframe: "1H", conviction: 3, catalyst: "fundamental", position: "entered" },
      },
    ],
  },
  {
    username: "priya_invest", // long-term passive
    posts: [
      {
        hoursAgo: 14, content: "VTI auto-purchase ran this morning — $500 like every other Friday for the last seven years. Nothing changed in the plan because nothing changed in the long-term thesis. Boring is alpha.",
        analysis: { ticker: "VTI", direction: "bullish", timeframe: "1M", conviction: 5, catalyst: "fundamental", position: "holding" },
      },
      {
        hoursAgo: 5, content: "Rebalanced the international allocation today — VXUS at 25% target. Developed markets cheap relative to US on every multiple, and dollar headwinds easing. Multi-decade hold.",
        analysis: { ticker: "VXUS", direction: "bullish", timeframe: "1M", conviction: 4, catalyst: "macro", position: "holding" },
      },
      {
        hoursAgo: 1, content: "BND yield finally compelling at 4.6% SEC yield. Adding to the bond sleeve — 60/40 portfolios about to start working again after a brutal three-year stretch.",
        analysis: { ticker: "BND", direction: "bullish", timeframe: "1M", conviction: 3, catalyst: "macro", position: "entered" },
      },
    ],
  },
]

async function main() {
  console.log("Seeding demo trade ideas...")

  const usernames = IDEAS.map((q) => q.username)
  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  })
  const usernameToId = Object.fromEntries(users.map((u) => [u.username, u.id]))

  // Wipe prior trade-idea posts authored by these demo users so re-running
  // doesn't pile up duplicates. Plain text posts (no `analysis` field) are
  // intentionally left alone — those come from seed-demo.js.
  const userIds = users.map((u) => u.id)
  if (userIds.length) {
    const deleted = await db.post.deleteMany({
      where: {
        authorId: { in: userIds },
        NOT: [{ analysis: { equals: null } }],
      },
    })
    console.log(`  Cleared ${deleted.count} prior trade-idea posts.`)
  }

  const now = Date.now()
  let created = 0
  for (const queue of IDEAS) {
    const authorId = usernameToId[queue.username]
    if (!authorId) {
      console.warn(`  User ${queue.username} not found — skipping`)
      continue
    }
    for (const p of queue.posts) {
      const createdAt = new Date(now - p.hoursAgo * 60 * 60 * 1000)
      await db.post.create({
        data: {
          content: p.content,
          authorId,
          analysis: p.analysis,
          createdAt,
          updatedAt: createdAt,
        },
      })
      created++
    }
    console.log(`  ✓ @${queue.username}: ${queue.posts.length} trade ideas`)
  }

  console.log(`\nDone — ${created} trade-idea posts across ${IDEAS.length} users.`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
