"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Sparkles, Zap, Calendar as CalendarIcon } from "lucide-react"
import AriaAvatar from "@/components/ai-tutor/AriaAvatar"
import FlagImage from "./FlagImage"
import type { EconomicEvent } from "@/lib/calendar"

interface FxPrice {
  id: string
  symbol: string
  name: string
  price: number
  change: number
  up: boolean
}

const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" }

// FX pairs that move on economic data — the "watch this when CPI prints" set.
// Stooq IDs (matches /api/market/prices format).
const FX_PAIRS = [
  { id: "eurusd", symbol: "EUR/USD", flagL: "EU", flagR: "US" },
  { id: "gbpusd", symbol: "GBP/USD", flagL: "GB", flagR: "US" },
  { id: "usdjpy", symbol: "USD/JPY", flagL: "US", flagR: "JP" },
  { id: "audusd", symbol: "AUD/USD", flagL: "AU", flagR: "US" },
  { id: "usdcad", symbol: "USD/CAD", flagL: "US", flagR: "CA" },
  { id: "usdchf", symbol: "USD/CHF", flagL: "US", flagR: "CH" },
]

const FX_QUERY = FX_PAIRS.map((p) => p.id).join(",")

export default function CalendarRightPanel() {
  const [fx, setFx] = useState<FxPrice[]>([])
  const [topEvents, setTopEvents] = useState<EconomicEvent[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadFx() {
      try {
        const res = await fetch(`/api/market/prices?stooq=${FX_QUERY}`)
        if (!res.ok) return
        const arr = (await res.json()) as FxPrice[]
        if (!cancelled) setFx(Array.isArray(arr) ? arr : [])
      } catch {}
    }
    async function loadTop() {
      try {
        const res = await fetch("/api/calendar?window=week")
        if (!res.ok) return
        const data = await res.json()
        const events = (data.events ?? []) as EconomicEvent[]
        const high = events.filter((e) => e.impact === "high").slice(0, 5)
        if (!cancelled) setTopEvents(high)
      } catch {}
    }
    loadFx()
    loadTop()
    const fxInterval = setInterval(loadFx, 30_000)
    return () => { cancelled = true; clearInterval(fxInterval) }
  }, [])

  return (
    <aside
      className="w-72 flex-shrink-0 hidden xl:block sticky overflow-y-auto"
      style={{ top: "64px", height: "calc(100vh - 64px)", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      <div className="space-y-3 py-4 pb-8">

        {/* Aria CTA */}
        <section className="rounded-2xl p-4 relative overflow-hidden" style={cardStyle}>
          <div className="absolute -top-6 -right-4 opacity-30 pointer-events-none">
            <AriaAvatar size={64} />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={11} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Ask Aria</span>
          </div>
          <p className="text-xs leading-snug" style={{ color: "var(--text-primary)" }}>
            Confused by an event? Get a plain-English explanation.
          </p>
          <Link
            href="/ai-tutor?q=What%20are%20the%20most%20important%20economic%20events%20to%20watch%20this%20week%20and%20why%3F"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }}
          >
            What should I watch this week? →
          </Link>
        </section>

        {/* This week's biggest */}
        <section className="rounded-2xl overflow-hidden" style={cardStyle}>
          <header className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <Zap size={11} className="text-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              This week — high impact
            </span>
          </header>
          {topEvents.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>
              Quiet week — no high-impact events.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {topEvents.map((evt) => {
                const t = new Date(evt.time)
                const isToday = new Date().toDateString() === t.toDateString()
                return (
                  <li key={evt.id} className="px-3 py-2 flex items-center gap-2">
                    <FlagImage code={evt.country} alt={evt.countryName} size={12} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }} title={evt.event}>
                        {evt.event}
                      </p>
                      <p className="text-[9px]" style={{ color: isToday ? "#10b981" : "var(--text-secondary)" }}>
                        {isToday ? "Today" : t.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {" · "}
                        {t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            href="/calendar"
            className="block px-3 py-2 text-[10px] text-center font-semibold transition-colors hover:bg-[var(--bg-base)]"
            style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            View full calendar →
          </Link>
        </section>

        {/* FX pairs — the instruments most reactive to economic data */}
        <section className="rounded-2xl overflow-hidden" style={cardStyle}>
          <header className="px-3 py-2.5 flex items-center gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <TrendingUp size={11} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Major FX pairs
            </span>
          </header>
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {FX_PAIRS.map((pair) => {
              const live = fx.find((f) => f.id?.toLowerCase() === pair.id)
              return (
                <li key={pair.id} className="px-3 py-2 flex items-center gap-2">
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <FlagImage code={pair.flagL} size={10} />
                    <FlagImage code={pair.flagR} size={10} />
                  </span>
                  <span className="text-[11px] font-mono font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                    {pair.symbol}
                  </span>
                  {live ? (
                    <>
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>
                        {fmtFx(live.price, pair.id)}
                      </span>
                      <span className="text-[10px] font-mono inline-flex items-center gap-0.5"
                        style={{ color: live.up ? "#10b981" : "#fb7185" }}>
                        {live.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {live.change > 0 ? "+" : ""}{live.change.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>—</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Footer note */}
        <p className="text-[10px] px-2 pt-1" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
          <CalendarIcon size={9} className="inline-block mr-1 align-text-bottom" />
          Times shown in your local timezone. FX prices refresh every 30s.
        </p>

      </div>
    </aside>
  )
}

// JPY pairs price >100, so use 2 decimals; everything else 4.
function fmtFx(price: number, id: string): string {
  if (id.endsWith("jpy")) return price.toFixed(2)
  return price.toFixed(4)
}
