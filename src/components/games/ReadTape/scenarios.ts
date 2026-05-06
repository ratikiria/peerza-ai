export interface TapeEvent {
  t: number // ms from stream start
  side: "buy" | "sell"
  price: number
  size: number
}

export interface TapeRegime {
  /** Duration of this regime in ms */
  duration: number
  /** Probability a print is a buy (vs sell). 0.5 = balanced. */
  buyBias: number
  /** Events per second */
  intensity: number
  /** Average lot size (shares/contracts/units) */
  sizeAvg: number
  /** Random variance in lot size */
  sizeVariance: number
  /** Per-tick price drift in % when on the dominant side */
  drift: number
  /** Per-tick noise floor (random walk component) in % */
  noise: number
}

export interface ReadTapeScenario {
  id: string
  asset: string
  ticker: string
  unit: string
  date: string
  headline: string
  story: string
  preTickerPrice: number
  /** Total streaming duration computed from regimes; not user-set */
  regimes: TapeRegime[]
  outcome: "up" | "down"
  /** Magnitude of the move in the period AFTER the tape freezes */
  outcomeMovePct: number
  resolutionWindow: string
  keyDriver: string
  explanation: string
  lesson: string
}

// Deterministic 32-bit PRNG (mulberry32)
function rng(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function generateEvents(scenario: ReadTapeScenario, seed = 42): TapeEvent[] {
  const r = rng(seed)
  const events: TapeEvent[] = []
  let price = scenario.preTickerPrice
  let t = 0

  for (const reg of scenario.regimes) {
    const total = Math.max(1, Math.round((reg.intensity * reg.duration) / 1000))
    const gap = reg.duration / total
    for (let i = 0; i < total; i++) {
      t += gap * (0.6 + r() * 0.8) // jitter ±40%
      const side: "buy" | "sell" = r() < reg.buyBias ? "buy" : "sell"
      const size = Math.max(1, Math.round(reg.sizeAvg + (r() - 0.5) * reg.sizeVariance))
      const dirSign = side === "buy" ? 1 : -1
      const move = dirSign * reg.drift + (r() - 0.5) * reg.noise * 2
      price = Math.max(0.0001, price * (1 + move / 100))
      events.push({ t, side, price: roundPrice(price), size })
    }
  }
  return events
}

function roundPrice(p: number): number {
  if (p >= 1000) return Math.round(p)
  if (p >= 100) return Math.round(p * 100) / 100
  if (p >= 10) return Math.round(p * 100) / 100
  if (p >= 1) return Math.round(p * 1000) / 1000
  return Math.round(p * 100000) / 100000
}

export function totalDuration(scenario: ReadTapeScenario): number {
  return scenario.regimes.reduce((s, r) => s + r.duration, 0)
}

export const SCENARIOS: ReadTapeScenario[] = [
  {
    id: "gme-squeeze-open",
    asset: "GameStop",
    ticker: "GME",
    unit: "$",
    date: "January 27, 2021 — open",
    headline: "GME opens: short interest 140%, retail army primed",
    story:
      "GME closed at $148 yesterday. Premarket is already +50%. The cash open lands in 5 seconds. Most-shorted stock in the market. What does the tape say?",
    preTickerPrice: 220,
    regimes: [
      { duration: 12000, buyBias: 0.7, intensity: 4, sizeAvg: 180, sizeVariance: 600, drift: 0.06, noise: 0.03 },
      { duration: 18000, buyBias: 0.78, intensity: 6, sizeAvg: 320, sizeVariance: 1200, drift: 0.08, noise: 0.04 },
    ],
    outcome: "up",
    outcomeMovePct: 28,
    resolutionWindow: "next 60 minutes",
    keyDriver: "Forced buying — short squeeze",
    explanation:
      "GME ripped from $220 at the open to ~$347 within hours as shorts were forced to cover. The tape was unmistakable: aggressive buyers paying up at the offer, prints almost entirely green, size accelerating.",
    lesson:
      "When buyers consistently 'lift the offer' (pay the ask price instead of waiting on the bid) and prints are dominated by green, the path of least resistance is up. The opposite tape — sellers 'hitting bids' — screams down. Pay attention to which side is the AGGRESSOR, not just which side is louder.",
  },
  {
    id: "lehman-monday-open",
    asset: "S&P 500 e-mini",
    ticker: "ES",
    unit: "pts",
    date: "September 15, 2008 — open",
    headline: "Lehman files Chapter 11 over the weekend",
    story:
      "The largest bankruptcy in US history just happened. Counterparties scrambling, AIG looks next. Futures gapped down overnight. The cash market opens in 5 seconds.",
    preTickerPrice: 1230,
    regimes: [
      { duration: 10000, buyBias: 0.32, intensity: 5, sizeAvg: 120, sizeVariance: 400, drift: 0.04, noise: 0.02 },
      { duration: 20000, buyBias: 0.25, intensity: 7, sizeAvg: 200, sizeVariance: 700, drift: 0.05, noise: 0.03 },
    ],
    outcome: "down",
    outcomeMovePct: 4.5,
    resolutionWindow: "rest of the session",
    keyDriver: "Sellers hitting bids, no defense",
    explanation:
      "S&P futures fell ~4.7% on the day. Sellers consistently hit the bid; bounces were sold. The tape printed mostly red with occasional pause-and-fade. Classic capitulation behavior.",
    lesson:
      "Watch for tape that has lots of red prints AND prints accelerate downward (size grows, gaps widen). That combination = forced sellers, not patient ones. When the bids keep getting taken out, get out of the way. Bounces in a tape this red are usually shorts covering, not real buyers.",
  },
  {
    id: "btc-2017-top",
    asset: "Bitcoin",
    ticker: "BTC",
    unit: "$",
    date: "December 17, 2017 — late evening",
    headline: "Bitcoin tops $19,000 — CME futures launch tomorrow",
    story:
      "BTC parabolic, up 1,800% YTD. Massive retail euphoria. CME futures launch in hours, giving Wall Street its first way to short. Watch the tape.",
    preTickerPrice: 19200,
    regimes: [
      { duration: 12000, buyBias: 0.55, intensity: 5, sizeAvg: 0.4, sizeVariance: 1.5, drift: 0.04, noise: 0.05 },
      { duration: 18000, buyBias: 0.42, intensity: 6, sizeAvg: 0.6, sizeVariance: 2.5, drift: 0.06, noise: 0.06 },
    ],
    outcome: "down",
    outcomeMovePct: 14,
    resolutionWindow: "next 24 hours",
    keyDriver: "Absorption — buyers can't push higher",
    explanation:
      "BTC printed a slight new high then started fading. Buyers were still active, but the price stopped going up — sellers were absorbing every bid. Within 24 hours BTC was down 14%; within 4 weeks, down 30%.",
    lesson:
      "When green prints keep coming but price stops going up, that's ABSORPTION — large sellers patiently filling buyers without moving the price. It's a textbook bearish signal at the top of a parabolic move. Pay attention to whether prints actually MOVE the price, not just to their color.",
  },
  {
    id: "pfizer-vaccine-open",
    asset: "S&P 500 e-mini",
    ticker: "ES",
    unit: "pts",
    date: "November 9, 2020 — open",
    headline: "Pfizer announces 90%+ vaccine efficacy at 6:45 AM",
    story:
      "Vaccine works. Markets had been priced for endless lockdowns. Reopening trades — airlines, banks, energy — are coming alive in premarket. The cash open is in 5 seconds.",
    preTickerPrice: 3550,
    regimes: [
      { duration: 14000, buyBias: 0.66, intensity: 4, sizeAvg: 90, sizeVariance: 250, drift: 0.025, noise: 0.02 },
      { duration: 16000, buyBias: 0.62, intensity: 5, sizeAvg: 120, sizeVariance: 350, drift: 0.025, noise: 0.025 },
    ],
    outcome: "up",
    outcomeMovePct: 1.6,
    resolutionWindow: "rest of the session",
    keyDriver: "Steady buying — calm strength",
    explanation:
      "S&P closed up ~1.2% on the day. The tape was steady green with reasonable size — not panicked, not gapping. Real strength looks calm: persistent buying, controlled drift higher, occasional sells absorbed without breaking trend.",
    lesson:
      "Real, sustainable buying looks BORING on the tape: steady green, modest size, smooth upward drift. Panic-buying (vertical, gap-up moves) often reverses. The lesson: 'controlled' green tape is usually more meaningful than 'explosive' green tape, because it shows real demand from large buyers, not retail FOMO.",
  },
  {
    id: "covid-circuit-breaker",
    asset: "S&P 500 e-mini",
    ticker: "ES",
    unit: "pts",
    date: "March 12, 2020 — open",
    headline: "Trump bans European travel; markets in panic",
    story:
      "Markets just had their worst day since 1987. Italy is in full lockdown. Limit-down futures triggered the circuit breaker overnight. Cash market opens in 5 seconds.",
    preTickerPrice: 2620,
    regimes: [
      { duration: 8000, buyBias: 0.28, intensity: 6, sizeAvg: 200, sizeVariance: 700, drift: 0.06, noise: 0.04 },
      { duration: 22000, buyBias: 0.2, intensity: 8, sizeAvg: 300, sizeVariance: 1100, drift: 0.08, noise: 0.05 },
    ],
    outcome: "down",
    outcomeMovePct: 9.5,
    resolutionWindow: "rest of the session",
    keyDriver: "Panic selling — no bid",
    explanation:
      "S&P fell 9.5% — the worst single-day decline since 1987. The tape was relentlessly red with cascading size; bids kept disappearing. The market hit the 7% circuit breaker within 5 minutes of the open.",
    lesson:
      "Panic tape has a very specific signature: heavy red prints with growing size, accelerating downward, with frequent gaps as bids vanish. The fact that a circuit breaker hit within minutes told you everything — when the market structure itself is failing, you don't try to catch the falling knife. Step aside.",
  },
]
