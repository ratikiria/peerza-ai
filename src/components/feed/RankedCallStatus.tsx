"use client"

import { Check, Hourglass, Timer, Ban } from "lucide-react"
import { ink } from "@/lib/ink"
import { useNow } from "@/hooks/useNow"
import { formatCountdown, formatCountdownShort, formatPrice, pointsIfHit, STYLE_META, TF_DEFS, isRankedTf } from "@/lib/ranked"

export interface RankedFields {
  outcomeStatus?: "OPEN" | "TARGET_HIT" | "EXPIRED" | "VOID"
  outcomeAt?: string | Date | null
  rankedTf?: string | null
  rankedStartsAt?: string | Date | null
  rankedDeadline?: string | Date | null
  rankedEntry?: number | null
  rankedTarget?: number | null
  rankedDifficulty?: number | null
  rankedPoints?: number | null
  rankedProgress?: number | null
  rankedLastPrice?: number | null
}

const R = 26
const CIRC = 2 * Math.PI * R

function ms(v: string | Date | null | undefined): number | null {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

function fmt(p: number | null | undefined): string {
  return p == null ? "—" : formatPrice(p)
}

export default function RankedCallStatus({ call }: { call: RankedFields }) {
  const now = useNow()
  const status = call.outcomeStatus ?? "OPEN"
  const start = ms(call.rankedStartsAt)
  const deadline = ms(call.rankedDeadline)
  if (!deadline || !start) return null

  const progress = status === "TARGET_HIT" ? 1 : Math.max(0, Math.min(1, call.rankedProgress ?? 0))
  const progressPct = Math.round(progress * 100)
  const stake = call.rankedDifficulty != null ? pointsIfHit(call.rankedDifficulty) : null
  const styleColor = isRankedTf(call.rankedTf) ? STYLE_META[TF_DEFS[call.rankedTf].style].color : "#60a5fa"
  const deferred = status === "OPEN" && now > 0 && now < start

  let ringColor: string, ringFrac: number, ringValue: string, ringLabel: string
  let barColor: string, title: string, sub: string, rep: string | null, repColor: string
  let Icon = Timer, tone: "live" | "hit" | "miss" | "void" = "live"

  if (status === "TARGET_HIT") {
    const hitAt = ms(call.outcomeAt) ?? deadline
    ringColor = "#34d399"; ringFrac = 1; ringValue = formatCountdownShort(hitAt - start); ringLabel = "to hit"
    barColor = "#34d399"; Icon = Check; tone = "hit"
    title = `Target hit in ${formatCountdown(hitAt - start)}`
    sub = deadline - hitAt > 0 ? `Beat the deadline by ${formatCountdown(deadline - hitAt)}` : "Hit right at the deadline"
    rep = call.rankedPoints != null ? `+${call.rankedPoints} rep` : null; repColor = "#34d399"
  } else if (status === "EXPIRED") {
    ringColor = "#6b7280"; ringFrac = 1; ringValue = "0m"; ringLabel = "expired"
    barColor = "#9ca3af"; Icon = Hourglass; tone = "miss"
    title = `Expired · reached ${progressPct}% of target`
    sub = "Counts as a miss on the track record"
    rep = call.rankedPoints != null ? `−${Math.abs(call.rankedPoints)} rep` : null; repColor = "#fb7185"
  } else if (status === "VOID") {
    ringColor = "#6b7280"; ringFrac = 1; ringValue = "—"; ringLabel = "void"
    barColor = "#9ca3af"; Icon = Ban; tone = "void"
    title = "Voided · no points either way"
    sub = "Market data couldn't settle this call fairly"
    rep = null; repColor = "#9ca3af"
  } else {
    const left = now > 0 ? deadline - Math.max(now, start) : deadline - start
    const total = deadline - start
    ringColor = styleColor; ringFrac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
    ringValue = now > 0 ? formatCountdownShort(left) : "…"; ringLabel = "left"
    barColor = "#34d399"
    title = deferred ? "Starts at the next market open" : now > deadline ? "Settling…" : `Live · ${progressPct}% of the way there`
    const due = new Date(deadline).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    sub = deferred ? "Entry locks at the opening price" : now > 0 && left > 0 ? `${formatCountdown(left)} left · due ${due}` : `Due ${due}`
    rep = stake != null ? `+${stake} at stake` : null; repColor = "#93c5fd"
  }

  const toneStyles = {
    live: { bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)", iconBg: "rgba(96,165,250,0.15)", icon: ink("#60a5fa"), fg: ink("#93c5fd") },
    hit:  { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.35)", iconBg: "#34d399", icon: "#0f1117", fg: ink("#6ee7b7") },
    miss: { bg: "var(--bg-card)",        border: "var(--border)",          iconBg: "var(--bg-elevated)", icon: "var(--text-secondary)", fg: "var(--text-primary)" },
    void: { bg: "var(--bg-card)",        border: "var(--border)",          iconBg: "var(--bg-elevated)", icon: "var(--text-secondary)", fg: "var(--text-secondary)" },
  }[tone]

  return (
    <div className="mt-2 pt-2 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 flex-shrink-0" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle cx="32" cy="32" r={R} fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(CIRC * ringFrac).toFixed(1)} ${CIRC.toFixed(1)}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-mono font-bold leading-none" style={{ color: ink(ringColor) }}>{ringValue}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-secondary)" }}>{ringLabel}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="relative h-2 rounded-full" style={{ background: "var(--border)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: barColor }} />
            <div className="absolute -top-1 w-4 h-4 -ml-2 rounded-full border-[3px] transition-all duration-500"
              style={{ left: `${progressPct}%`, background: "var(--bg-base)", borderColor: barColor }} />
          </div>
          <div className="flex justify-between gap-2 text-[10px] font-mono tabular-nums">
            <span style={{ color: "var(--text-secondary)" }}>Entry {call.rankedEntry != null ? fmt(call.rankedEntry) : "at open"}</span>
            {status === "OPEN" && !deferred && call.rankedLastPrice != null && (
              <span className="font-bold" style={{ color: ink("#34d399") }}>Now {fmt(call.rankedLastPrice)}</span>
            )}
            <span style={{ color: "var(--text-primary)" }}>Target {fmt(call.rankedTarget)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: toneStyles.bg, border: `1px solid ${toneStyles.border}` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: toneStyles.iconBg, color: toneStyles.icon }}>
          <Icon size={15} strokeWidth={tone === "hit" ? 3 : 2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: toneStyles.fg }}>{title}</p>
          <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{sub}</p>
        </div>
        {rep && <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: ink(repColor) }}>{rep}</span>}
      </div>
    </div>
  )
}
