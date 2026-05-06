import { db } from "@/lib/db"

export interface MutualUser {
  id: string
  name: string
  username: string
  image: string | null
}

export async function getMutualConnections(viewerId: string, targetId: string, take = 8): Promise<{ users: MutualUser[]; total: number }> {
  if (viewerId === targetId) return { users: [], total: 0 }
  // Users that BOTH the viewer and the target follow
  const where = {
    AND: [
      { followers: { some: { followerId: viewerId } } },
      { followers: { some: { followerId: targetId } } },
    ],
    id: { notIn: [viewerId, targetId] },
  }
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      take,
      select: { id: true, name: true, username: true, image: true },
    }),
    db.user.count({ where }),
  ])
  return { users, total }
}

export interface RecentOutcome {
  id: string
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  logoUrl: string | null
  outcomeReturnPct: number | null
  outcomeAt: string
}

export interface ActiveChallengePerf {
  challengeId: string
  challengeName: string
  style: "INVESTMENT" | "TRADING" | "MIXED"
  rank: number
  totalParticipants: number
  returnPct: number
}

// Best-effort fetch of the user's active challenge performance — uses the
// /api/challenges/[id]/leaderboard endpoint which already has full ranking
// + price computation cached for 30s. Falls back gracefully on error.
export async function getActiveChallengePerf(
  userId: string,
  baseUrl: string,
  cookieHeader: string,
  take = 2,
): Promise<ActiveChallengePerf[]> {
  const participations = await db.challengeParticipant.findMany({
    where: {
      userId,
      challenge: { status: "ACTIVE", leaderboardVisible: true },
    },
    orderBy: { joinedAt: "desc" },
    take,
    include: {
      challenge: {
        select: { id: true, name: true, style: true },
      },
    },
  })

  if (participations.length === 0) return []

  const out: ActiveChallengePerf[] = []
  for (const p of participations) {
    try {
      const res = await fetch(`${baseUrl}/api/challenges/${p.challengeId}/leaderboard`, {
        headers: { cookie: cookieHeader },
      })
      if (!res.ok) continue
      const data: {
        leaderboard: { rank: number; userId: string; returnPct: number }[]
        totalParticipants: number
        myEntry: { rank: number; returnPct: number } | null
      } = await res.json()
      // The leaderboard endpoint returns the requester's own rank — but here we
      // want the profile USER's rank. Query the full top10 and look for them;
      // if not in top10, leaderboard.totalParticipants is still useful for ranking.
      const inTop = data.leaderboard.find((e) => e.userId === userId)
      if (inTop) {
        out.push({
          challengeId: p.challengeId,
          challengeName: p.challenge.name,
          style: p.challenge.style as ActiveChallengePerf["style"],
          rank: inTop.rank,
          totalParticipants: data.totalParticipants,
          returnPct: parseFloat(inTop.returnPct.toFixed(2)),
        })
      }
      // If user isn't in top 10 and they're the requester, myEntry would be set —
      // but here the requester != profile user, so we can't easily get their rank
      // without re-running the rank computation. Skip out-of-top10 cases for v1.
    } catch {
      // ignore
    }
  }
  return out
}

export async function getRecentOutcomes(userId: string, take = 5): Promise<RecentOutcome[]> {
  const posts = await db.post.findMany({
    where: { authorId: userId, outcomeStatus: "TARGET_HIT" },
    orderBy: { outcomeAt: "desc" },
    take,
    select: {
      id: true, analysis: true, outcomeAt: true, outcomeReturnPct: true,
    },
  })
  const out: RecentOutcome[] = []
  for (const p of posts) {
    if (!p.analysis || typeof p.analysis !== "object") continue
    const a = p.analysis as Record<string, unknown>
    const ticker = typeof a.ticker === "string" ? a.ticker : null
    const direction = a.direction
    if (!ticker || !p.outcomeAt) continue
    if (direction !== "bullish" && direction !== "bearish" && direction !== "neutral") continue
    out.push({
      id: p.id,
      ticker,
      direction,
      logoUrl: typeof a.logoUrl === "string" ? a.logoUrl : null,
      outcomeReturnPct: p.outcomeReturnPct,
      outcomeAt: p.outcomeAt.toISOString(),
    })
  }
  return out
}
