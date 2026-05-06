export interface PricePoint {
  t: string
  p: number
}

export interface Scenario {
  id: string
  asset: string
  ticker: string
  unit: string
  date: string
  headline: string
  story: string
  prePoints: PricePoint[]
  postPoints: PricePoint[]
  resolutionWindow: string
  explanation: string
  keyDriver: string
  lesson: string
}

export function pctChange(s: Scenario): number {
  const a = s.prePoints[s.prePoints.length - 1].p
  const b = s.postPoints[s.postPoints.length - 1].p
  return ((b - a) / a) * 100
}

// All scenarios are based on real historical events with approximated daily closes.
export const SCENARIOS: Scenario[] = [
  {
    id: "russia-ukraine-brent",
    asset: "Brent Crude Oil",
    ticker: "BRENT",
    unit: "$/bbl",
    date: "February 24, 2022",
    headline: "Russia launches full-scale invasion of Ukraine",
    story:
      "Tanks and troops cross into Ukraine in the largest European land war since WWII. Russia is the world's #2 oil exporter and the dominant gas supplier to Europe. Western capitals are drafting emergency sanctions packages overnight.",
    prePoints: [
      { t: "Jan 24", p: 88.5 }, { t: "Jan 25", p: 89.2 }, { t: "Jan 26", p: 89.8 },
      { t: "Jan 27", p: 89.3 }, { t: "Jan 28", p: 90.0 }, { t: "Jan 31", p: 89.3 },
      { t: "Feb 01", p: 89.2 }, { t: "Feb 02", p: 89.5 }, { t: "Feb 03", p: 91.1 },
      { t: "Feb 04", p: 93.3 }, { t: "Feb 07", p: 92.7 }, { t: "Feb 08", p: 90.8 },
      { t: "Feb 09", p: 91.5 }, { t: "Feb 10", p: 91.4 }, { t: "Feb 11", p: 94.4 },
      { t: "Feb 14", p: 96.5 }, { t: "Feb 15", p: 93.3 }, { t: "Feb 16", p: 94.8 },
      { t: "Feb 17", p: 92.9 }, { t: "Feb 18", p: 93.5 }, { t: "Feb 21", p: 95.4 },
      { t: "Feb 22", p: 96.8 }, { t: "Feb 23", p: 94.1 },
    ],
    postPoints: [
      { t: "Feb 24", p: 99.1 }, { t: "Feb 25", p: 97.9 }, { t: "Feb 28", p: 100.9 },
      { t: "Mar 01", p: 105.0 }, { t: "Mar 02", p: 113.0 }, { t: "Mar 03", p: 110.5 },
      { t: "Mar 04", p: 118.1 }, { t: "Mar 07", p: 123.2 }, { t: "Mar 08", p: 127.9 },
    ],
    resolutionWindow: "next 2 weeks",
    explanation:
      "Brent surged from ~$94 to nearly $128 within two weeks as the EU and US announced sweeping sanctions and self-sanctioning by traders cut Russian barrels off much of the global market.",
    keyDriver: "Supply shock + geopolitics",
    lesson:
      "When a major oil-producing country goes to war, traders price in expected supply disruption immediately — even before any actual barrels stop flowing. This is called a 'geopolitical risk premium'. Russia is the world's #2 oil exporter, so sanctions on its barrels create scarcity, and scarcity = higher prices. The classic beginner mistake is to think 'I'll wait and see what happens'. Markets move on expectation, not confirmation. By the time the news is confirmed, the move has already happened.",
  },
  {
    id: "brexit-gbp",
    asset: "British Pound (GBP/USD)",
    ticker: "GBPUSD",
    unit: "$",
    date: "June 23, 2016",
    headline: "UK referendum on EU membership: polls just closed",
    story:
      "Britons have voted on whether to leave the European Union. Polls and bookmakers have leaned Remain all evening, and cable has rallied to a 2016 high. First constituency results are about to come in.",
    prePoints: [
      { t: "May 24", p: 1.4640 }, { t: "May 25", p: 1.4632 }, { t: "May 26", p: 1.4598 },
      { t: "May 27", p: 1.4615 }, { t: "May 31", p: 1.4480 }, { t: "Jun 01", p: 1.4504 },
      { t: "Jun 02", p: 1.4452 }, { t: "Jun 03", p: 1.4515 }, { t: "Jun 06", p: 1.4480 },
      { t: "Jun 07", p: 1.4520 }, { t: "Jun 08", p: 1.4502 }, { t: "Jun 09", p: 1.4435 },
      { t: "Jun 10", p: 1.4250 }, { t: "Jun 13", p: 1.4193 }, { t: "Jun 14", p: 1.4205 },
      { t: "Jun 15", p: 1.4220 }, { t: "Jun 16", p: 1.4360 }, { t: "Jun 17", p: 1.4360 },
      { t: "Jun 20", p: 1.4694 }, { t: "Jun 21", p: 1.4711 }, { t: "Jun 22", p: 1.4670 },
      { t: "Jun 23", p: 1.4877 },
    ],
    postPoints: [
      { t: "Jun 24", p: 1.3680 }, { t: "Jun 27", p: 1.3232 }, { t: "Jun 28", p: 1.3320 },
      { t: "Jun 29", p: 1.3429 }, { t: "Jun 30", p: 1.3258 },
    ],
    resolutionWindow: "next week",
    explanation:
      "Leave won 52–48. Cable fell from $1.49 to a 31-year low of $1.32 — the largest one-day move in pound history. The 'expected Remain' rally before the vote made the move even more violent.",
    keyDriver: "Currency repricing on political shock",
    lesson:
      "A currency reflects its country's expected economic future. Brexit meant years of trade uncertainty, lower growth, and lower interest rates — all of which weaken a currency. The bigger lesson here is about *expectations*: the market had priced in 'Remain wins' all evening, so when Leave actually won, traders had to reprice the entire scenario at once. The bigger the gap between what was expected and what happened, the bigger the move. This is why surprise outcomes (vs. consensus) cause violent moves.",
  },
  {
    id: "lehman-spx",
    asset: "S&P 500",
    ticker: "SPX",
    unit: "pts",
    date: "September 12, 2008",
    headline: "Lehman Brothers seeks buyer; weekend bankruptcy looms",
    story:
      "After Bear Stearns was rescued in March, Lehman Brothers is now on the brink. Talks with Bank of America and Barclays have stalled. The Treasury says no taxpayer money will be used. Markets close Friday with Lehman trading at $3.65.",
    prePoints: [
      { t: "Aug 12", p: 1289 }, { t: "Aug 13", p: 1285 }, { t: "Aug 14", p: 1292 },
      { t: "Aug 15", p: 1298 }, { t: "Aug 18", p: 1278 }, { t: "Aug 19", p: 1266 },
      { t: "Aug 20", p: 1278 }, { t: "Aug 21", p: 1278 }, { t: "Aug 22", p: 1292 },
      { t: "Aug 25", p: 1267 }, { t: "Aug 26", p: 1271 }, { t: "Aug 27", p: 1281 },
      { t: "Aug 28", p: 1300 }, { t: "Aug 29", p: 1282 }, { t: "Sep 02", p: 1278 },
      { t: "Sep 03", p: 1275 }, { t: "Sep 04", p: 1236 }, { t: "Sep 05", p: 1242 },
      { t: "Sep 08", p: 1267 }, { t: "Sep 09", p: 1224 }, { t: "Sep 10", p: 1232 },
      { t: "Sep 11", p: 1249 }, { t: "Sep 12", p: 1252 },
    ],
    postPoints: [
      { t: "Sep 15", p: 1192 }, { t: "Sep 16", p: 1213 }, { t: "Sep 17", p: 1156 },
      { t: "Sep 18", p: 1206 }, { t: "Sep 19", p: 1255 }, { t: "Sep 22", p: 1207 },
      { t: "Sep 23", p: 1188 }, { t: "Sep 24", p: 1185 }, { t: "Sep 29", p: 1106 },
      { t: "Oct 02", p: 1114 }, { t: "Oct 06", p: 1056 }, { t: "Oct 07", p: 996 },
      { t: "Oct 09", p: 909 }, { t: "Oct 10", p: 899 },
    ],
    resolutionWindow: "next 4 weeks",
    explanation:
      "Lehman filed Chapter 11 on Monday — the largest bankruptcy in US history. AIG was bailed out the next day. The S&P fell ~28% over the next four weeks as the credit-market freeze cascaded into the global financial crisis.",
    keyDriver: "Systemic crisis + credit freeze",
    lesson:
      "When a major bank fails, it doesn't just hurt that bank's shareholders — it scares everyone who lent to it, traded with it, or relied on it. Counterparty trust evaporates. Banks stop lending to each other, then to companies, then to consumers. Without credit, the economy chokes, so corporate earnings collapse, and stocks follow. In a systemic banking crisis the rule is simple: sell first, ask questions later. The S&P kept falling for another 5 months before bottoming in March 2009 down 57% from its peak.",
  },
  {
    id: "pfizer-vaccine-spx",
    asset: "S&P 500",
    ticker: "SPX",
    unit: "pts",
    date: "November 6, 2020",
    headline: "Election uncertainty; vaccine readouts pending",
    story:
      "Election week is wrapping up with Biden ahead but no winner declared. The S&P has rallied through the uncertainty. Pfizer is expected to announce Phase 3 efficacy results from its mRNA COVID vaccine on Monday morning.",
    prePoints: [
      { t: "Oct 07", p: 3419 }, { t: "Oct 08", p: 3447 }, { t: "Oct 09", p: 3477 },
      { t: "Oct 12", p: 3534 }, { t: "Oct 13", p: 3511 }, { t: "Oct 14", p: 3489 },
      { t: "Oct 15", p: 3483 }, { t: "Oct 16", p: 3483 }, { t: "Oct 19", p: 3426 },
      { t: "Oct 20", p: 3443 }, { t: "Oct 21", p: 3435 }, { t: "Oct 22", p: 3453 },
      { t: "Oct 23", p: 3465 }, { t: "Oct 26", p: 3400 }, { t: "Oct 27", p: 3390 },
      { t: "Oct 28", p: 3271 }, { t: "Oct 29", p: 3310 }, { t: "Oct 30", p: 3270 },
      { t: "Nov 02", p: 3310 }, { t: "Nov 03", p: 3369 }, { t: "Nov 04", p: 3443 },
      { t: "Nov 05", p: 3510 }, { t: "Nov 06", p: 3509 },
    ],
    postPoints: [
      { t: "Nov 09", p: 3550 }, { t: "Nov 10", p: 3545 }, { t: "Nov 11", p: 3573 },
      { t: "Nov 12", p: 3537 }, { t: "Nov 13", p: 3585 }, { t: "Nov 16", p: 3626 },
      { t: "Nov 17", p: 3609 }, { t: "Nov 18", p: 3567 }, { t: "Nov 19", p: 3581 },
      { t: "Nov 20", p: 3557 }, { t: "Nov 23", p: 3577 }, { t: "Nov 24", p: 3635 },
      { t: "Nov 25", p: 3629 }, { t: "Nov 27", p: 3638 }, { t: "Nov 30", p: 3621 },
      { t: "Dec 01", p: 3662 }, { t: "Dec 02", p: 3669 }, { t: "Dec 03", p: 3667 },
      { t: "Dec 04", p: 3699 },
    ],
    resolutionWindow: "next 4 weeks",
    explanation:
      "Pfizer announced 90%+ vaccine efficacy on November 9, sparking a rotation rally into reopening trades. The S&P drifted up ~5% over the next four weeks as the vaccine news, election clarity, and Fed liquidity converged.",
    keyDriver: "Macro relief + reopening trade",
    lesson:
      "Markets had spent eight months pricing in a long pandemic. A 90%+ effective vaccine meant the world was reopening sooner than feared, so stocks rallied — particularly airlines, hotels, banks, and other 'reopening' names. The headline S&P gain (+5%) was modest only because tech (Zoom, Netflix, etc.) sold off as the rotation flipped. The broader lesson: when markets are pricing for a feared scenario and reality turns out better, you get a 'relief rally'. Even a small piece of good news can drive a big move when sentiment was deeply negative.",
  },
  {
    id: "gme-reddit-squeeze",
    asset: "GameStop",
    ticker: "GME",
    unit: "$",
    date: "January 25, 2021",
    headline: "r/wallstreetbets piles into GME against Melvin Capital's short",
    story:
      "GME has tripled in two weeks as retail traders on Reddit target hedge funds short the stock. Melvin Capital is reportedly down billions. Citron Research's Andrew Left dropped his short call last week. The stock just closed at $76.79 on heavy volume.",
    prePoints: [
      { t: "Dec 24", p: 20.15 }, { t: "Dec 28", p: 17.69 }, { t: "Dec 29", p: 17.74 },
      { t: "Dec 30", p: 17.49 }, { t: "Dec 31", p: 18.84 }, { t: "Jan 04", p: 17.25 },
      { t: "Jan 05", p: 17.37 }, { t: "Jan 06", p: 18.36 }, { t: "Jan 07", p: 18.08 },
      { t: "Jan 08", p: 17.69 }, { t: "Jan 11", p: 19.94 }, { t: "Jan 12", p: 19.95 },
      { t: "Jan 13", p: 31.40 }, { t: "Jan 14", p: 39.91 }, { t: "Jan 15", p: 35.50 },
      { t: "Jan 19", p: 39.36 }, { t: "Jan 20", p: 39.12 }, { t: "Jan 21", p: 43.03 },
      { t: "Jan 22", p: 65.01 }, { t: "Jan 25", p: 76.79 },
    ],
    postPoints: [
      { t: "Jan 26", p: 147.98 },
    ],
    resolutionWindow: "next trading day",
    explanation:
      "GME nearly doubled to $147.98 on January 26 as a textbook short squeeze ignited. It hit an intraday high of $483 two days later before Robinhood restricted buying — but the next-day close alone was +93%.",
    keyDriver: "Short squeeze (forced buying)",
    lesson:
      "A 'short' is a bet that a stock will fall — the trader borrows shares, sells them, and plans to buy them back cheaper later. If the stock rises instead, those shorts are sitting on losses, and at some point they're forced to buy back the shares to cap their losses. That forced buying pushes the price up further, forcing more shorts to cover, and so on — a feedback loop called a short squeeze. GME had over 140% of its float shorted (more shares shorted than actually exist), so when retail traders coordinated buying, the squeeze went vertical. The lesson: heavily shorted stocks can melt up violently when the wrong catalyst hits. Always check short interest before betting against a beaten-down stock.",
  },
  {
    id: "btc-2017-peak",
    asset: "Bitcoin",
    ticker: "BTC",
    unit: "$",
    date: "December 17, 2017",
    headline: "Bitcoin tops $19,000 — CME futures launch tomorrow",
    story:
      "Bitcoin has gone parabolic, up roughly 1,800% year-to-date. Mainstream media is wall-to-wall crypto. CME Group launches BTC futures Monday, giving Wall Street a first-ever way to short the asset. Retail FOMO is at fever pitch.",
    prePoints: [
      { t: "Nov 17", p: 7855 }, { t: "Nov 19", p: 7775 }, { t: "Nov 21", p: 8254 },
      { t: "Nov 24", p: 8650 }, { t: "Nov 27", p: 9351 }, { t: "Nov 29", p: 9879 },
      { t: "Dec 01", p: 10859 }, { t: "Dec 04", p: 11617 }, { t: "Dec 06", p: 13400 },
      { t: "Dec 07", p: 16500 }, { t: "Dec 08", p: 17900 }, { t: "Dec 10", p: 15000 },
      { t: "Dec 11", p: 16670 }, { t: "Dec 12", p: 17427 }, { t: "Dec 13", p: 16545 },
      { t: "Dec 14", p: 16700 }, { t: "Dec 15", p: 17776 }, { t: "Dec 16", p: 19497 },
      { t: "Dec 17", p: 19140 },
    ],
    postPoints: [
      { t: "Dec 18", p: 18940 }, { t: "Dec 20", p: 17770 }, { t: "Dec 22", p: 13800 },
      { t: "Dec 27", p: 15800 }, { t: "Dec 31", p: 13860 }, { t: "Jan 06", p: 17200 },
      { t: "Jan 10", p: 14600 }, { t: "Jan 14", p: 13400 },
    ],
    resolutionWindow: "next 4 weeks",
    explanation:
      "December 17 was the all-time high. CME futures launched Monday and let institutions short BTC for the first time. Within four weeks Bitcoin was down ~30%, the start of an 80%+ bear market that ran through 2018.",
    keyDriver: "Speculative blow-off top",
    lesson:
      "When an asset goes near-vertical (BTC was up 1,800% in 2017), most of the buying is from late-arriving speculators who 'don't want to miss out' — not long-term holders. That kind of buying is fragile: if the price dips, they panic-sell. CME futures launching the next day was the catalyst. Before it, you couldn't easily short Bitcoin from a regulated venue. After it, Wall Street suddenly could. Vertical moves usually end in vertical drops because the buyers were leveraged or impatient. The big beginner lesson: parabolic charts and 'this time is different' headlines are warning signs, not buy signals.",
  },
]
