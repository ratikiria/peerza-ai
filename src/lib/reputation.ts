// Ranked Calls reputation: the denormalized User.rep* fields (read by feed
// cards) and the full profile breakdown. Scoring rules live in lib/ranked.ts.

import { db } from "@/lib/db"
import {
  TF_DEFS, STYLE_META, isRankedTf, peerzaScore, rankTier, dominantStyle, nextTier, TIER_META,
  type RankTier, type TraderStyle,
} from "@/lib/ranked"

interface RankedRow {
  id: string
  analysis: unknown
  outcomeStatus: "OPEN" | "TARGET_HIT" | "EXPIRED" | "VOID"
  rankedTf: string | null
  rankedPoints: number | null
  rankedEntry: number | null
  rankedTarget: number | null
  rankedProgress: number | null
  rankedDeadline: Date | null
  outcomeAt: Date | null
  createdAt: Date
}

const RANKED_SELECT = {
  id: true, analysis: true, outcomeStatus: true, rankedTf: true, rankedPoints: true,
  rankedEntry: true, rankedTarget: true, rankedProgress: true, rankedDeadline: true,
  outcomeAt: true, createdAt: true,
} as const

function isResolved(r: RankedRow) {
  return r.outcomeStatus === "TARGET_HIT" || r.outcomeStatus === "EXPIRED"
}

function summarize(rows: RankedRow[]) {
  const resolved = rows.filter(isResolved)
  const hits = resolved.filter((r) => r.outcomeStatus === "TARGET_HIT").length
  const points = resolved.reduce((sum, r) => sum + (r.rankedPoints ?? 0), 0)
  const score = peerzaScore(points, resolved.length)
  const tier = rankTier(score, resolved.length)
  const style = dominantStyle(rows.filter((r) => r.outcomeStatus !== "VOID").map((r) => r.rankedTf ?? ""))
  return { resolved, hits, points, score, tier, style }
}

/** Refresh User.rep* after one of their calls resolves. */
export async function recomputeReputation(userId: string): Promise<void> {
  const rows = await db.post.findMany({
    where: { authorId: userId, rankedDeadline: { not: null } },
    select: RANKED_SELECT,
  }) as RankedRow[]
  const s = summarize(rows)
  await db.user.update({
    where: { id: userId },
    data: { repScore: s.score, repTier: s.tier, repStyle: s.style, repCalls: s.resolved.length, repHits: s.hits },
  })
}

// ─── Profile breakdown ─────────────────────────────────────────────────────

type AssetClass = "crypto" | "stocks" | "forex"

function assetClassOf(analysis: unknown): AssetClass {
  const a = (analysis ?? {}) as { priceSource?: string; priceKey?: string }
  if (a.priceSource === "crypto") return "crypto"
  if (a.priceKey && /^[a-z]{6}$/.test(a.priceKey) && !/^xa[ug]usd$/.test(a.priceKey)) return "forex"
  return "stocks"
}

function directionOf(analysis: unknown): "bullish" | "bearish" | "neutral" {
  const d = (analysis as { direction?: string } | null)?.direction
  return d === "bullish" || d === "bearish" ? d : "neutral"
}

function tickerOf(analysis: unknown): string {
  return ((analysis as { ticker?: string } | null)?.ticker ?? "").toUpperCase()
}

function movePct(r: RankedRow): number | null {
  if (r.rankedEntry == null || r.rankedTarget == null || r.rankedEntry === 0) return null
  return Math.abs((r.rankedTarget - r.rankedEntry) / r.rankedEntry) * 100
}

export interface ReputationBadge { key: string; name: string; desc: string; color: string }

export interface RecentRankedCall {
  id: string
  ticker: string
  tf: string
  style: TraderStyle | null
  status: "TARGET_HIT" | "EXPIRED"
  points: number
  movePct: number | null
  progressPct: number | null
  hitAfterMs: number | null
}

export interface ReputationProfile {
  score: number
  tier: RankTier
  nextTier: RankTier | null
  pointsToNext: number | null
  style: TraderStyle | null
  resolvedCalls: number
  openCalls: number
  hits: number
  hitRatePct: number | null
  avgMovePct: number | null
  bestMovePct: number | null
  streak: number
  styleMix: { style: TraderStyle; pct: number }[]
  badges: ReputationBadge[]
  recent: RecentRankedCall[]
}

export async function getReputationProfile(userId: string): Promise<ReputationProfile | null> {
  const rows = await db.post.findMany({
    where: { authorId: userId, rankedDeadline: { not: null } },
    orderBy: { createdAt: "desc" },
    select: RANKED_SELECT,
  }) as RankedRow[]
  if (rows.length === 0) return null

  const s = summarize(rows)
  const live = rows.filter((r) => r.outcomeStatus !== "VOID")
  const hitRows = s.resolved.filter((r) => r.outcomeStatus === "TARGET_HIT")
  const hitMoves = hitRows.map(movePct).filter((m): m is number => m != null)

  // Current streak: consecutive hits counting back from the most recent resolution.
  const byResolution = [...s.resolved].sort((a, b) =>
    (b.outcomeAt ?? b.rankedDeadline ?? b.createdAt).getTime() - (a.outcomeAt ?? a.rankedDeadline ?? a.createdAt).getTime())
  let streak = 0
  for (const r of byResolution) { if (r.outcomeStatus === "TARGET_HIT") streak++; else break }

  const styleCounts = new Map<TraderStyle, number>()
  for (const r of live) {
    if (!isRankedTf(r.rankedTf)) continue
    const st = TF_DEFS[r.rankedTf].style
    styleCounts.set(st, (styleCounts.get(st) ?? 0) + 1)
  }
  const styleMix = (Object.keys(STYLE_META) as TraderStyle[])
    .filter((st) => styleCounts.has(st))
    .map((st) => ({ style: st, pct: Math.round((styleCounts.get(st)! / live.length) * 100) }))

  const hitRate = s.resolved.length ? s.hits / s.resolved.length : 0
  const badges: ReputationBadge[] = []
  if (s.resolved.length >= 25 && hitRate >= 0.7) {
    badges.push({ key: "sniper", name: "Sniper", desc: "70%+ hit rate over 25+ calls", color: "#fbbf24" })
  }
  const byClass = new Map<AssetClass, { hits: number; total: number }>()
  for (const r of s.resolved) {
    const c = assetClassOf(r.analysis)
    const e = byClass.get(c) ?? { hits: 0, total: 0 }
    e.total++
    if (r.outcomeStatus === "TARGET_HIT") e.hits++
    byClass.set(c, e)
  }
  let special: { cls: AssetClass; hits: number } | null = null
  for (const [cls, e] of byClass) {
    if (e.hits >= 5 && e.hits / e.total >= 0.6 && (!special || e.hits > special.hits)) special = { cls, hits: e.hits }
  }
  if (special) {
    const label = special.cls === "crypto" ? "Crypto" : special.cls === "forex" ? "Forex" : "Stocks"
    badges.push({ key: "specialist", name: `${label} specialist`, desc: `Best record in ${label.toLowerCase()}`, color: "#60a5fa" })
  }
  if (streak >= 5) badges.push({ key: "streak", name: "On fire", desc: `${streak} hits in a row`, color: "#fb923c" })
  const bearHits = hitRows.filter((r) => directionOf(r.analysis) === "bearish").length
  if (bearHits >= 5) badges.push({ key: "contrarian", name: "Contrarian", desc: `${bearHits} bearish calls landed`, color: "#a78bfa" })

  const nt = nextTier(s.tier)
  const pointsToNext = nt && s.resolved.length >= 10 ? Math.max(0, TIER_META[nt].min - s.score) : null

  return {
    score: s.score,
    tier: s.tier,
    nextTier: nt,
    pointsToNext,
    style: s.style,
    resolvedCalls: s.resolved.length,
    openCalls: rows.filter((r) => r.outcomeStatus === "OPEN").length,
    hits: s.hits,
    hitRatePct: s.resolved.length ? Math.round(hitRate * 100) : null,
    avgMovePct: hitMoves.length ? parseFloat((hitMoves.reduce((a, b) => a + b, 0) / hitMoves.length).toFixed(1)) : null,
    bestMovePct: hitMoves.length ? parseFloat(Math.max(...hitMoves).toFixed(1)) : null,
    streak,
    styleMix,
    badges,
    recent: byResolution.slice(0, 5).map((r) => ({
      id: r.id,
      ticker: tickerOf(r.analysis),
      tf: r.rankedTf ?? "",
      style: isRankedTf(r.rankedTf) ? TF_DEFS[r.rankedTf].style : null,
      status: r.outcomeStatus as "TARGET_HIT" | "EXPIRED",
      points: r.rankedPoints ?? 0,
      movePct: movePct(r),
      progressPct: r.rankedProgress != null ? Math.round(r.rankedProgress * 100) : null,
      hitAfterMs: r.outcomeStatus === "TARGET_HIT" && r.outcomeAt ? r.outcomeAt.getTime() - r.createdAt.getTime() : null,
    })),
  }
}
