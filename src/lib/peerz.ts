// Peerz — Peerza's loyalty points. The rulebook lives here (pure, safe to
// import from client components); database writes live in lib/peerz-server.ts.
//
// Peerz are separate from the Peerza Score: the score measures skill and can
// fall, Peerz measure participation and only go down when spent. Peerz have no
// cash value and are never sold, bought or transferred — keep it that way.

import { pointsIfHit, type RankTier } from "@/lib/ranked"

// ─── Seasons ────────────────────────────────────────────────────────────────
// Season 1 starts at public launch. The date is a placeholder until launch day
// is fixed — move it (and S0's end) together.

export interface Season { id: string; name: string; start: string; end: string }

export const SEASONS: Season[] = [
  { id: "S0", name: "Beta",    start: "2026-01-01T00:00:00Z", end: "2027-01-01T00:00:00Z" },
  { id: "S1", name: "Genesis", start: "2027-01-01T00:00:00Z", end: "2027-04-01T00:00:00Z" },
]

export function seasonAt(at: Date = new Date()): Season {
  const t = at.getTime()
  for (const s of SEASONS) {
    if (t >= Date.parse(s.start) && t < Date.parse(s.end)) return s
  }
  return SEASONS[SEASONS.length - 1]
}

// ─── Earning ────────────────────────────────────────────────────────────────

/** A hit pays 10× its Ranked points, so difficulty sets the reward (≈12–360). */
export function hitBasePeerz(ratio: number): number {
  return 10 * pointsIfHit(ratio)
}

/** Flat reward for any call that resolves (hit or miss — VOID pays nothing). */
export const RESOLVED_PEERZ = 10
export const RESOLVED_DAILY_CAP = 5

export const HOT_HAND_MIN_STREAK = 3
export const HOT_HAND_MULT = 1.5

export const TIER_MULT: Record<RankTier, number> = {
  rookie: 1, analyst: 1.1, sharp: 1.25, elite: 1.5, legend: 2,
}

export const GENESIS_LIMIT = 1000
export const GENESIS_MULT = 2
/** Genesis members earn double until Season 1 ends. */
export const GENESIS_BOOST_UNTIL = SEASONS.find((s) => s.id === "S1")!.end

export const DUEL_WIN_PEERZ = 40
export const DUEL_DAILY_CAP_PER_OPPONENT = 3
export const DUEL_DAILY_CAP = 10

/** Check-in reward by streak day (1–7); day 8 starts the week over. */
export const CHECKIN_REWARDS = [5, 10, 15, 20, 25, 30, 100] as const

export interface RewardPart { label: string; value: string }

export interface HitReward { total: number; parts: RewardPart[] }

export function hitReward(opts: {
  ratio: number
  streak: number            // consecutive hits including this one
  tier: RankTier | null
  genesis: boolean
  at: Date
}): HitReward {
  const base = hitBasePeerz(opts.ratio)
  const parts: RewardPart[] = [{ label: "Hit", value: String(base) }]
  let mult = 1
  if (opts.streak >= HOT_HAND_MIN_STREAK) {
    mult *= HOT_HAND_MULT
    parts.push({ label: `Hot Hand · ${opts.streak} in a row`, value: `×${HOT_HAND_MULT}` })
  }
  const tierMult = opts.tier ? TIER_MULT[opts.tier] : 1
  if (tierMult > 1) {
    mult *= tierMult
    parts.push({ label: `${opts.tier![0].toUpperCase()}${opts.tier!.slice(1)} rank`, value: `×${tierMult}` })
  }
  if (opts.genesis && opts.at.getTime() < Date.parse(GENESIS_BOOST_UNTIL)) {
    mult *= GENESIS_MULT
    parts.push({ label: "Genesis", value: `×${GENESIS_MULT}` })
  }
  return { total: Math.round(base * mult), parts }
}

// ─── Spending ───────────────────────────────────────────────────────────────

export type StoreItemId = "pro-week" | "aria-5"

export interface StoreItem { id: StoreItemId; name: string; desc: string; cost: number }

export const STORE_ITEMS: StoreItem[] = [
  { id: "pro-week", name: "1 week of Pro", desc: "Try every Pro perk for 7 days · once per season", cost: 5000 },
  { id: "aria-5",   name: "+5 Aria questions", desc: "Extra AI tutor questions, used after your daily limit", cost: 500 },
]

export const LEDGER_LABELS: Record<string, string> = {
  CALL_HIT: "Ranked call hit",
  CALL_RESOLVED: "Ranked call resolved",
  DUEL_WIN: "Duel win",
  CHECKIN: "Daily check-in",
  REDEEM: "Redeemed",
  GRANT: "Bonus from Peerza",
}

export function formatPeerz(n: number): string {
  return n.toLocaleString("en-US")
}

/** Compact form for tight spots: 12,480 → 12.4K. */
export function compactPeerz(n: number): string {
  if (Math.abs(n) < 10_000) return formatPeerz(n)
  if (Math.abs(n) < 1_000_000) return `${Math.floor(n / 100) / 10}K`
  return `${Math.floor(n / 100_000) / 10}M`
}
