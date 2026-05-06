// Seeds three demo brands + one approved ad each so the FEED, SIDEBAR and
// WORKSPACE placements all have something to show in dev. Run with:
//   node scripts/seed-ads.js
require("dotenv").config()
const { PrismaClient } = require("../src/generated/prisma/index.js")
const { PrismaPg } = require("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

function logoSvg(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="24" fill="${color}"/>
  <text x="60" y="74" text-anchor="middle" font-size="48" font-weight="900" fill="white" font-family="sans-serif">${label}</text>
</svg>`
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64")
}

function bannerSvg(headline, fromColor, toColor, emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${fromColor}"/>
      <stop offset="100%" stop-color="${toColor}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="420" fill="url(#g)"/>
  <text x="400" y="200" text-anchor="middle" font-size="140" font-family="serif">${emoji}</text>
  <text x="400" y="290" text-anchor="middle" font-size="38" font-weight="900" fill="white" font-family="sans-serif">${headline}</text>
</svg>`
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64")
}

const BRANDS = [
  {
    slug: "alpine-broker",
    name: "Alpine Broker",
    legalName: "Alpine Broker Ltd.",
    bio: "Commission-free brokerage for global stocks, ETFs and crypto.",
    country: "US",
    regulator: "FINRA",
    licenseNumber: "CRD-DEMO-1001",
    logo: logoSvg("AB", "#0ea5e9"),
    ad: {
      headline: "Trade global markets, $0 commission",
      body: "Stocks, ETFs and crypto on one screen. Open an account in 3 minutes — no minimum deposit, fractional shares from $1.",
      ctaLabel: "Open account",
      ctaUrl: "https://example.com/alpine",
      placements: ["FEED", "SIDEBAR"],
      topics: ["stocks", "crypto"],
      banner: bannerSvg("Trade global markets", "#0ea5e9", "#0369a1", "📈"),
      disclaimer: "Investing involves risk. You may lose more than you invest. Not financial advice.",
    },
  },
  {
    slug: "kappa-academy",
    name: "Kappa Academy",
    legalName: "Kappa Academy GmbH",
    bio: "Trader education — courses, webinars, and live sessions with mentors.",
    country: "DE",
    regulator: "Self-regulated",
    logo: logoSvg("KA", "#8b5cf6"),
    ad: {
      headline: "Master technicals in 14 days",
      body: "On-demand video course taught by working prop traders. Quizzes, live Q&A and a private community. 30-day money-back guarantee.",
      ctaLabel: "Start free lesson",
      ctaUrl: "https://example.com/kappa",
      placements: ["FEED", "SIDEBAR", "WORKSPACE"],
      topics: ["stocks", "forex", "options", "crypto"],
      banner: bannerSvg("Master technicals", "#8b5cf6", "#5b21b6", "📚"),
      disclaimer: "Educational content only. Not financial advice. Past performance does not guarantee future results.",
    },
  },
  {
    slug: "delta-tools",
    name: "Delta Tools",
    legalName: "Delta Tools Inc.",
    bio: "Pro-grade screeners and journaling for active traders.",
    country: "US",
    regulator: "Self-regulated",
    logo: logoSvg("Δ", "#10b981"),
    ad: {
      headline: "Journal every trade automatically",
      body: "Auto-import from 30+ brokers. Tag setups, see your edge by playbook, and find which mistakes cost you the most.",
      ctaLabel: "Try free for 14 days",
      ctaUrl: "https://example.com/delta",
      placements: ["WORKSPACE", "SIDEBAR"],
      topics: ["stocks", "options"],
      banner: bannerSvg("Journal every trade", "#10b981", "#047857", "📊"),
      disclaimer: "Tooling only — does not provide trade advice. Always do your own research.",
    },
  },
  {
    slug: "sigma-crypto",
    name: "Sigma Crypto",
    legalName: "Sigma Crypto Exchange LLC",
    bio: "Spot and futures crypto exchange with deep liquidity.",
    country: "US",
    regulator: "FinCEN MSB",
    licenseNumber: "MSB-DEMO-2002",
    logo: logoSvg("Σ", "#f59e0b"),
    ad: {
      headline: "0.05% maker — 0.10% taker",
      body: "Trade 200+ pairs with deep books and zero withdrawal fees on USDC. KYC in under 5 minutes for verified users.",
      ctaLabel: "Sign up",
      ctaUrl: "https://example.com/sigma",
      placements: ["FEED", "SIDEBAR"],
      topics: ["crypto"],
      banner: bannerSvg("0.05% maker fees", "#f59e0b", "#b45309", "₿"),
      disclaimer: "Crypto assets are highly volatile. You may lose your entire investment.",
    },
  },
  {
    slug: "iota-research",
    name: "Iota Research",
    legalName: "Iota Research Co.",
    bio: "Independent equity research from former buy-side analysts.",
    country: "GB",
    regulator: "FCA",
    licenseNumber: "FCA-DEMO-3003",
    logo: logoSvg("ι", "#ef4444"),
    ad: {
      headline: "Earnings previews — first 7 days free",
      body: "Pre-print earnings notes on the S&P 500. Catalysts, consensus vs. whisper, and historical reaction to surprises.",
      ctaLabel: "Read a sample",
      ctaUrl: "https://example.com/iota",
      placements: ["FEED", "WORKSPACE"],
      topics: ["stocks"],
      banner: bannerSvg("Earnings, decoded", "#ef4444", "#991b1b", "📰"),
      disclaimer: "Research only. Not a recommendation to buy or sell any security.",
    },
  },
  {
    slug: "omega-fx",
    name: "Omega FX",
    legalName: "Omega FX Markets Ltd.",
    bio: "Tight-spread FX broker with rebates for active accounts.",
    country: "AU",
    regulator: "ASIC",
    licenseNumber: "ASIC-DEMO-4004",
    logo: logoSvg("Ω", "#3b82f6"),
    ad: {
      headline: "EUR/USD from 0.1 pip",
      body: "ECN execution, no dealing desk, scalping welcome. Free VPS for accounts above $5K equity.",
      ctaLabel: "View spreads",
      ctaUrl: "https://example.com/omega",
      placements: ["FEED", "SIDEBAR", "WORKSPACE"],
      topics: ["forex"],
      banner: bannerSvg("FX from 0.1 pip", "#3b82f6", "#1e40af", "💱"),
      disclaimer: "CFDs are complex instruments. 78% of retail accounts lose money trading CFDs with this provider.",
    },
  },
  {
    slug: "theta-options",
    name: "Theta Options",
    legalName: "Theta Options Coaching LLC",
    bio: "Options strategies coaching for swing and income traders.",
    country: "US",
    regulator: "Self-regulated",
    logo: logoSvg("θ", "#a855f7"),
    ad: {
      headline: "Wheel strategy, step by step",
      body: "12-week cohort on cash-secured puts and covered calls. Position sizing, IV rank filters, and exit playbooks.",
      ctaLabel: "Reserve a seat",
      ctaUrl: "https://example.com/theta",
      placements: ["FEED", "WORKSPACE"],
      topics: ["options", "stocks"],
      banner: bannerSvg("The wheel, mastered", "#a855f7", "#6b21a8", "⚙️"),
      disclaimer: "Options are not suitable for all investors. Educational content only — not financial advice.",
    },
  },
  {
    slug: "lambda-news",
    name: "Lambda News",
    legalName: "Lambda Markets Media",
    bio: "Real-time market news with AI-summarized impact tags.",
    country: "US",
    regulator: "Self-regulated",
    logo: logoSvg("λ", "#06b6d4"),
    ad: {
      headline: "Be 30 seconds early on the news",
      body: "AI-tagged headlines (hawkish, dovish, M&A, guidance) push to your phone in under a second from the wire.",
      ctaLabel: "Try Pro free",
      ctaUrl: "https://example.com/lambda",
      placements: ["SIDEBAR", "WORKSPACE"],
      topics: ["stocks", "forex", "crypto"],
      banner: bannerSvg("News, in milliseconds", "#06b6d4", "#0e7490", "⚡"),
      disclaimer: "Information service only. No investment advice provided.",
    },
  },
  {
    slug: "rho-portfolio",
    name: "Rho Portfolio",
    legalName: "Rho Portfolio Analytics",
    bio: "Tax-aware portfolio analytics for self-directed investors.",
    country: "CA",
    regulator: "Self-regulated",
    logo: logoSvg("ρ", "#ec4899"),
    ad: {
      headline: "Tax-loss harvesting, automated",
      body: "Connect your brokerage and Rho surfaces wash-sale-safe loss harvest opportunities every Friday.",
      ctaLabel: "Run my analysis",
      ctaUrl: "https://example.com/rho",
      placements: ["FEED", "SIDEBAR"],
      topics: ["stocks"],
      banner: bannerSvg("Harvest losses, weekly", "#ec4899", "#9d174d", "🌾"),
      disclaimer: "Not tax advice. Consult a qualified tax professional for your situation.",
    },
  },
]

async function main() {
  // Find or create a demo owner — use the first user in the DB so seeds
  // never need to know the demo email.
  const owner = await db.user.findFirst({ orderBy: { createdAt: "asc" } })
  if (!owner) {
    console.error("No users in DB — run seed-demo.js first.")
    process.exit(1)
  }
  console.log(`Using owner: ${owner.email}`)

  for (const b of BRANDS) {
    const brand = await db.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        legalName: b.legalName,
        bio: b.bio,
        country: b.country,
        regulator: b.regulator,
        licenseNumber: b.licenseNumber,
        logoUrl: b.logo,
        verifiedAt: new Date(),
      },
      create: {
        ownerId: owner.id,
        slug: b.slug,
        name: b.name,
        legalName: b.legalName,
        bio: b.bio,
        country: b.country,
        regulator: b.regulator,
        licenseNumber: b.licenseNumber,
        logoUrl: b.logo,
        verifiedAt: new Date(),
      },
    })

    // One approved ad per brand. We don't have a natural unique key on Ad,
    // so we look for an existing ad with the same headline + brand.
    const existing = await db.ad.findFirst({
      where: { brandId: brand.id, headline: b.ad.headline },
    })
    const data = {
      brandId: brand.id,
      headline: b.ad.headline,
      body: b.ad.body,
      imageUrl: b.ad.banner,
      ctaLabel: b.ad.ctaLabel,
      ctaUrl: b.ad.ctaUrl,
      topics: b.ad.topics,
      placements: b.ad.placements,
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: "ai",
      disclaimer: b.ad.disclaimer,
    }
    if (existing) {
      await db.ad.update({ where: { id: existing.id }, data })
      console.log(`  Updated ad: ${b.name} — "${b.ad.headline}" [${b.ad.placements.join(", ")}]`)
    } else {
      await db.ad.create({ data })
      console.log(`  Created ad: ${b.name} — "${b.ad.headline}" [${b.ad.placements.join(", ")}]`)
    }
  }

  const total = await db.ad.count({ where: { status: "APPROVED" } })
  console.log(`\nDone — ${total} approved ad(s) total.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
