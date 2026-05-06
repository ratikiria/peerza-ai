"use client"

import { useEffect, useState } from "react"

interface Stats {
  symbol: string
  name: string
  price: number
  changePct: number
  volume24h?: number
  marketCap?: number
  high?: number
  low?: number
  highLabel?: string
  lowLabel?: string
  currency: string
  source: "crypto" | "stock"
}

function formatPrice(v: number, currency: string): string {
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: v < 1 ? 4 : 2,
    maximumFractionDigits: v < 1 ? 6 : 2,
  }
  try { return new Intl.NumberFormat("en-US", opts).format(v) }
  catch { return v.toFixed(2) }
}

function formatCompact(v?: number): string {
  if (v == null || !isFinite(v)) return "—"
  const abs = Math.abs(v)
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + "T"
  if (abs >= 1e9)  return (v / 1e9).toFixed(2)  + "B"
  if (abs >= 1e6)  return (v / 1e6).toFixed(2)  + "M"
  if (abs >= 1e3)  return (v / 1e3).toFixed(2)  + "K"
  return v.toFixed(0)
}

export default function SymbolStats({ tv }: { tv: string }) {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
    fetch(`/api/workspace/symbol-stats?tv=${encodeURIComponent(tv)}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          if (!abort) setError(d.error ?? "No data")
          return null
        }
        return r.json()
      })
      .then((d) => { if (!abort && d && !d.error) setStats(d) })
      .catch(() => { if (!abort) setError("Failed to load") })
      .finally(() => { if (!abort) setLoading(false) })
    return () => { abort = true }
  }, [tv])

  if (loading && !stats) {
    return (
      <div
        className="flex gap-3 px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="h-4 w-28 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
        <div className="h-4 w-20 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
        <div className="h-4 w-24 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div
        className="px-4 py-1.5 text-[10px]"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
        }}
      >
        Stats unavailable for this symbol — open the chart for live data.
      </div>
    )
  }

  const up = stats.changePct >= 0
  const color = up ? "#10b981" : "#ef4444"

  return (
    <div
      className="flex items-center gap-5 px-4 py-2 overflow-x-auto whitespace-nowrap text-[11px]"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-card)",
        scrollbarWidth: "thin",
      }}
    >
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {formatPrice(stats.price, stats.currency)}
        </span>
        <span className="font-bold tabular-nums" style={{ color }}>
          {up ? "▲" : "▼"} {Math.abs(stats.changePct).toFixed(2)}%
        </span>
      </div>

      {stats.volume24h != null && (
        <Stat label="Vol 24h" value={formatCompact(stats.volume24h)} />
      )}
      {stats.marketCap != null && (
        <Stat label="Mkt Cap" value={formatCompact(stats.marketCap)} />
      )}
      {stats.high != null && (
        <Stat label={stats.highLabel ?? "High"} value={formatPrice(stats.high, stats.currency)} />
      )}
      {stats.low != null && (
        <Stat label={stats.lowLabel ?? "Low"} value={formatPrice(stats.low, stats.currency)} />
      )}
      {stats.name && (
        <span className="ml-auto opacity-70 truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>
          {stats.name}
        </span>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 flex-shrink-0">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  )
}
