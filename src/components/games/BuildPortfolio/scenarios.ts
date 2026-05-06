export type AssetClass = "stocks" | "bonds" | "gold" | "oil" | "cash"

export const ASSETS: { key: AssetClass; label: string; color: string; icon: string }[] = [
  { key: "stocks", label: "Stocks (S&P 500)", color: "#10b981", icon: "📈" },
  { key: "bonds",  label: "Bonds (Long Treasuries)", color: "#3b82f6", icon: "🏦" },
  { key: "gold",   label: "Gold", color: "#fbbf24", icon: "🪙" },
  { key: "oil",    label: "Oil (Brent)", color: "#a855f7", icon: "🛢️" },
  { key: "cash",   label: "Cash (USD)", color: "#9ca3af", icon: "💵" },
]

export type Returns = Record<AssetClass, number>

export interface PortfolioScenario {
  id: string
  date: string
  headline: string
  story: string
  resolutionWindow: string
  returns: Returns
  explanation: string
  lesson: string
  /** Hindsight-optimal allocation in %. For coaching, not for gameplay scoring. */
  optimal: Returns
}

export const PORTFOLIO_SCENARIOS: PortfolioScenario[] = [
  {
    id: "russia-ukraine-2022",
    date: "February 24, 2022",
    headline: "Russia launches full-scale invasion of Ukraine",
    story:
      "The largest land war in Europe since 1945 has begun. Russia is the world's #2 oil exporter and supplies 40% of Europe's natural gas. Western sanctions are being drafted as we speak.",
    resolutionWindow: "next 2 weeks",
    returns: { stocks: -2, bonds: -3, gold: 6, oil: 36, cash: 0 },
    explanation:
      "Brent crude exploded from ~$94 to ~$128 as sanctions and self-sanctioning by traders cut Russian barrels off the market. Gold rallied on safe-haven flows. Bonds fell because supply shocks are inflationary — yields rose. Stocks dipped briefly but recovered.",
    lesson:
      "Geopolitical supply shocks are bullish for commodities and inflation-hedges, bearish for bonds (because rates have to rise to fight inflation), and roughly neutral for stocks if the conflict doesn't directly hit corporate earnings. A pure stock or bond portfolio underperformed; any oil or gold exposure paid off. This is why diversification across asset classes — not just within one — matters.",
    optimal: { stocks: 0, bonds: 0, gold: 30, oil: 70, cash: 0 },
  },
  {
    id: "lehman-2008",
    date: "September 15, 2008",
    headline: "Lehman Brothers files for Chapter 11 — largest US bankruptcy ever",
    story:
      "After Bear Stearns was rescued in March, Lehman Brothers has just filed for bankruptcy. Counterparties are scrambling, AIG looks next, and the Fed is in emergency meetings. Credit markets are seizing up.",
    resolutionWindow: "next 4 weeks",
    returns: { stocks: -28, bonds: 9, gold: 3, oil: -32, cash: 0 },
    explanation:
      "The S&P fell 28% over four weeks as the credit freeze cascaded into the real economy. Long Treasuries rallied 9% on a flight-to-safety as the Fed slashed rates. Oil collapsed 32% on demand-destruction fears. Gold rose modestly — it was actually sold initially for liquidity, then recovered.",
    lesson:
      "In a true credit/banking crisis, government bonds and cash are the only winners. Stocks crash because earnings collapse. Commodities crash because the economy stops. Even gold can be sold initially as investors raise cash to meet margin calls. The classic crisis playbook: own duration (long bonds) and hold cash. Avoid leverage.",
    optimal: { stocks: 0, bonds: 70, gold: 10, oil: 0, cash: 20 },
  },
  {
    id: "covid-pandemic-2020",
    date: "March 11, 2020",
    headline: "WHO declares COVID-19 a pandemic; lockdowns spreading",
    story:
      "Italy is in full lockdown. Markets just had their worst day since 1987. The NBA suspended its season last night. Trump banned travel from Europe. There is no vaccine and no plan.",
    resolutionWindow: "next 2 weeks",
    returns: { stocks: -22, bonds: 2, gold: -10, oil: -50, cash: 0 },
    explanation:
      "The S&P fell 22% in two weeks. Oil collapsed 50% as a Saudi-Russia price war hit on top of demand destruction. Gold actually FELL 10% — counterintuitive — because investors were forced to sell anything liquid to cover margin calls and meet redemptions. Bonds barely held positive due to the same liquidity crunch.",
    lesson:
      "In a true liquidity crisis (everyone running for cash at once), EVERYTHING gets sold — even traditional safe havens like gold. The only winner is the US dollar itself, because debts and margin calls are denominated in dollars. The lesson is severe: 'safe haven' assets are only safe in normal market conditions. In a 2008 or 2020-style panic, only cash is truly safe. The Fed had to intervene massively to break the cycle.",
    optimal: { stocks: 0, bonds: 0, gold: 0, oil: 0, cash: 100 },
  },
  {
    id: "pfizer-vaccine-2020",
    date: "November 9, 2020",
    headline: "Pfizer announces 90%+ COVID vaccine efficacy",
    story:
      "A working vaccine. Markets had spent eight months priced for endless lockdowns; this changes everything. Reopening trades — airlines, hotels, banks, energy — are about to come alive.",
    resolutionWindow: "next 4 weeks",
    returns: { stocks: 5, bonds: -2, gold: -6, oil: 20, cash: 0 },
    explanation:
      "The S&P rose 5% over four weeks, with massive rotation underneath: airlines and energy ripped while tech sold off. Oil rallied 20% on demand-recovery hopes. Bonds fell 2% as yields rose on growth optimism. Gold dropped 6% as safe-haven trades unwound.",
    lesson:
      "When markets are pricing for a feared scenario and reality turns out better, you get a 'risk-on' rally. Stocks and pro-cyclical commodities (like oil) win. Defensive assets — gold, long bonds — bleed because nobody needs the safety anymore. The bigger the prior fear, the bigger the relief move when good news arrives.",
    optimal: { stocks: 50, bonds: 0, gold: 0, oil: 50, cash: 0 },
  },
  {
    id: "powell-pivot-2022",
    date: "November 30, 2022",
    headline: "Powell signals Fed will slow rate hikes — \"time may be coming\"",
    story:
      "After eight months of aggressive 75bp hikes that crushed every asset class, Chair Powell just told the Brookings Institution that smaller rate increases may begin as soon as December. Markets are jumping.",
    resolutionWindow: "next 2 weeks",
    returns: { stocks: 5, bonds: 6, gold: 5, oil: -3, cash: 0 },
    explanation:
      "Stocks, bonds, and gold all rallied 5–6% as yields fell sharply. Oil drifted lower because slower rate hikes meant slower growth ahead. Cash, which had been the only winner all year, finally underperformed.",
    lesson:
      "When central banks signal a dovish pivot, ALL financial assets tend to rally together — this is called an 'everything rally'. Falling interest rates lift the present value of every future cash flow, so stocks, bonds, and gold all benefit. Cash and oil lag because rate cuts mean growth is slowing. The lesson: monetary policy direction matters more than any single economic data point. Watch the Fed.",
    optimal: { stocks: 35, bonds: 35, gold: 30, oil: 0, cash: 0 },
  },
  {
    id: "svb-collapse-2023",
    date: "March 10, 2023",
    headline: "Silicon Valley Bank fails — second-largest US bank collapse ever",
    story:
      "SVB had a $1.8B loss on its bond portfolio, triggered a deposit run, and collapsed in 48 hours. Signature Bank looks next. The Fed and Treasury are working through the weekend on a backstop. Regional bank stocks are limit-down.",
    resolutionWindow: "next 2 weeks",
    returns: { stocks: -1, bonds: 5, gold: 9, oil: -10, cash: 0 },
    explanation:
      "Regional bank stocks crashed but the S&P 500 held up surprisingly well (–1%) because tech rallied as bond yields plunged. Long bonds rallied 5% on flight-to-safety AND on bets the Fed would have to cut rates. Gold soared 9% — both safe haven AND rate-cut beneficiary. Oil fell 10% on banking-contagion / recession fears.",
    lesson:
      "A regional banking crisis is mini-2008, but with two key differences: the Fed acted fast (creating the BTFP lending facility within 48 hours) which limited stock damage, and gold benefited because investors bet the Fed would now have to cut rates. The lesson: not every crisis plays out the same way. The Fed's reaction function matters enormously. When central banks act fast, stocks can recover surprisingly quickly while bonds and gold lock in the gains from the panic.",
    optimal: { stocks: 0, bonds: 40, gold: 60, oil: 0, cash: 0 },
  },
]

/** Compute portfolio return % given allocation (in %) and asset returns (in %). */
export function portfolioReturn(allocation: Returns, returns: Returns): number {
  let total = 0
  for (const k of Object.keys(allocation) as AssetClass[]) {
    total += (allocation[k] / 100) * returns[k]
  }
  return total
}

/** Sum of allocation values — should equal 100. */
export function allocationTotal(a: Returns): number {
  return a.stocks + a.bonds + a.gold + a.oil + a.cash
}

export const ZERO_ALLOCATION: Returns = {
  stocks: 0,
  bonds: 0,
  gold: 0,
  oil: 0,
  cash: 0,
}

export const PRESETS: { id: string; label: string; allocation: Returns }[] = [
  {
    id: "all-cash",
    label: "All Cash",
    allocation: { stocks: 0, bonds: 0, gold: 0, oil: 0, cash: 100 },
  },
  {
    id: "all-stocks",
    label: "All Stocks",
    allocation: { stocks: 100, bonds: 0, gold: 0, oil: 0, cash: 0 },
  },
  {
    id: "60-40",
    label: "Classic 60/40",
    allocation: { stocks: 60, bonds: 40, gold: 0, oil: 0, cash: 0 },
  },
  {
    id: "permanent",
    label: "Permanent (4-way)",
    allocation: { stocks: 25, bonds: 25, gold: 25, oil: 0, cash: 25 },
  },
  {
    id: "diversified",
    label: "All-Weather",
    allocation: { stocks: 30, bonds: 40, gold: 15, oil: 5, cash: 10 },
  },
]
