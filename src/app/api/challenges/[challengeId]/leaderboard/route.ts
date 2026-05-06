import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: { id: string; username: string; name: string; image: string | null };
  cashBalance: number;
  holdingsValue: number;
  totalValue: number;
  returnPct: number;
  tradeCount: number;
}

const cache = new Map<string, { data: LeaderboardEntry[]; ts: number }>();
const CACHE_TTL = 30_000;
const TOP_N = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;

  const cached = cache.get(challengeId);
  let fullLeaderboard: LeaderboardEntry[] | null = cached && Date.now() - cached.ts < CACHE_TTL ? cached.data : null;

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: { virtualCapital: true, leaderboardVisible: true, creatorId: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!challenge.leaderboardVisible && challenge.creatorId !== session.user.id)
    return NextResponse.json({ leaderboard: [], totalParticipants: 0, myEntry: null });

  if (fullLeaderboard) {
    return NextResponse.json(buildResponse(fullLeaderboard, session.user.id));
  }

  const participants = await db.challengeParticipant.findMany({
    where: { challengeId },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
      holdings: true,
      _count: { select: { trades: true } },
    },
  });

  // Collect all unique priceKeys
  const cryptoKeys = new Set<string>();
  const stooqKeys = new Set<string>();
  for (const p of participants) {
    for (const h of p.holdings) {
      if (h.assetType === "crypto") cryptoKeys.add(h.priceKey);
      else stooqKeys.add(h.priceKey);
    }
  }

  // Fetch prices
  const priceMap: Record<string, number> = {};
  const baseUrl = req.nextUrl.origin;
  const cookieHeader = req.headers.get("cookie") || "";

  try {
    if (cryptoKeys.size > 0) {
      const res = await fetch(
        `${baseUrl}/api/market/prices?crypto=${encodeURIComponent([...cryptoKeys].join(","))}`,
        { headers: { cookie: cookieHeader } }
      );
      const data: { id: string; price: number }[] = await res.json();
      if (Array.isArray(data)) {
        for (const entry of data) priceMap[entry.id] = entry.price;
      }
    }
    if (stooqKeys.size > 0) {
      const res = await fetch(
        `${baseUrl}/api/market/prices?stooq=${encodeURIComponent([...stooqKeys].join(","))}`,
        { headers: { cookie: cookieHeader } }
      );
      const data: { id: string; price: number }[] = await res.json();
      if (Array.isArray(data)) {
        for (const entry of data) priceMap[entry.id] = entry.price;
      }
    }
  } catch {
    // Fall back to avgCost if price fetch fails
  }

  fullLeaderboard = participants
    .map((p) => {
      const holdingsValue = p.holdings.reduce((sum, h) => {
        const price = priceMap[h.priceKey] ?? h.avgCost;
        return sum + h.quantity * price;
      }, 0);
      const totalValue = p.cashBalance + holdingsValue;
      const returnPct = ((totalValue - challenge.virtualCapital) / challenge.virtualCapital) * 100;
      return {
        userId: p.userId,
        user: p.user,
        cashBalance: p.cashBalance,
        holdingsValue,
        totalValue,
        returnPct,
        tradeCount: p._count.trades,
      };
    })
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  cache.set(challengeId, { data: fullLeaderboard, ts: Date.now() });

  return NextResponse.json(buildResponse(fullLeaderboard, session.user.id));
}

function buildResponse(full: LeaderboardEntry[], requesterId: string) {
  const top = full.slice(0, TOP_N);
  const me = full.find((e) => e.userId === requesterId) ?? null;
  return {
    leaderboard: top,
    totalParticipants: full.length,
    myEntry: me && me.rank > TOP_N ? me : null,
  };
}
