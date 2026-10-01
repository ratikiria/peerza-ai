"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { themeFor, MAX_PORTFOLIOS } from "@/lib/portfolio-themes"

export interface SwitcherItem {
  id: string            // portfolio id, or "all"
  name: string
  emoji: string
  color: string
  value: number
  dayChangePct: number | null
  positions: number
  mix: { color: string; weight: number }[]  // allocation bar segments
}

function fmtCompact(v: number) {
  return v.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    notation: Math.abs(v) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2,
  })
}

// Horizontal row of glass cards — one per portfolio, plus "All" and "New".
export default function PortfolioSwitcher({
  items, selected, onSelect, onCreate, count,
}: {
  items: SwitcherItem[]
  selected: string
  onSelect: (id: string) => void
  onCreate: () => void
  count: number   // real portfolios (excludes "all")
}) {
  const t = useTranslations("Portfolio")
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ scrollbarWidth: "none" }} role="tablist" aria-label={t("switcher_label")}>
      {items.map((p) => {
        const on = p.id === selected
        const th = themeFor(p.color)
        const up = (p.dayChangePct ?? 0) >= 0
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(p.id)}
            className="snap-start flex-shrink-0 w-[208px] rounded-2xl p-px text-left transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              background: on ? `linear-gradient(140deg, ${th.from}, transparent 45%, transparent 60%, ${th.to})` : "var(--glass-border)",
              boxShadow: on ? `0 10px 30px -12px ${th.from}66` : "none",
            }}
          >
            <div className="pz-glass h-full rounded-[15px] p-3.5 overflow-hidden" style={{ border: "none" }}>
              {/* theme glow */}
              <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full"
                style={{ background: `radial-gradient(circle, ${th.from}${on ? "40" : "1f"} 0%, transparent 70%)` }} />
              <div className="relative flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${th.from}33, ${th.to}22)`, border: `1px solid ${th.from}55` }}>
                  {p.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                  <p className="text-[10.5px]" style={{ color: "var(--text-secondary)" }}>
                    {t(p.positions === 1 ? "positions_one" : "positions_other", { count: p.positions })}
                  </p>
                </div>
              </div>
              <div className="relative mt-3 flex items-end justify-between gap-2">
                <p className="font-mono text-[17px] font-bold tabular-nums truncate" style={{ color: "var(--text-primary)" }}>
                  {fmtCompact(p.value)}
                </p>
                {p.dayChangePct != null && (
                  <span className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums flex-shrink-0"
                    style={{ color: up ? "var(--up)" : "var(--down)", background: up ? "rgba(46,230,168,0.10)" : "rgba(255,92,122,0.12)" }}>
                    {up ? "▲" : "▼"}{Math.abs(p.dayChangePct).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="relative mt-2.5 flex h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                {p.mix.map((m, i) => (
                  <span key={i} className="h-full" style={{ width: `${m.weight * 100}%`, background: m.color }} />
                ))}
              </div>
            </div>
          </button>
        )
      })}

      {count < MAX_PORTFOLIOS && (
        <button
          onClick={onCreate}
          className="snap-start flex-shrink-0 w-[150px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors hover:bg-[var(--glass)]"
          style={{ border: "1.5px dashed var(--glass-border)", color: "var(--text-secondary)" }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2ee6a8, #22c3ee)", color: "#04110c", boxShadow: "0 4px 18px var(--glow)" }}>
            <Plus size={18} />
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{t("new_portfolio")}</span>
          <span className="text-[10px]">{t("portfolio_count", { count, max: MAX_PORTFOLIOS })}</span>
        </button>
      )}
    </div>
  )
}
