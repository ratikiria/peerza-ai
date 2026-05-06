"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight, History, Briefcase } from "lucide-react";
import AnimatedNumber, { FlashCell } from "./AnimatedNumber";
import AllocationChart from "./AllocationChart";

const fmtUsd = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

// Asset class color accents — used as a left stripe on each holding tile so
// stocks/crypto/forex/etc. are visually distinguishable at a glance.
const ASSET_ACCENT: Record<string, string> = {
  crypto:    "#f59e0b",
  stock:     "#3b82f6",
  etf:       "#10b981",
  forex:     "#22d3ee",
  commodity: "#a855f7",
  bond:      "#a855f7",
  cash:      "#6b7280",
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface TradeGroup {
  dateKey: string;
  label: string;
  trades: Trade[];
}

function groupTradesByDate(trades: Trade[]): TradeGroup[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return [...groups.entries()].map(([dateKey, list]) => ({
    dateKey,
    label: dayLabel(new Date(list[0].createdAt)),
    trades: list,
  }));
}

interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  priceKey: string;
  quantity: number;
  avgCost: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
}

interface Props {
  challengeId: string;
  virtualCapital: number;
  refreshTrigger: number;
}

export default function PortfolioView({ challengeId, virtualCapital, refreshTrigger }: Props) {
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/portfolio`);
      const data = await res.json();
      setCashBalance(data.cashBalance);
      setHoldings(data.holdings ?? []);
      setTrades(data.trades ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  const fetchPrices = useCallback(async (h: Holding[]) => {
    if (h.length === 0) return;
    setRefreshingPrices(true);
    try {
      const cryptoKeys = h.filter((x) => x.assetType === "crypto").map((x) => x.priceKey);
      const stooqKeys = h.filter((x) => x.assetType !== "crypto").map((x) => x.priceKey);

      const newPrices: Record<string, number> = {};

      if (cryptoKeys.length > 0) {
        const res = await fetch(`/api/market/prices?crypto=${encodeURIComponent(cryptoKeys.join(","))}`);
        const data: { id: string; price: number }[] = await res.json();
        if (Array.isArray(data)) for (const e of data) newPrices[e.id] = e.price;
      }
      if (stooqKeys.length > 0) {
        const res = await fetch(`/api/market/prices?stooq=${encodeURIComponent(stooqKeys.join(","))}`);
        const data: { id: string; price: number }[] = await res.json();
        if (Array.isArray(data)) for (const e of data) newPrices[e.id] = e.price;
      }
      setPrices(newPrices);
    } finally {
      setRefreshingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio, refreshTrigger]);

  useEffect(() => {
    if (holdings.length > 0) fetchPrices(holdings);
  }, [holdings, fetchPrices]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--bg-card)" }} />
        ))}
      </div>
    );
  }

  const holdingsValue = holdings.reduce((sum, h) => {
    const price = prices[h.priceKey] ?? h.avgCost;
    return sum + h.quantity * price;
  }, 0);
  const totalValue = (cashBalance ?? 0) + holdingsValue;
  const returnVal = totalValue - virtualCapital;
  const returnPct = (returnVal / virtualCapital) * 100;
  const isPositive = returnVal >= 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1">
            <DollarSign size={12} /> Total Value
          </div>
          <FlashCell value={totalValue} className="text-lg font-bold">
            $<AnimatedNumber value={totalValue} format={fmtUsd} />
          </FlashCell>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1">
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Return
          </div>
          <FlashCell value={returnPct} className={`text-lg font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            <AnimatedNumber value={returnPct} format={fmtPct} />
          </FlashCell>
          <div className={`text-xs ${isPositive ? "text-green-400/60" : "text-red-400/60"}`}>
            {isPositive ? "+" : ""}$<AnimatedNumber value={returnVal} format={fmtUsd} />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-white/40 text-xs mb-1">Cash Balance</div>
          <div className="text-lg font-bold">
            $<AnimatedNumber value={cashBalance ?? 0} format={fmtUsd} />
          </div>
        </div>
      </div>

      {/* Allocation donut */}
      {holdings.length > 0 && (
        <AllocationChart holdings={holdings} prices={prices} cashBalance={cashBalance ?? 0} />
      )}

      {/* Holdings — tile grid (visually distinct from the timeline below) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Briefcase size={13} className="text-emerald-400" />
            Holdings
            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              {holdings.length}
            </span>
          </h3>
          <button
            onClick={() => fetchPrices(holdings)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40"
            title="Refresh prices"
          >
            <RefreshCw size={13} className={refreshingPrices ? "animate-spin" : ""} />
          </button>
        </div>

        {holdings.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center text-sm"
            style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", color: "var(--text-secondary)" }}
          >
            No holdings yet. Execute a trade to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {holdings.map((h) => {
              const currentPrice = prices[h.priceKey] ?? h.avgCost;
              const value        = h.quantity * currentPrice;
              const pnl          = (currentPrice - h.avgCost) * h.quantity;
              const pnlPct       = ((currentPrice - h.avgCost) / h.avgCost) * 100;
              const positive     = pnl >= 0;
              const accent       = ASSET_ACCENT[h.assetType] ?? "#10b981";
              return (
                <div
                  key={h.id}
                  className="relative rounded-2xl p-4 overflow-hidden transition-all hover:-translate-y-0.5"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: `inset 3px 0 0 ${accent}`,
                  }}
                >
                  {/* Header row: symbol + asset class chip */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold tracking-tight truncate" style={{ color: "var(--text-primary)" }}>
                        {h.symbol}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
                        {h.name}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: accent + "1f", color: accent }}
                    >
                      {h.assetType}
                    </span>
                  </div>

                  {/* Value + P&L pill row */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <FlashCell value={value} className="text-lg font-bold leading-none tabular-nums">
                        $<AnimatedNumber value={value} format={fmtUsd} />
                      </FlashCell>
                      <p className="text-[10px] mt-1.5 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${h.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg tabular-nums flex-shrink-0"
                      style={{
                        background: positive ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                        color: positive ? "#10b981" : "#f43f5e",
                      }}
                    >
                      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      <AnimatedNumber value={pnlPct} format={fmtPct} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History — timeline (vertical line + colored dots; visually
          distinct from the Holdings tile grid above so they don't blur into one) */}
      {trades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <History size={13} className="text-blue-400" />
              Transaction History
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                {trades.length}
              </span>
            </h3>
          </div>
          <div
            className="rounded-2xl max-h-[440px] overflow-y-auto"
            style={{
              background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-base) 100%)",
              border: "1px solid var(--border)",
              scrollbarWidth: "thin",
            }}
          >
            {groupTradesByDate(trades).map((group, gi) => (
              <div key={group.dateKey}>
                {/* Day anchor — pill-shaped, sticky */}
                <div className="sticky top-0 z-10 px-5 py-2.5"
                  style={{
                    background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card)ee 80%, transparent 100%)",
                    backdropFilter: "blur(6px)",
                  }}>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {group.label}
                  </span>
                </div>

                {/* Timeline rail */}
                <div className="relative pl-10 pr-5 pb-4">
                  {/* The vertical line — extends through the day's events.
                      Stops just short of the bottom of the last item so groups
                      visually separate. */}
                  <div
                    className="absolute left-[26px] top-0 bottom-3 w-px"
                    style={{ background: "var(--border)" }}
                  />

                  <div className="space-y-2.5">
                    {group.trades.map((t) => {
                      const buy = t.side === "BUY"
                      const dotColor = buy ? "#10b981" : "#f43f5e"
                      const Icon = buy ? ArrowUpRight : ArrowDownRight
                      return (
                        <div key={t.id} className="relative flex items-start gap-3">
                          {/* Dot on the rail */}
                          <div
                            className="absolute -left-[18px] top-2.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                            style={{
                              background: dotColor,
                              boxShadow: `0 0 0 3px var(--bg-card), 0 0 0 4px ${dotColor}33`,
                            }}
                          >
                            <Icon size={8} className="text-white" strokeWidth={3} />
                          </div>

                          {/* Card */}
                          <div
                            className="flex-1 min-w-0 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                            style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{
                                  background: buy ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                                  color: dotColor,
                                }}
                              >
                                {t.side}
                              </span>
                              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                {t.symbol}
                              </span>
                              <span className="text-[10px] tabular-nums truncate" style={{ color: "var(--text-secondary)" }}>
                                {t.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                ${t.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[9px] tabular-nums" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                                {fmtTime(t.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {gi < groupTradesByDate(trades).length - 1 && (
                  <div className="mx-5" style={{ borderTop: "1px solid var(--border)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
