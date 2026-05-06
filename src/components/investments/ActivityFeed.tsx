"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ActivityItem {
  id: string;
  side: "BUY" | "SELL";
  symbol: string;
  name: string;
  assetType: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  user: { id: string; username: string; name: string; image: string | null };
}

interface Props {
  challengeId: string;
  refreshTrigger: number;
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function fmtQty(q: number): string {
  if (q >= 1) return q.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return q.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function ActivityFeed({ challengeId, refreshTrigger }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0); // re-render to keep "Xs ago" fresh

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/activity`);
      const data = await res.json();
      setItems(data.trades ?? []);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [load, refreshTrigger]);

  // Re-render every 15s to refresh time-ago labels
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <Activity size={14} style={{ color: "var(--accent)" }} />
        <h3 className="font-semibold text-sm">Live Activity</h3>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
          Live
        </span>
      </div>

      {loading ? (
        <div className="p-5 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-white/30">No trades yet — be first.</div>
      ) : (
        <div className="divide-y max-h-[440px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
          {items.map((t) => {
            const isBuy = t.side === "BUY";
            return (
              <div key={t.id} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-white/5 transition-colors">
                <Link href={`/profile/${t.user.username}`} className="shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                    {t.user.image ? (
                      <Image src={`/api/avatar/${t.user.id}`} alt={t.user.name} width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/40">
                        {t.user.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-tight">
                    <Link href={`/profile/${t.user.username}`} className="font-semibold hover:text-emerald-300 transition-colors">
                      @{t.user.username}
                    </Link>
                    <span
                      className="ml-1.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: isBuy ? "#16a34a22" : "#dc262622",
                        color: isBuy ? "#4ade80" : "#f87171",
                      }}
                    >
                      {isBuy ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                      {t.side}
                    </span>
                    <span className="ml-1.5 font-medium text-white/80">{fmtQty(t.quantity)} {t.symbol}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 truncate">
                    @ ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {timeAgo(t.createdAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold" style={{ color: isBuy ? "#f87171" : "#4ade80" }}>
                    {isBuy ? "−" : "+"}${t.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
