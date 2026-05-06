"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Globe, Activity } from "lucide-react"
import WidgetHelp from "@/components/ui/WidgetHelp"

// ── Definitions ───────────────────────────────────────────────────────────────

interface Exchange {
  name: string
  city: string
  tz: string
  flag: string
  oH: number; oM: number
  cH: number; cM: number
}

const STOCK_EXCHANGES: Exchange[] = [
  { name: "NYSE",      city: "New York",  tz: "America/New_York",  flag: "🇺🇸", oH: 9,  oM: 30, cH: 16, cM: 0  },
  { name: "London",    city: "LSE",       tz: "Europe/London",     flag: "🇬🇧", oH: 8,  oM: 0,  cH: 16, cM: 30 },
  { name: "Frankfurt", city: "XETRA",     tz: "Europe/Berlin",     flag: "🇩🇪", oH: 9,  oM: 0,  cH: 17, cM: 30 },
  { name: "Hong Kong", city: "HKEX",      tz: "Asia/Hong_Kong",    flag: "🇭🇰", oH: 9,  oM: 30, cH: 16, cM: 0  },
  { name: "Tokyo",     city: "TSE",       tz: "Asia/Tokyo",        flag: "🇯🇵", oH: 9,  oM: 0,  cH: 15, cM: 30 },
  { name: "Sydney",    city: "ASX",       tz: "Australia/Sydney",  flag: "🇦🇺", oH: 10, oM: 0,  cH: 16, cM: 0  },
]

// Forex sessions — local trading hours per financial center.
// These are conventional forex session windows in each city's time, so DST is handled by Intl.
const FOREX_SESSIONS: Exchange[] = [
  { name: "Sydney",   city: "🇦🇺 AU", tz: "Australia/Sydney", flag: "🇦🇺", oH: 7, oM: 0, cH: 16, cM: 0 },
  { name: "Tokyo",    city: "🇯🇵 JP", tz: "Asia/Tokyo",       flag: "🇯🇵", oH: 9, oM: 0, cH: 18, cM: 0 },
  { name: "London",   city: "🇬🇧 UK", tz: "Europe/London",    flag: "🇬🇧", oH: 8, oM: 0, cH: 17, cM: 0 },
  { name: "New York", city: "🇺🇸 US", tz: "America/New_York", flag: "🇺🇸", oH: 8, oM: 0, cH: 17, cM: 0 },
]

const STORAGE_KEY = "peerza-market-hours-mode-v1"
type Mode = "stocks" | "forex"

// ── Status calculation ────────────────────────────────────────────────────────

interface Status {
  isOpen: boolean
  minsLeft: number     // minutes until close (when open)
  minsUntilOpen: number // minutes until next open (when closed)
}

function getStatus(ex: Exchange, weekendCloses = true): Status {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ex.tz, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(new Date())
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const h  = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0")
  const m  = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0")

  const isWeekend = wd === "Sat" || wd === "Sun"
  if (weekendCloses && isWeekend) {
    // Approximate minutes until Monday open from current time
    const dayIdx = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd)
    const daysToMon = dayIdx === 0 ? 1 : 2 // Sun→1, Sat→2
    const minsToMidnight = (24 - h) * 60 - m
    const fullDays = (daysToMon - 1) * 24 * 60
    const minsUntilOpen = minsToMidnight + fullDays + ex.oH * 60 + ex.oM
    return { isOpen: false, minsLeft: 0, minsUntilOpen }
  }

  const cur = h * 60 + m
  const open = ex.oH * 60 + ex.oM
  const close = ex.cH * 60 + ex.cM
  if (cur >= open && cur < close) {
    return { isOpen: true, minsLeft: close - cur, minsUntilOpen: 0 }
  }
  // Closed today: if before open, minutes until open today; else until tomorrow's open
  const minsUntilOpen = cur < open
    ? open - cur
    : (24 * 60 - cur) + open
  return { isOpen: false, minsLeft: 0, minsUntilOpen }
}

function fmtCountdown(m: number): string {
  if (m <= 0) return ""
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h`
  }
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarketHoursWidget() {
  const t = useTranslations("Widgets")
  const [mode, setMode] = useState<Mode>("stocks")
  const [tick, setTick] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === "stocks" || saved === "forex") setMode(saved)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  function changeMode(next: Mode) {
    setMode(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
  }

  // Recompute on tick
  void tick // referenced so React re-renders when tick changes
  const list = mode === "stocks" ? STOCK_EXCHANGES : FOREX_SESSIONS
  const statuses = hydrated ? list.map((ex) => ({ ex, ...getStatus(ex) })) : null

  // Forex global volume — count overlapping open sessions
  let openCount = 0
  if (mode === "forex" && statuses) {
    openCount = statuses.filter((s) => s.isOpen).length
  }
  const volumeLabel: "HIGH" | "MEDIUM" | "LOW" =
    openCount >= 2 ? "HIGH" : openCount === 1 ? "MEDIUM" : "LOW"
  const volumeColor =
    volumeLabel === "HIGH" ? "#10b981" : volumeLabel === "MEDIUM" ? "#f59e0b" : "#8a8d9a"

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
          <Globe size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t("market_hours_label")}</span>
        </h3>
        <div className="flex-shrink-0">
          <WidgetHelp
            label={t("market_hours_label")}
            text={t("market_hours_text")}
          />
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 mb-3 p-0.5 rounded-lg"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
        <ModeButton active={mode === "stocks"} onClick={() => changeMode("stocks")} label="Stocks" />
        <ModeButton active={mode === "forex"}  onClick={() => changeMode("forex")}  label="Forex" />
      </div>

      {/* Forex global volume badge */}
      {mode === "forex" && statuses && (
        <>
          <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-2"
            style={{ background: volumeColor + "1a", border: `1px solid ${volumeColor}40` }}>
            <div className="flex items-center gap-1.5">
              <Activity size={12} style={{ color: volumeColor }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Volume</span>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold" style={{ color: volumeColor }}>{volumeLabel}</p>
              <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                {openCount === 0 ? "All sessions closed" : `${openCount} session${openCount !== 1 ? "s" : ""} open`}
              </p>
            </div>
          </div>

          {/* 24-hour session timeline */}
          <SessionTimeline />
        </>
      )}

      {/* Sessions / exchanges list */}
      <div className="space-y-2">
        {!statuses
          ? list.map((ex) => (
              <div key={ex.name} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-40">{ex.flag}</span>
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 rounded" style={{ background: "var(--bg-elevated)" }} />
                    <div className="h-2 w-10 rounded" style={{ background: "var(--bg-elevated)" }} />
                  </div>
                </div>
                <div className="h-2.5 w-12 rounded" style={{ background: "var(--bg-elevated)" }} />
              </div>
            ))
          : statuses.map(({ ex, isOpen, minsLeft, minsUntilOpen }) => (
              <div key={ex.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{ex.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-none truncate" style={{ color: "var(--text-primary)" }}>
                      {ex.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{ex.city}</p>
                  </div>
                </div>
                {isOpen ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-emerald-400">Open</p>
                      <p className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        closes {fmtCountdown(minsLeft)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-rose-400">Closed</p>
                      <p className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        opens {fmtCountdown(minsUntilOpen)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
        }
      </div>

      <p className="text-[10px] mt-3" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
        {mode === "stocks" ? "Local exchange hours · Mon–Fri" : "FX sessions roll across 24h · Mon–Fri"}
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all"
      style={active
        ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
        : { background: "transparent", color: "var(--text-secondary)" }}>
      {label}
    </button>
  )
}

// ── 24h session timeline ──────────────────────────────────────────────────────
// Shows each forex session as a colored bar across a 24h strip with a "now" marker.
// Bars use UTC offsets so they line up across timezones.

const SESSION_BARS: { name: string; color: string; startUtc: number; endUtc: number }[] = [
  // Approximate UTC windows (winter, ignoring DST shifts of 1h either way)
  { name: "Sydney",   color: "#fb7185", startUtc: 22, endUtc: 7 },   // 22-07 UTC (wraps midnight)
  { name: "Tokyo",    color: "#fbbf24", startUtc: 0,  endUtc: 9 },
  { name: "London",   color: "#60a5fa", startUtc: 8,  endUtc: 17 },
  { name: "New York", color: "#a78bfa", startUtc: 13, endUtc: 22 },
]

function SessionTimeline() {
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => {
    function tick() {
      const now = new Date()
      setHour(now.getUTCHours() + now.getUTCMinutes() / 60)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  if (hour === null) return null
  const nowPct = (hour / 24) * 100

  return (
    <div className="mb-3">
      <div className="relative h-9">
        {SESSION_BARS.map((s, i) => {
          const top = i * 7
          // If session wraps midnight, render two bars
          if (s.endUtc < s.startUtc) {
            const a = { left: (s.startUtc / 24) * 100, w: ((24 - s.startUtc) / 24) * 100 }
            const b = { left: 0, w: (s.endUtc / 24) * 100 }
            return (
              <div key={s.name}>
                <div className="absolute h-1.5 rounded-full" style={{ top, left: `${a.left}%`, width: `${a.w}%`, background: s.color, opacity: 0.85 }} title={s.name} />
                <div className="absolute h-1.5 rounded-full" style={{ top, left: `${b.left}%`, width: `${b.w}%`, background: s.color, opacity: 0.85 }} title={s.name} />
              </div>
            )
          }
          const left = (s.startUtc / 24) * 100
          const w    = ((s.endUtc - s.startUtc) / 24) * 100
          return (
            <div key={s.name}
              className="absolute h-1.5 rounded-full"
              style={{ top, left: `${left}%`, width: `${w}%`, background: s.color, opacity: 0.85 }}
              title={s.name} />
          )
        })}
        {/* Now marker */}
        <div className="absolute top-0 bottom-0 w-0.5"
          style={{ left: `${nowPct}%`, background: "#f0f2f5", boxShadow: "0 0 6px rgba(255,255,255,0.6)" }} />
      </div>
      <div className="flex justify-between text-[8px] mt-1" style={{ color: "var(--text-secondary)" }}>
        <span>0h UTC</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
    </div>
  )
}
