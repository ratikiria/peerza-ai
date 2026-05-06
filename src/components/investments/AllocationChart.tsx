"use client";

import { useState, useMemo } from "react";
import { lookupKnownSector } from "@/lib/sectors";

interface Holding {
  symbol: string;
  name: string;
  assetType: string;
  priceKey: string;
  quantity: number;
  avgCost: number;
}

interface Props {
  holdings: Holding[];
  prices: Record<string, number>;
  cashBalance: number;
}

const PALETTE = [
  "#10b981", "#3b82f6", "#f59e0b", "#a855f7",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316",
  "#eab308", "#14b8a6", "#ef4444", "#6366f1",
  "#22d3ee", "#d946ef", "#22c55e", "#fb7185",
];

const CLASS_COLORS: Record<string, string> = {
  crypto: "#f59e0b",
  stock: "#3b82f6",
  etf: "#10b981",
  forex: "#22d3ee",
  commodity: "#a855f7",
  bond: "#a855f7",
  cash: "#6b7280",
};

const CLASS_LABELS: Record<string, string> = {
  crypto: "Crypto",
  stock: "Stocks",
  etf: "ETFs",
  forex: "Forex",
  commodity: "Commodities",
  bond: "Bonds",
  cash: "Cash",
};

interface Slice {
  label: string;
  value: number;
  color: string;
  pct: number;
}

type Mode = "asset" | "class" | "sector" | "industry"

const MODE_META: { key: Mode; label: string }[] = [
  { key: "asset",    label: "By Asset" },
  { key: "class",    label: "By Class" },
  { key: "sector",   label: "By Sector" },
  { key: "industry", label: "By Industry" },
]

export default function AllocationChart({ holdings, prices, cashBalance }: Props) {
  const [mode, setMode] = useState<Mode>("asset");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { slices, total } = useMemo(() => {
    const holdingValues = holdings.map((h, i) => {
      const price = prices[h.priceKey] ?? h.avgCost;
      return {
        holding: h,
        value: h.quantity * price,
        idx: i,
      };
    });
    const totalValue = holdingValues.reduce((s, x) => s + x.value, 0) + cashBalance;

    let result: Slice[];

    if (mode === "asset") {
      const sorted = [...holdingValues].sort((a, b) => b.value - a.value);
      result = sorted.map((x, i) => ({
        label: x.holding.symbol,
        value: x.value,
        color: PALETTE[i % PALETTE.length],
        pct: totalValue > 0 ? (x.value / totalValue) * 100 : 0,
      }));
      if (cashBalance > 0) {
        result.push({
          label: "Cash",
          value: cashBalance,
          color: CLASS_COLORS.cash,
          pct: totalValue > 0 ? (cashBalance / totalValue) * 100 : 0,
        });
      }
    } else if (mode === "class") {
      const groups = new Map<string, number>();
      for (const x of holdingValues) {
        const k = x.holding.assetType || "stock";
        groups.set(k, (groups.get(k) ?? 0) + x.value);
      }
      result = [...groups.entries()].map(([cls, value]) => ({
        label: CLASS_LABELS[cls] ?? cls,
        value,
        color: CLASS_COLORS[cls] ?? "#6b7280",
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      })).sort((a, b) => b.value - a.value);
      if (cashBalance > 0) {
        result.push({
          label: "Cash",
          value: cashBalance,
          color: CLASS_COLORS.cash,
          pct: totalValue > 0 ? (cashBalance / totalValue) * 100 : 0,
        });
      }
    } else {
      // sector | industry — both pull from KNOWN_SECTORS map; unknowns bucket together
      const groups = new Map<string, number>();
      for (const x of holdingValues) {
        if (x.holding.assetType === "crypto") {
          groups.set("Crypto", (groups.get("Crypto") ?? 0) + x.value);
          continue;
        }
        if (x.holding.assetType === "cash") {
          groups.set("Cash", (groups.get("Cash") ?? 0) + x.value);
          continue;
        }
        const meta = lookupKnownSector(x.holding.symbol);
        const key = mode === "sector"
          ? (meta.sector ?? "Other")
          : (meta.industry ?? "Other");
        groups.set(key, (groups.get(key) ?? 0) + x.value);
      }
      let i = 0;
      result = [...groups.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([label, value]) => ({
          label,
          value,
          color: label === "Other"
            ? "#475569"
            : label === "Crypto" ? "#f59e0b"
            : label === "Cash"   ? "#6b7280"
            : PALETTE[i++ % PALETTE.length],
          pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }));
      if (cashBalance > 0) {
        // Cash is its own bucket, separate from the cash-asset-class lookup
        const existing = result.find((r) => r.label === "Cash");
        if (existing) {
          existing.value += cashBalance;
          existing.pct = totalValue > 0 ? (existing.value / totalValue) * 100 : 0;
        } else {
          result.push({
            label: "Cash",
            value: cashBalance,
            color: CLASS_COLORS.cash,
            pct: totalValue > 0 ? (cashBalance / totalValue) * 100 : 0,
          });
        }
        result.sort((a, b) => b.value - a.value);
      }
    }
    return { slices: result, total: totalValue };
  }, [holdings, prices, cashBalance, mode]);

  // Donut geometry — sized up significantly from before
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rOuter = 96;
  const rInner = 64;

  const arcs = useMemo(() => {
    let angle = -Math.PI / 2; // start at top
    return slices.map((slice, i) => {
      const portion = total > 0 ? slice.value / total : 0;
      const sweep = portion * Math.PI * 2;
      const a1 = angle;
      const a2 = angle + sweep;
      angle = a2;

      const largeArc = sweep > Math.PI ? 1 : 0;
      const x1 = cx + rOuter * Math.cos(a1);
      const y1 = cy + rOuter * Math.sin(a1);
      const x2 = cx + rOuter * Math.cos(a2);
      const y2 = cy + rOuter * Math.sin(a2);
      const x3 = cx + rInner * Math.cos(a2);
      const y3 = cy + rInner * Math.sin(a2);
      const x4 = cx + rInner * Math.cos(a1);
      const y4 = cy + rInner * Math.sin(a1);

      const path =
        `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
        `L ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;

      return { ...slice, path, idx: i };
    });
  }, [slices, total, cx, cy]);

  const hovered = hoverIdx != null ? arcs[hoverIdx] : null;

  if (slices.length === 0) {
    return (
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="font-semibold text-base mb-2">Allocation</h3>
        <p className="text-xs text-white/30 text-center py-6">Add holdings to see allocation</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header — bigger title + 4-mode toggle */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Allocation</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            How your portfolio is spread across {MODE_META.find((m) => m.key === mode)?.label.toLowerCase().replace("by ", "")}.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: "var(--bg-base)" }}>
          {MODE_META.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors"
              style={{
                background: mode === m.key ? "rgba(16,185,129,0.18)" : "transparent",
                color: mode === m.key ? "#10b981" : "var(--text-secondary)",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Donut + legend — donut is bigger now (220px vs prior 160px) */}
      <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
        <div className="relative shrink-0 mx-auto md:mx-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} onMouseLeave={() => setHoverIdx(null)}>
            {arcs.map((a) => (
              <path
                key={`${a.label}-${a.idx}`}
                d={a.path}
                fill={a.color}
                stroke="var(--bg-card)"
                strokeWidth="2"
                style={{
                  cursor: "pointer",
                  opacity: hoverIdx == null || hoverIdx === a.idx ? 1 : 0.35,
                  transition: "opacity 150ms",
                }}
                onMouseEnter={() => setHoverIdx(a.idx)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            {hovered ? (
              <>
                <div className="text-[10px] uppercase tracking-wider truncate max-w-full" style={{ color: "var(--text-secondary)" }}>
                  {hovered.label}
                </div>
                <div className="text-2xl font-black tabular-nums" style={{ color: hovered.color }}>
                  {hovered.pct.toFixed(1)}%
                </div>
                <div className="text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  ${hovered.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Total
                </div>
                <div className="text-2xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
                  ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                  {slices.length} {slices.length === 1 ? "slice" : "slices"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend — wider so industry labels fit */}
        <div className="flex-1 min-w-0 space-y-1.5 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {arcs.map((a) => (
            <button
              key={`legend-${a.label}-${a.idx}`}
              onMouseEnter={() => setHoverIdx(a.idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="flex items-center gap-2 text-xs cursor-default w-full text-left px-2 py-1 rounded-md hover:bg-[var(--bg-base)] transition-colors"
              style={{ opacity: hoverIdx == null || hoverIdx === a.idx ? 1 : 0.5, transition: "opacity 150ms" }}
            >
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: a.color }} />
              <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.label}</span>
              <span className="ml-auto shrink-0 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                {a.pct.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
