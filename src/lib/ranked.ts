// Ranked Calls — the shared rulebook. Imported by the composer (live preview)
// and the server (authoritative scoring), so both always agree.
//
// A ranked call is a directional trade idea with a deadline. It resolves as
// TARGET_HIT if price touches the target before the deadline, EXPIRED if not,
// or VOID when market data can't settle it fairly (no points either way).

export const RANKED_TFS = ["15M", "30M", "1H", "4H", "1D", "1W", "1M", "3M", "6M", "9M", "1Y"] as const
export type RankedTf = (typeof RANKED_TFS)[number]

export type TraderStyle = "scalper" | "day" | "swing" | "position" | "investor"
export type AssetKind = "crypto" | "market" // market = has sessions + weekends (stocks, forex, futures)

interface TfDef {
  style: TraderStyle
  minutes?: number      // intraday windows, wall clock
  tradingDays?: number  // 1D / 1W — skip weekends for session markets
  months?: number       // calendar months
}

export const TF_DEFS: Record<RankedTf, TfDef> = {
  "15M": { style: "scalper", minutes: 15 },
  "30M": { style: "scalper", minutes: 30 },
  "1H":  { style: "day", minutes: 60 },
  "4H":  { style: "day", minutes: 240 },
  "1D":  { style: "day", tradingDays: 1 },
  "1W":  { style: "swing", tradingDays: 5 },
  "1M":  { style: "swing", months: 1 },
  "3M":  { style: "position", months: 3 },
  "6M":  { style: "position", months: 6 },
  "9M":  { style: "investor", months: 9 },
  "1Y":  { style: "investor", months: 12 },
}

export const STYLE_META: Record<TraderStyle, { name: string; color: string }> = {
  scalper:  { name: "Scalper",         color: "#fbbf24" },
  day:      { name: "Day Trader",      color: "#34d399" },
  swing:    { name: "Swing Trader",    color: "#60a5fa" },
  position: { name: "Position Trader", color: "#a78bfa" },
  investor: { name: "Investor",        color: "#f472b6" },
}

export function isRankedTf(v: unknown): v is RankedTf {
  return typeof v === "string" && (RANKED_TFS as readonly string[]).includes(v)
}

export function isIntraday(tf: RankedTf): boolean {
  return TF_DEFS[tf].minutes != null
}

// ─── Difficulty ─────────────────────────────────────────────────────────────

// Used when the server couldn't measure the asset's recent volatility.
export const FALLBACK_DAILY_SIGMA_PCT: Record<AssetKind, number> = { crypto: 3.5, market: 1.8 }

// Length of the window in "trading days" so it can be scaled by daily volatility.
function windowInTradingDays(tf: RankedTf, kind: AssetKind): number {
  const d = TF_DEFS[tf]
  if (d.minutes != null) return d.minutes / (kind === "crypto" ? 1440 : 390)
  if (d.tradingDays != null) return kind === "crypto" ? d.tradingDays * (d.tradingDays === 5 ? 7 / 5 : 1) : d.tradingDays
  return (d.months ?? 1) * (kind === "crypto" ? 30 : 21)
}

/** A typical % move for this asset over the window (1σ, square-root-of-time). */
export function typicalMovePct(tf: RankedTf, kind: AssetKind, dailySigmaPct: number | null): number {
  const sigma = dailySigmaPct && dailySigmaPct > 0 ? dailySigmaPct : FALLBACK_DAILY_SIGMA_PCT[kind]
  return sigma * Math.sqrt(windowInTradingDays(tf, kind))
}

/** How big the target move is relative to a typical move for the window. */
export function difficultyRatio(movePct: number, tf: RankedTf, kind: AssetKind, dailySigmaPct: number | null): number {
  return Math.abs(movePct) / typicalMovePct(tf, kind, dailySigmaPct)
}

// Below this a target is close enough that touching it is near-certain noise.
export const MIN_RANKED_RATIO = 0.25

export type DifficultyLevel = "too_close" | "easy" | "fair" | "bold" | "moonshot"

export function difficultyLevel(ratio: number): DifficultyLevel {
  if (ratio < MIN_RANKED_RATIO) return "too_close"
  if (ratio < 0.5) return "easy"
  if (ratio < 1) return "fair"
  if (ratio < 2) return "bold"
  return "moonshot"
}

export const DIFFICULTY_META: Record<DifficultyLevel, { name: string; color: string; bars: number; hint: string }> = {
  too_close: { name: "Too close", color: "#9ca3af", bars: 0, hint: "Move the target further out to rank this call" },
  easy:      { name: "Easy",      color: "#9ca3af", bars: 1, hint: "A small move for this window" },
  fair:      { name: "Fair",      color: "#34d399", bars: 2, hint: "A normal move for this window" },
  bold:      { name: "Bold",      color: "#fbbf24", bars: 3, hint: "Bigger than a typical move" },
  moonshot:  { name: "Moonshot",  color: "#f472b6", bars: 4, hint: "Rarely happens this fast" },
}

// ─── Points ─────────────────────────────────────────────────────────────────
// Calibrated so random guessing has negative expected value at every
// difficulty: easy targets pay little and cost a lot to miss, hard targets
// pay a lot and cost little. Only real skill trends positive.

export function pointsIfHit(ratio: number): number {
  return Math.max(1, Math.round(12 * Math.min(ratio, 3)))
}

export function pointsIfMissed(ratio: number): number {
  return Math.min(16, Math.round(4 + 6 / Math.max(ratio, 0.5)))
}

// ─── Score and rank ────────────────────────────────────────────────────────

export const RANK_MIN_CALLS = 10
export const STYLE_MIN_CALLS = 5

export type RankTier = "rookie" | "analyst" | "sharp" | "elite" | "legend"

export const TIER_META: Record<RankTier, { name: string; color: string; min: number }> = {
  rookie:  { name: "Rookie",  color: "#9ca3af", min: 0 },
  analyst: { name: "Analyst", color: "#93c5fd", min: 450 },
  sharp:   { name: "Sharp",   color: "#34d399", min: 550 },
  elite:   { name: "Elite",   color: "#fbbf24", min: 650 },
  legend:  { name: "Legend",  color: "#f472b6", min: 800 },
}

/**
 * Peerza score, 0–1000. 500 ≈ what random guessing earns. Average points per
 * resolved call are shrunk toward zero by a 10-call prior, so a lucky streak
 * on a handful of calls can't outrank a long, consistent record.
 */
export function peerzaScore(totalPoints: number, resolvedCalls: number): number {
  const shrunkAvg = totalPoints / (resolvedCalls + 10)
  return Math.max(0, Math.min(1000, Math.round(500 + 100 * shrunkAvg)))
}

export function rankTier(score: number, resolvedCalls: number): RankTier {
  if (resolvedCalls < RANK_MIN_CALLS) return "rookie"
  if (score >= TIER_META.legend.min) return "legend"
  if (score >= TIER_META.elite.min) return "elite"
  if (score >= TIER_META.sharp.min) return "sharp"
  if (score >= TIER_META.analyst.min) return "analyst"
  return "rookie"
}

export function nextTier(tier: RankTier): RankTier | null {
  const order: RankTier[] = ["rookie", "analyst", "sharp", "elite", "legend"]
  const i = order.indexOf(tier)
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null
}

/** Style = the one used most often, once there are enough calls to say. */
export function dominantStyle(tfs: string[]): TraderStyle | null {
  if (tfs.length < STYLE_MIN_CALLS) return null
  const counts = new Map<TraderStyle, number>()
  for (const tf of tfs) {
    if (!isRankedTf(tf)) continue
    const s = TF_DEFS[tf].style
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  let best: TraderStyle | null = null
  let bestN = 0
  for (const [s, n] of counts) if (n > bestN) { best = s; bestN = n }
  return best
}

// ─── Deadlines ─────────────────────────────────────────────────────────────

export interface SessionHint {
  /** Exchange UTC offset in seconds (Yahoo `gmtoffset`). */
  gmtOffsetSec: number
  /** Today's (or the last) regular session in epoch ms. */
  regularStartMs: number
  regularEndMs: number
}

const DAY_MS = 86_400_000

function isWeekendAt(ms: number, gmtOffsetSec: number): boolean {
  const day = new Date(ms + gmtOffsetSec * 1000).getUTCDay()
  return day === 0 || day === 6
}

export function isSessionOpen(nowMs: number, s: SessionHint): boolean {
  return nowMs >= s.regularStartMs && nowMs < s.regularEndMs && !isWeekendAt(nowMs, s.gmtOffsetSec)
}

/** Next regular-session open at or after `nowMs` (weekends skipped, holidays not modeled). */
export function nextSessionOpen(nowMs: number, s: SessionHint): number {
  let open = s.regularStartMs
  while (open < nowMs || isWeekendAt(open, s.gmtOffsetSec)) open += DAY_MS
  return open
}

function addTradingDays(ms: number, days: number, gmtOffsetSec: number): number {
  let out = ms
  let left = days
  while (left > 0) {
    out += DAY_MS
    if (!isWeekendAt(out, gmtOffsetSec)) left--
  }
  return out
}

function addMonths(ms: number, months: number): number {
  const d = new Date(ms)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.getTime()
}

export interface RankedWindow {
  startsAt: number
  deadline: number
  /** True when the market is closed and the clock starts at the next open. */
  deferred: boolean
}

/**
 * When a call's clock starts and ends. Crypto runs 24/7 on wall-clock time.
 * Session markets start at the next open if closed, and day-based windows
 * count weekdays only. Returns null for an intraday window on a closed market.
 */
export function rankedWindow(tf: RankedTf, kind: AssetKind, nowMs: number, session: SessionHint | null): RankedWindow | null {
  const def = TF_DEFS[tf]
  if (kind === "crypto" || !session) {
    const end = def.minutes != null ? nowMs + def.minutes * 60_000
      : def.tradingDays != null ? nowMs + (def.tradingDays === 5 ? 7 : def.tradingDays) * DAY_MS
      : addMonths(nowMs, def.months ?? 1)
    return { startsAt: nowMs, deadline: end, deferred: false }
  }
  const open = isSessionOpen(nowMs, session)
  if (def.minutes != null) {
    if (!open) return null
    return { startsAt: nowMs, deadline: nowMs + def.minutes * 60_000, deferred: false }
  }
  const start = open ? nowMs : nextSessionOpen(nowMs, session)
  let end = def.tradingDays != null
    ? addTradingDays(start, def.tradingDays, session.gmtOffsetSec)
    : addMonths(start, def.months ?? 1)
  while (isWeekendAt(end, session.gmtOffsetSec)) end += DAY_MS
  return { startsAt: start, deadline: end, deferred: !open }
}

// ─── Display helpers ───────────────────────────────────────────────────────

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0m"
  const m = Math.floor(ms / 60_000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d >= 30) return `${Math.round(d / 30)}mo`
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${mm}m`
  return `${mm}m`
}

/**
 * Price with enough precision to see a ranked call move: forex (1.3213)
 * needs 4 decimals and sub-dollar coins (0.09636) need significant digits,
 * where the usual 2 decimals would show entry and target as the same number.
 */
export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 })
  if (p >= 10) return p.toFixed(2)
  if (p >= 1) return p.toFixed(4)
  return String(Number(p.toPrecision(4)))
}

/** One-unit countdown for tight spaces (rings): "4d", "23h", "12m". */
export function formatCountdownShort(ms: number): string {
  if (ms <= 0) return "0m"
  const m = Math.floor(ms / 60_000)
  if (m >= 60 * 24 * 30) return `${Math.round(m / (60 * 24 * 30))}mo`
  if (m >= 60 * 24) return `${Math.floor(m / (60 * 24))}d`
  if (m >= 60) return `${Math.floor(m / 60)}h`
  return `${m}m`
}

/** 0–1 progress from entry toward target in the call's direction. */
export function progressToward(entry: number, target: number, price: number): number {
  const span = target - entry
  if (span === 0) return 0
  return Math.max(0, Math.min(1, (price - entry) / span))
}
