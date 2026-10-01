"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { CalendarDays } from "lucide-react"
import WidgetHelp from "@/components/ui/WidgetHelp"
import type { EconomicEvent } from "@/lib/calendar"

const SHOW = 3

// Next high/medium-impact releases, compact (Glass Terminal right panel).
export default function NextOnCalendarWidget() {
  const t = useTranslations("Widgets")
  const locale = useLocale()
  const [events, setEvents] = useState<EconomicEvent[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/calendar?window=7d")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events?: EconomicEvent[] }) => {
        if (cancelled) return
        const now = Date.now()
        const next = (d.events ?? [])
          .filter((e) => e.impact !== "low" && new Date(e.time).getTime() >= now)
          .sort((a, b) => a.time.localeCompare(b.time))
          .slice(0, SHOW)
        setEvents(next)
      })
      .catch(() => !cancelled && setEvents([]))
    return () => { cancelled = true }
  }, [])

  return (
    <div className="pz-glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[.1em] flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
          <CalendarDays size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t("next_calendar_label")}</span>
        </h3>
        <WidgetHelp label={t("next_calendar_label")} text={t("next_calendar_text")} />
      </div>

      {events === null ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("next_calendar_empty")}</p>
      ) : (
        <div className="space-y-2.5">
          {events.map((e) => {
            const d = new Date(e.time)
            const high = e.impact === "high"
            return (
              <Link key={e.id} href="/calendar" className="flex items-center gap-2.5 group">
                <div
                  className="w-10 flex-shrink-0 text-center rounded-lg py-1 leading-tight"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}
                >
                  <span className="block text-[9px] uppercase" style={{ color: "var(--text-secondary)" }}>
                    {d.toLocaleDateString(locale, { month: "short" })}
                  </span>
                  <b className="block text-sm font-mono" style={{ color: "var(--text-primary)" }}>{d.getDate()}</b>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate group-hover:text-emerald-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                    {e.flag ? `${e.flag} ` : ""}{e.event}
                  </p>
                  <p className="text-[11px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>
                    {d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    {e.forecast ? ` · ${e.forecast}${e.unit ?? ""}` : ""}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold uppercase flex-shrink-0"
                  style={{ color: high ? "var(--down)" : "var(--accent-2)" }}
                >
                  {high ? t("impact_high") : t("impact_med")}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
