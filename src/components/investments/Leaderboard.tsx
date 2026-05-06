"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import Image from "next/image";
import AnimatedNumber, { FlashCell } from "./AnimatedNumber";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: { id: string; username: string; name: string; image: string | null };
  totalValue: number;
  returnPct: number;
  cashBalance: number;
  holdingsValue: number;
  tradeCount: number;
}

interface Props {
  challengeId: string;
  refreshTrigger: number;
}

const rankEmoji = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ challengeId, refreshTrigger }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
      setMyEntry(data.myEntry ?? null);
      setTotalParticipants(data.totalParticipants ?? 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId]);

  useEffect(() => { fetch_(); }, [fetch_, refreshTrigger]);

  useEffect(() => {
    const iv = setInterval(() => fetch_(), 20_000);
    return () => clearInterval(iv);
  }, [fetch_]);

  if (loading) {
    return (
      <div className="rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm">Leaderboard</h3>
        </div>
        <div className="p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--bg-base)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <Trophy size={14} style={{ color: "#f59e0b" }} />
          <h3 className="font-semibold text-sm">Leaderboard</h3>
        </div>
        <button
          onClick={() => fetch_(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-white/30">No participants yet</div>
      ) : (
        <>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {leaderboard.map((entry) => (
              <Row key={entry.userId} entry={entry} highlight={false} />
            ))}
          </div>
          {myEntry && (
            <>
              <div className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-white/30" style={{ background: "var(--bg-base)" }}>
                Your rank
              </div>
              <Row entry={myEntry} highlight />
            </>
          )}
          {totalParticipants > leaderboard.length && (
            <div className="px-5 py-2 text-[11px] text-center text-white/30" style={{ borderTop: "1px solid var(--border)" }}>
              Showing top {leaderboard.length} of {totalParticipants} participants
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ entry, highlight }: { entry: LeaderboardEntry; highlight: boolean }) {
  const isPositive = entry.returnPct >= 0;
  const isTop3 = entry.rank <= 3;
  return (
    <div
      className="px-5 py-3 flex items-center gap-3"
      style={highlight ? { background: "rgba(16,185,129,0.08)" } : undefined}
    >
      <div className="w-7 text-center shrink-0">
        {isTop3 ? (
          <span className="text-base">{rankEmoji[entry.rank - 1]}</span>
        ) : (
          <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            #{entry.rank}
          </span>
        )}
      </div>
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ background: "var(--bg-base)" }}>
        {entry.user.image ? (
          <Image
            src={`/api/avatar/${entry.user.id}`}
            alt={entry.user.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
            {entry.user.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{entry.user.name}</div>
        <div className="text-xs text-white/40">@{entry.user.username} · {entry.tradeCount} trades</div>
      </div>
      <div className="text-right shrink-0">
        <FlashCell value={entry.returnPct} className="text-sm font-bold">
          <span style={{ color: isPositive ? "#4ade80" : "#f87171" }}>
            <AnimatedNumber
              value={entry.returnPct}
              format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
            />
          </span>
        </FlashCell>
        <div className="text-xs text-white/30">
          $<AnimatedNumber
            value={entry.totalValue}
            format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          />
        </div>
      </div>
    </div>
  );
}
