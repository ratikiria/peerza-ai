// Run with: node scripts/seed-demo.js
require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")
const bcrypt = require("bcryptjs")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const MAIN_USER = "rati123"

const USERS = [
  {
    name: "Alex Chen",
    username: "alexchen_fx",
    email: "alex@finsocial.dev",
    bio: "Forex & crypto trader. 7 years in the markets. Sharing setups and analysis daily. Risk management first 🎯",
    interests: ["Forex", "Crypto"],
    posts: [
      "EUR/USD looking very interesting right now. Key support at 1.0820 holding strong for the 3rd time this week. Watch for a bounce — I'm positioning long with tight SL below 1.0800. Risk/reward is solid at 1:3 here.",
      "BTC consolidating between 65k-68k for the past 5 days. This tight range usually precedes a big move. CME gap at 71k above us. My bias is bullish — accumulating on every dip below 66k. #Bitcoin #crypto",
      "Morning routine: check economic calendar, review overnight price action, mark key levels. Discipline beats prediction every single time. Markets reward patience.",
      "Just closed my GBP/JPY long from yesterday for +180 pips 🎉 Thesis played out perfectly — Bank of Japan maintaining yield curve control while BoE stays hawkish. Carry trade still alive and well. #Forex",
      "Thread on why most traders fail 👇\n1. They risk too much per trade\n2. They don't have a written trading plan\n3. They trade news events without understanding the market structure\n4. They revenge trade after losses\nFix these 4 things and you're already ahead of 80% of retail.",
    ],
  },
  {
    name: "Sarah Mitchell",
    username: "sarah_stocks",
    email: "sarah@finsocial.dev",
    bio: "Equity analyst by day, swing trader by night. CFA Level 2 candidate. Focused on tech and healthcare sectors 📊",
    interests: ["Stocks", "ETFs"],
    posts: [
      "NVDA earnings next week. Street expects $5.58 EPS. The stock has beaten estimates 12 quarters in a row. Data center revenue is the key metric — anything above $22B and we gap up hard. I'm holding through earnings.",
      "My watchlist for this week:\n• TSLA — earnings reaction settling, watching $185 break\n• AAPL — coiling up, supply chain improvements bullish\n• META — AI monetization just getting started\n• MSFT — Azure growth the key number\nWhat's on your watchlist?",
      "Portfolio update: Up 23% YTD. Top performers: NVDA (+89%), META (+61%), AMZN (+38%). Biggest drag: INTC (-12%). Trimming NVDA here at 900+ and rotating into beaten-down semis. Valuation matters eventually.",
      "ETF of the week: QQQ rebalancing adds more weight to NVDA and MSFT. If you want diversified tech exposure without stock picking, QQQ or VGT are solid. Low cost, liquid, tracks the sector cleanly.",
      "The market doesn't care about your feelings. It doesn't care that you've been holding for 6 months at a loss. Cut your losers early, let your winners run. Portfolio management is emotional management.",
    ],
  },
  {
    name: "Marcus Johnson",
    username: "marcus_trades",
    email: "marcus@finsocial.dev",
    bio: "Day trader | ES & NQ futures | 12 years experience | Teaching what actually works, not what sounds good on YouTube",
    interests: ["Stocks", "Options"],
    posts: [
      "ES futures gap fill from last week finally happened this morning. Been waiting 6 days for this. Gap trading is one of the most reliable strategies in index futures — market hates unfilled gaps. +24 points.",
      "Real talk: I had 4 losing days in a row this week. Down $3,200. Happens to everyone. The difference between profitable and unprofitable traders is not avoiding losses — it's managing them. Came back Friday +$5,800. Net positive. Stay consistent.",
      "Options flow alert: massive unusual activity in SPY — someone bought $2.1M in 460 puts expiring in 3 weeks. Smart money hedging? Or speculative bet on a pullback? Keeping an eye on this. #options #SPY",
      "Premarket routine every day at 6am:\n✅ Check overnight futures\n✅ Note key economic data releases\n✅ Mark yesterday's high/low/close\n✅ Identify first 30min range targets\n✅ Set alerts at key levels\nPreparation is everything.",
      "Your stop loss is not there to tell you when you're wrong. It's there to protect your capital so you can trade another day. Never move a stop further away. Only move it closer. Protect the account.",
    ],
  },
  {
    name: "Emma Williams",
    username: "emma_defi",
    email: "emma@finsocial.dev",
    bio: "DeFi researcher & yield farmer 🌾 Covering protocols, tokenomics and on-chain analytics. Building on Ethereum since 2019.",
    interests: ["Crypto"],
    posts: [
      "Aave v3 TVL just crossed $12B again. The protocol is generating $8M+ per day in fees. Compare that to most traditional banks. DeFi money legos are real and they're working. This is still early. #DeFi #Ethereum",
      "ETH supply is officially deflationary again post last week's high gas activity. 28,000 ETH burned in 7 days vs 15,000 issued. Net negative. The ultra sound money thesis is playing out exactly as predicted. #Ethereum",
      "Yield opportunities this week:\n• Curve 3pool: 4.2% APY\n• Aave USDC supply: 5.8% APY\n• Uniswap v3 ETH/USDC (tight range): ~12% APY\n• Pendle PT-stETH: 6.1% fixed APY\nAll sustainable, no ponzinomics. DYOR as always.",
      "People ask me which L2 wins. Honestly? All of them have a chance. Arbitrum for DeFi, Base for social/consumer, zkSync for payments, Polygon for enterprise. The future is multi-chain. Stop maximalism.",
      "The biggest mistake I made in DeFi: chasing 1000% APY farms without understanding the token emission schedule. Learned that lesson hard in 2021. Now I only farm if the yield source is real protocol revenue, not token inflation.",
    ],
  },
  {
    name: "David Park",
    username: "dparkfinance",
    email: "david@finsocial.dev",
    bio: "Macro investor | Gold bugs unite 🥇 | Commodities & hard assets | Inflation hedge specialist | 20yr market veteran",
    interests: ["Commodities", "ETFs"],
    posts: [
      "Gold breaking out to new all-time highs while nobody is paying attention. Central banks bought 1,037 tonnes last year — most since 1967. China, India, Russia quietly accumulating. The smart money knows what's coming. #Gold",
      "Inflation is NOT dead. It's resting. Core services inflation stuck at 4.5%. Housing costs still elevated. Healthcare rising. The Fed paused too early. Expect re-acceleration in H2. Hard assets will outperform. Position accordingly.",
      "Oil inventory draw of 8.3M barrels this week — way above estimates of 2M. OPEC+ cutting production. Geopolitical premium. WTI at $82 looks cheap to me. Energy sector is screaming buy at these valuations. XOM, CVX, COP.",
      "The dollar wrecking ball is coming back. DXY breakout above 105 = pain for EM currencies, commodities get a headwind, earnings translate weaker for multinationals. Hedge your USD exposure if you're international. Big macro shift in motion.",
      "Silver is the most undervalued asset in the world right now. Industrial demand at all-time highs (solar panels, EVs, electronics). Investment demand recovering. Supply constrained. Gold/Silver ratio at 80 — historically, silver plays catch-up violently when it goes.",
    ],
  },
  {
    name: "Olivia Brown",
    username: "olivia_quant",
    email: "olivia@finsocial.dev",
    bio: "Quant trader @ fintech startup | Python & R | Backtesting systematic strategies | Data-driven, no guesswork 🐍",
    interests: ["Stocks", "Options"],
    posts: [
      "Ran a backtest on mean-reversion strategy for S&P 500 components (2015-2024): Buy when RSI < 30, sell when RSI > 55. Sharpe ratio: 1.47. Max drawdown: -18%. Win rate: 68%. Outperformed buy-and-hold on risk-adjusted basis. Code dropping tomorrow.",
      "Hot take: 90% of retail trading 'strategies' are just curve-fitted noise. If your strategy only works on the specific assets and time period you tested it on, it's not a strategy — it's overfitting. Walk-forward testing is non-negotiable.",
      "Python snippet for fetching options chain data and calculating expected move:\n```\nimport yfinance as yf\nticker = yf.Ticker('SPY')\nchain = ticker.option_chain('2024-12-20')\n```\nExpected move = IV × √(DTE/365) × Price\nThe market's probability distribution in one formula.",
      "Vol surface is screaming something. 30-day IV on SPY sitting at 18 while realized vol is only 11. That's a huge premium. Either vol is about to spike, or there's a great opportunity selling options premium right now. I know which side I'm on.",
      "New strategy live in prod: pairs trading BTC vs ETH. Co-integration z-score at 2.3σ — entering the short ETH / long BTC position. Expected mean reversion within 5-7 days. Backtested Sharpe of 1.9. Let's see if live trading matches.",
    ],
  },
  {
    name: "James Rodriguez",
    username: "jrodriguez_fx",
    email: "james@finsocial.dev",
    bio: "Swing trader from Miami 🌴 | Crypto & stocks | Building generational wealth one trade at a time | No calls, just setups",
    interests: ["Crypto", "Stocks"],
    posts: [
      "SOL absolute beast this cycle. From $8 in 2023 to $180+ now. Network activity at all-time highs. Meme coin season on Solana pumped fees and user adoption. If you're sleeping on SOL you're missing one of the best ecosystems in crypto. #Solana",
      "Setup I'm watching: BTC weekly candle just printed a bullish engulfing on the 50 EMA. This exact pattern preceded the 2020 and 2023 rallies. Not financial advice but I'm not selling my spot position anytime soon. Next target: 75k.",
      "Mental note to self: The trades that feel scary are often the best ones. The trades that feel comfortable are often the worst. When everyone is bearish and you have a strong reason to be bullish — that's the edge.",
      "My crypto portfolio allocation:\n40% BTC\n25% ETH\n15% SOL\n10% altcoins (high risk)\n10% stablecoins (dry powder)\nThis isn't advice. It's my personal risk tolerance. Everyone's situation is different.",
      "Just hit my yearly profit target with 3 months to go. Locking in 60% of profits, letting the rest ride with a trailing stop. Always important to celebrate wins and protect gains. The market will always give you more opportunities.",
    ],
  },
  {
    name: "Sofia Laurent",
    username: "sofia_macro",
    email: "sofia@finsocial.dev",
    bio: "Paris-based macro strategist | Geopolitics × markets | Covering EUR, emerging markets & global capital flows 🇫🇷",
    interests: ["Forex", "Commodities"],
    posts: [
      "ECB is trapped. Inflation still above target but European economy clearly slowing. Germany in technical recession. They'll cut before the Fed — EUR weakness incoming. EUR/USD parity trade might be back on the table by Q3.",
      "Geopolitical risk premium is massively underpriced in European energy markets. Dependency on pipeline gas still not fully solved. Winter 2024 could create the same dynamics as 2022 — and markets are not priced for it. Watch natgas.",
      "Emerging market debt crisis quietly building. Dollar strength + high US rates = pain for USD-denominated EM debt. Brazil, Turkey, Egypt most vulnerable. Flight to safety will benefit USD and gold when this becomes front-page news.",
      "Visited London last week. Every hedge fund manager I spoke with is positioned for Japan policy normalization. BOJ yield curve control ending = massive yen repatriation from overseas assets. Could be the biggest macro trade of 2025.",
      "Hot take: The biggest risk to global markets isn't inflation, it's not rates — it's China. Property sector imploding, youth unemployment at 20%, export deflation spreading globally. Markets are not pricing a hard landing in China. They should be.",
    ],
  },
  {
    name: "Ryan Thompson",
    username: "ryan_theta",
    email: "ryan@finsocial.dev",
    bio: "Options premium seller | Theta gang OG 🎰 | Selling volatility since 2017 | Consistent income from the market every week",
    interests: ["Options", "Stocks"],
    posts: [
      "Theta gang update: Sold 45 DTE iron condors on SPY, RUT and QQQ this week. Collected $4,200 in premium. If markets stay range-bound, I keep it all. If we get a big move, my defined risk keeps the loss manageable. This is the way.",
      "The wheel strategy step by step:\n1. Sell cash-secured put on stock you WANT to own\n2. If assigned, you own shares at a discount\n3. Sell covered call above your cost basis\n4. Repeat until shares called away\n5. Collect premium the entire time\nSimple. Consistent. Boring. Profitable.",
      "IV rank on TSLA at 78% right now. That means implied vol is in the 78th percentile of its range over the past year. This is exactly when I sell premium — when IV is inflated. The mean reversion in volatility pays my bills.",
      "People say options are risky. They're right — if you buy them. Buying options means you need to be right on direction AND timing. Selling options means time is on your side. I let theta decay work for me every single day.",
      "Monthly income report: April premium collected: $8,340. Losses from tested positions: $2,100. Net: $6,240 in options income alone. Not including stock appreciation. 6 years of running this strategy and the math keeps working.",
    ],
  },
  {
    name: "Priya Sharma",
    username: "priya_invest",
    email: "priya@finsocial.dev",
    bio: "Financial educator 📚 | Making investing accessible for everyone | Long-term wealth building | Index funds > stock picking",
    interests: ["ETFs", "Stocks"],
    posts: [
      "You don't need to be a day trader to build wealth. $500/month into VTI (total market ETF) for 30 years at historical 10% average return = $986,000. No screens. No analysis. Just consistency and time. The boring path works.",
      "Everyone is talking about AI stocks. Meanwhile, buying VTI means you own NVDA, MSFT, AAPL, META, GOOGL automatically — plus 3,500 other companies. You get the winners without picking them. This is diversification done right.",
      "Compound interest example:\n$10,000 at age 25 → $452,000 at 65 (10% return)\n$10,000 at age 35 → $174,000 at 65\n$10,000 at age 45 → $67,000 at 65\nThe cost of waiting 10 years: $278,000 in lost wealth. Start yesterday.",
      "Biggest investing mistakes I see beginners make:\n❌ Trying to time the market\n❌ Watching their portfolio daily\n❌ Panic selling in downturns\n❌ Chasing hot stocks after the run\n✅ Buy index funds, hold, reinvest dividends, ignore the noise",
      "Tax-advantaged accounts first, always. 401k up to employer match (free money!), then max your Roth IRA ($7k/year), then HSA if eligible ($4,150). Only after maxing these should you invest in a taxable brokerage. Optimize the tax wrapper before the investment.",
    ],
  },
]

async function main() {
  console.log("🌱 Starting demo seed...\n")

  const mainUser = await db.user.findUnique({ where: { username: MAIN_USER } })
  if (!mainUser) {
    console.error(`❌ Main user '${MAIN_USER}' not found. Create it first.`)
    process.exit(1)
  }
  console.log(`✅ Found main user: @${mainUser.username}`)

  const passwordHash = await bcrypt.hash("demo1234", 10)
  const createdUsers = []

  for (const u of USERS) {
    // Delete existing to allow re-running the script
    const existing = await db.user.findUnique({ where: { username: u.username } })
    if (existing) {
      await db.user.delete({ where: { id: existing.id } })
    }

    const user = await db.user.create({
      data: {
        name: u.name,
        username: u.username,
        email: u.email,
        passwordHash,
        bio: u.bio,
        interests: u.interests,
        isPremium: Math.random() > 0.6,
      },
    })
    createdUsers.push(user)
    console.log(`👤 Created @${user.username}`)

    // Some posts get a financial chart image (roughly every 3rd post)
    const POST_IMAGES = [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=700&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=700&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=700&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=700&auto=format&fit=crop",
    ]

    for (let i = 0; i < u.posts.length; i++) {
      const hoursAgo = Math.floor(Math.random() * 48) + i * 2
      const imageUrl  = i % 3 === 0 ? POST_IMAGES[Math.floor(Math.random() * POST_IMAGES.length)] : null
      await db.post.create({
        data: {
          content: u.posts[i],
          imageUrl,
          authorId: user.id,
          createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
        },
      })
    }
    console.log(`   📝 ${u.posts.length} posts created`)
  }

  // Mutual follows: main user ↔ all demo users
  for (const user of createdUsers) {
    // Main follows demo user
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: mainUser.id, followingId: user.id } },
      create: { followerId: mainUser.id, followingId: user.id },
      update: {},
    })
    // Demo user follows main
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: mainUser.id } },
      create: { followerId: user.id, followingId: mainUser.id },
      update: {},
    })
  }
  console.log(`\n✅ Mutual follows set up (${createdUsers.length} × 2)`)

  // Cross-likes: demo users like some of main user's posts
  const mainPosts = await db.post.findMany({ where: { authorId: mainUser.id } })
  for (const post of mainPosts) {
    const likers = createdUsers.sort(() => Math.random() - 0.5).slice(0, 4)
    for (const liker of likers) {
      await db.like.upsert({
        where: { postId_userId: { postId: post.id, userId: liker.id } },
        create: { postId: post.id, userId: liker.id },
        update: {},
      })
    }
  }

  // Demo users like each other's posts
  const allDemoPosts = await db.post.findMany({
    where: { authorId: { in: createdUsers.map((u) => u.id) } },
  })
  for (const post of allDemoPosts) {
    const likers = createdUsers
      .filter((u) => u.id !== post.authorId)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 5))
    for (const liker of likers) {
      await db.like.upsert({
        where: { postId_userId: { postId: post.id, userId: liker.id } },
        create: { postId: post.id, userId: liker.id },
        update: {},
      })
    }
  }
  console.log("❤️  Likes distributed across posts")

  console.log("\n🎉 Seed complete!")
  console.log(`   ${createdUsers.length} demo users created`)
  console.log(`   ${createdUsers.length * 5} posts created`)
  console.log("   All demo user passwords: demo1234")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
