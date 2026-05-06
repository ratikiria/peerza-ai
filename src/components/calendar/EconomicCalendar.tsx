"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, Filter, MessageCircle, Loader2 } from "lucide-react"
import { COUNTRY_OPTIONS, type EconomicEvent, type Impact } from "@/lib/calendar"
import FlagImage from "./FlagImage"
import DictionaryPopover from "@/components/dictionary/DictionaryPopover"

type Window = "today" | "week" | "30d"

interface CalendarPayload {
  events: EconomicEvent[]
  isDemoData: boolean
  cachedAt: string
}

const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" }

const IMPACT_META: Record<Impact, { label: string; color: string; bg: string; border: string }> = {
  high:   { label: "High",   color: "#fb7185", bg: "rgba(244,63,94,0.12)",  border: "rgba(244,63,94,0.4)" },
  medium: { label: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)" },
  low:    { label: "Low",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.4)" },
}

export default function EconomicCalendar() {
  const [data, setData] = useState<CalendarPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [window, setWindow] = useState<Window>("week")
  const [impactFilter, setImpactFilter] = useState<Set<Impact>>(new Set(["high", "medium", "low"]))
  const [countryFilter, setCountryFilter] = useState<Set<string>>(new Set(COUNTRY_OPTIONS.map((c) => c.code)))

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/calendar?window=${window}`)
        if (!res.ok) throw new Error(`Failed to load (${res.status})`)
        const payload = (await res.json()) as CalendarPayload
        if (!cancelled) setData(payload)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load calendar")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [window])

  // Apply client-side filters (cheap, gives instant feedback)
  const filtered = useMemo(() => {
    if (!data) return []
    return data.events.filter((e) => impactFilter.has(e.impact) && countryFilter.has(e.country))
  }, [data, impactFilter, countryFilter])

  // Group by day for sticky-header sections
  const grouped = useMemo(() => {
    const out: Array<{ dayKey: string; dayLabel: string; events: EconomicEvent[] }> = []
    const map = new Map<string, EconomicEvent[]>()
    for (const e of filtered) {
      const d = new Date(e.time)
      const key = d.toISOString().slice(0, 10)
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, list]) => {
        out.push({ dayKey: key, dayLabel: dayLabel(key), events: list })
      })
    return out
  }, [filtered])

  // Stats strip
  const stats = useMemo(() => {
    const high = filtered.filter((e) => e.impact === "high").length
    const today = new Date().toISOString().slice(0, 10)
    const todays = filtered.filter((e) => e.time.startsWith(today)).length
    return { total: filtered.length, high, today: todays }
  }, [filtered])

  function toggleImpact(level: Impact) {
    const next = new Set(impactFilter)
    if (next.has(level)) next.delete(level)
    else next.add(level)
    if (next.size === 0) next.add(level) // never empty
    setImpactFilter(next)
  }

  function toggleCountry(code: string) {
    const next = new Set(countryFilter)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    if (next.size === 0) next.add(code)
    setCountryFilter(next)
  }

  return (
    <div className="space-y-5">
      {/* Hero + stats */}
      <section className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-2"
              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.4)" }}>
              <CalendarDays size={11} />
              Economic Calendar
            </div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Markets are listening</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Upcoming releases, central bank decisions, and macro data — across the world&apos;s biggest economies.
            </p>
          </div>
          <div className="flex gap-3">
            <Stat label="Events" value={stats.total} />
            <Stat label="High impact" value={stats.high} accent="#fb7185" />
            <Stat label="Today" value={stats.today} accent="#10b981" />
          </div>
        </div>

      </section>

      {/* Filter bar */}
      <section className="rounded-2xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Filter size={13} style={{ color: "var(--text-secondary)" }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Filters</span>
        </div>

        {/* Window */}
        <div className="flex gap-2 flex-wrap">
          {(["today", "week", "30d"] as Window[]).map((w) => (
            <FilterChip
              key={w}
              active={window === w}
              onClick={() => setWindow(w)}
              label={w === "today" ? "Today" : w === "week" ? "This week" : "Next 30 days"}
            />
          ))}
        </div>

        {/* Impact */}
        <div className="flex gap-2 flex-wrap">
          {(["high", "medium", "low"] as Impact[]).map((level) => {
            const meta = IMPACT_META[level]
            const active = impactFilter.has(level)
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleImpact(level)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                style={
                  active
                    ? { background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }
                    : { background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                }
              >
                <ImpactDots level={level} active={active} />
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Country */}
        <div className="flex gap-1.5 flex-wrap">
          {COUNTRY_OPTIONS.map((c) => {
            const active = countryFilter.has(c.code)
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCountry(c.code)}
                className="pl-1.5 pr-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                style={
                  active
                    ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }
                    : { background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                }
              >
                <FlagImage code={c.code} alt={c.name} size={12} /> {c.code}
              </button>
            )
          })}
        </div>
      </section>

      {/* Events */}
      <section className="rounded-2xl overflow-hidden" style={cardStyle}>
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
        )}
        {error && (
          <div className="px-5 py-6 text-sm text-rose-400">{error}</div>
        )}
        {!loading && !error && grouped.length === 0 && (
          <div className="px-5 py-16 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            No events match your filters.
          </div>
        )}
        {!loading && !error && grouped.map((group) => (
          <div key={group.dayKey}>
            <div
              className="px-5 py-2.5 sticky top-0 z-10 text-xs font-bold uppercase tracking-wide flex items-center justify-between"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span>{group.dayLabel}</span>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {group.events.length} event{group.events.length === 1 ? "" : "s"}
              </span>
            </div>
            {group.events.map((evt) => (
              <EventRow key={evt.id} event={evt} />
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="px-3 py-2 rounded-xl text-center min-w-[78px]"
      style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
      <div className="text-xl font-black" style={{ color: accent ?? "var(--text-primary)" }}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</div>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
      style={
        active
          ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }
          : { background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
      }
    >
      {label}
    </button>
  )
}

function ImpactDots({ level, active }: { level: Impact; active: boolean }) {
  const count = level === "high" ? 3 : level === "medium" ? 2 : 1
  const meta = IMPACT_META[level]
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className="block w-1 h-1 rounded-full"
          style={{ background: i < count ? (active ? meta.color : "var(--text-secondary)") : "var(--border)" }}
        />
      ))}
    </span>
  )
}

function EventRow({ event }: { event: EconomicEvent }) {
  const meta = IMPACT_META[event.impact]
  const time = new Date(event.time)
  const timeLabel = time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  const isPast = time.getTime() < Date.now()

  // Compare actual vs forecast for the Actual pill variant.
  const actualVariant = ((): PillVariant => {
    if (event.actual == null) return "pending"
    const a = parseFloat(String(event.actual).replace(/[^\d.\-]/g, ""))
    const f = parseFloat(String(event.forecast ?? "").replace(/[^\d.\-]/g, ""))
    if (isNaN(a) || isNaN(f)) return "neutral"
    if (a > f) return "beat"
    if (a < f) return "miss"
    return "match"
  })()

  const ariaQuestion = encodeURIComponent(
    `Aria, the ${event.countryName} ${event.event} is coming up (previous ${event.previous ?? "?"}, forecast ${event.forecast ?? "?"}). What does this typically mean for markets?`,
  )

  return (
    <div
      className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-xs hover:bg-[var(--bg-base)] transition-colors group"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Time */}
      <div className="col-span-2 sm:col-span-1 font-mono font-semibold"
        style={{ color: isPast ? "var(--text-secondary)" : "var(--text-primary)" }}>
        {timeLabel}
      </div>

      {/* Country */}
      <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
        <FlagImage code={event.country} alt={event.countryName} size={14} />
        <span className="font-semibold text-[10px]" style={{ color: "var(--text-secondary)" }}>{event.country}</span>
      </div>

      {/* Event name + dictionary popover */}
      <div className="col-span-8 sm:col-span-5 font-medium truncate" style={{ color: "var(--text-primary)" }} title={event.event}>
        {event.event}
        <DictionaryPopover eventName={event.event} />
      </div>

      {/* Impact */}
      <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          title={`${meta.label} impact`}>
          <ImpactDots level={event.impact} active />
        </span>
      </div>

      {/* Previous / Forecast / Actual — color-coded pills */}
      <div className="col-span-12 sm:col-span-3 flex items-stretch gap-1.5">
        <DataPill label="Prev"     value={event.previous} variant="muted" />
        <DataPill label="Forecast" value={event.forecast} variant="forecast" />
        <DataPill label="Actual"   value={event.actual}   variant={actualVariant} />
      </div>

      {/* Ask Aria */}
      <div className="col-span-12 sm:col-span-1 flex justify-end">
        <Link
          href={`/ai-tutor?q=${ariaQuestion}`}
          title="Ask Aria about this event"
          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }}
        >
          <MessageCircle size={10} /> Ask Aria
        </Link>
      </div>
    </div>
  )
}

type PillVariant = "muted" | "forecast" | "beat" | "miss" | "match" | "pending" | "neutral"

const PILL_STYLE: Record<PillVariant, { bg: string; border: string; color: string; arrow?: "up" | "down" }> = {
  muted:    { bg: "var(--bg-base)",            border: "var(--border)",                color: "var(--text-secondary)" },
  forecast: { bg: "rgba(99,102,241,0.10)",     border: "rgba(99,102,241,0.35)",        color: "#a5b4fc" },
  beat:     { bg: "rgba(16,185,129,0.18)",     border: "rgba(16,185,129,0.50)",        color: "#10b981", arrow: "up" },
  miss:     { bg: "rgba(244,63,94,0.18)",      border: "rgba(244,63,94,0.50)",         color: "#fb7185", arrow: "down" },
  match:    { bg: "rgba(251,191,36,0.15)",     border: "rgba(251,191,36,0.40)",        color: "#fbbf24" },
  neutral:  { bg: "rgba(148,163,184,0.10)",    border: "rgba(148,163,184,0.35)",       color: "var(--text-primary)" },
  pending:  { bg: "transparent",               border: "rgba(148,163,184,0.30)",       color: "var(--text-secondary)" },
}

function DataPill({ label, value, variant }: { label: string; value: string | null; variant: PillVariant }) {
  // Pending = "Actual" not yet released. Keep the slot but use a dashed border + pulsing dot.
  const isPending = variant === "pending"
  const s = PILL_STYLE[variant]
  return (
    <div
      className="flex-1 min-w-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md transition-colors"
      style={{
        background: s.bg,
        border: `1px ${isPending ? "dashed" : "solid"} ${s.border}`,
      }}
    >
      <span className="text-[8px] font-bold uppercase tracking-wider leading-none mb-0.5"
        style={{ color: "var(--text-secondary)", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {isPending ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono leading-none"
          style={{ color: "var(--text-secondary)" }}>
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
          —
        </span>
      ) : (
        <span className="font-mono text-[11px] font-bold leading-none inline-flex items-center gap-0.5"
          style={{ color: s.color }}>
          {s.arrow === "up"   && <span aria-hidden>▲</span>}
          {s.arrow === "down" && <span aria-hidden>▼</span>}
          {value ?? "—"}
        </span>
      )}
    </div>
  )
}

function dayLabel(yyyymmdd: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(yyyymmdd + "T00:00:00")
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  return target.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}
