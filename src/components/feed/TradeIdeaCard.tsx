"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Hourglass, Ban, Timer } from "lucide-react"
import { ink } from "@/lib/ink"
import { useNow } from "@/hooks/useNow"
import { formatCountdown, formatPrice, pointsIfHit } from "@/lib/ranked"
import type { RankedFields } from "@/components/feed/RankedCallStatus"

// Glass Terminal trade-idea block: ticker row with live price, sparkline with
// the target as a dashed line, Entry/Target/Upside/Conviction strip, a compact
// Ranked Call status line, and the community bull/bear sentiment bar.

export interface IdeaAnalysis {
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  timeframe: string
  entry?: string
  target?: string
  conviction?: number
  logoUrl?: string | null
  priceSource?: "crypto" | "stooq"
  priceKey?: string
}

interface Props {
  postId: string
  createdAt: string
  analysis: IdeaAnalysis
  ranked: RankedFields | null
  outcomeReturnPct?: number | null
  votes: { userId: string; bullish: boolean }[]
  currentUserId: string
}

function num(s?: string | null): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/[$,\s]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}
const fmt = (p: number | null) => (p == null ? "—" : formatPrice(p))
const ms = (v?: string | Date | null) => (v ? new Date(v).getTime() : null)

function Sparkline({ closes, target, up }: { closes: number[]; target: number | null; up: boolean }) {
  const W = 600, H = 78
  const vals = target != null ? [...closes, target] : closes
  const min = Math.min(...vals), max = Math.max(...vals)
  const pad = (max - min) * 0.08 || max * 0.01
  const y = (v: number) => H - ((v - (min - pad)) / (max - min + 2 * pad)) * H
  const pts = closes.map((v, i) => `${((i / Math.max(1, closes.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const color = up ? "var(--up)" : "var(--down)"
  const gid = useMemo(() => `spk${Math.random().toString(36).slice(2, 8)}`, [])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full h-[78px]" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {target != null && (
        <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--accent-hi)" strokeDasharray="4 5"
          strokeWidth="1" opacity=".75" vectorEffect="non-scaling-stroke" />
      )}
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function TradeIdeaCard({ postId, createdAt, analysis: a, ranked, outcomeReturnPct, votes, currentUserId }: Props) {
  const now = useNow()
  const bull = a.direction === "bullish"
  const bear = a.direction === "bearish"
  const dirColor = bull ? "var(--up)" : bear ? "var(--down)" : "#eab308"
  const isRanked = !!ranked?.rankedDeadline
  const status = ranked?.outcomeStatus ?? "OPEN"
  const resolved = isRanked && status !== "OPEN"

  const entry = (isRanked ? ranked?.rankedEntry : null) ?? num(a.entry)
  const target = (isRanked ? ranked?.rankedTarget : null) ?? num(a.target)
  const startMs = ms(ranked?.rankedStartsAt) ?? ms(createdAt) ?? Date.now()
  const endMs = resolved ? (ms(ranked?.outcomeAt) ?? ms(ranked?.rankedDeadline)) : null

  // Sparkline: fetched lazily once the card is near the viewport.
  const ref = useRef<HTMLDivElement>(null)
  const [closes, setCloses] = useState<number[] | null>(null)
  useEffect(() => {
    if (!a.priceSource || !a.priceKey || !ref.current) return
    let cancelled = false
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      const qs = new URLSearchParams({ source: a.priceSource!, key: a.priceKey!, ticker: a.ticker, from: String(startMs) })
      if (endMs) qs.set("to", String(endMs))
      // Lead-in as long as the call itself (min 3 days) so the trend into the call shows.
      const windowMs = (ms(ranked?.rankedDeadline) ?? startMs + 7 * 86_400_000) - startMs
      qs.set("ctx", String(Math.max(3 * 86_400_000, windowMs)))
      fetch(`/api/market/spark?${qs}`)
        .then((r) => (r.ok ? r.json() : { closes: [] }))
        .then((d: { closes?: number[] }) => !cancelled && setCloses(d.closes ?? []))
        .catch(() => !cancelled && setCloses([]))
    }, { rootMargin: "200px" })
    io.observe(ref.current)
    return () => { cancelled = true; io.disconnect() }
  }, [a.priceSource, a.priceKey, a.ticker, startMs, endMs])

  // A hit settles on an intraday high/low touching the target, which hourly
  // closes can miss, so for hits the result price is the target itself.
  const hit = isRanked && status === "TARGET_HIT"
  const last = hit && target ? target
    : closes && closes.length ? closes[closes.length - 1] : (ranked?.rankedLastPrice ?? null)
  const chartCloses = hit && target && closes && closes.length > 1 ? [...closes, target] : closes
  const sinceCall = entry && last ? ((last - entry) / entry) * 100 : null
  const upside = entry && target ? ((target - entry) / entry) * 100 : null
  const conviction = Math.max(0, Math.min(5, a.conviction ?? 0))

  // Sentiment
  const [vs, setVs] = useState(() => ({
    bull: votes.filter((v) => v.bullish).length,
    bear: votes.filter((v) => !v.bullish).length,
    mine: votes.find((v) => v.userId === currentUserId)?.bullish ?? null as boolean | null,
  }))
  const [voting, setVoting] = useState(false)
  async function vote(b: boolean) {
    if (voting) return
    setVoting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/sentiment`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bullish: b }),
      })
      if (res.ok) setVs(await res.json())
    } finally { setVoting(false) }
  }
  const total = vs.bull + vs.bear
  const bullPct = total ? Math.round((vs.bull / total) * 100) : 50

  // Ranked status line
  let statusLine: { icon: typeof Timer; text: string; rep: string | null; color: string } | null = null
  if (isRanked && ranked?.rankedDeadline) {
    const deadline = ms(ranked.rankedDeadline)!
    const pct = Math.round(Math.max(0, Math.min(1, ranked.rankedProgress ?? 0)) * 100)
    if (status === "TARGET_HIT") {
      const hitAt = ms(ranked.outcomeAt) ?? deadline
      statusLine = { icon: Check, text: `Target hit in ${formatCountdown(hitAt - startMs)}`, rep: ranked.rankedPoints != null ? `+${ranked.rankedPoints} rep` : null, color: "var(--up)" }
    } else if (status === "EXPIRED") {
      statusLine = { icon: Hourglass, text: `Missed · reached ${pct}% of target`, rep: ranked.rankedPoints != null ? `−${Math.abs(ranked.rankedPoints)} rep` : null, color: "var(--down)" }
    } else if (status === "VOID") {
      statusLine = { icon: Ban, text: "Voided · no points either way", rep: null, color: "var(--text-secondary)" }
    } else {
      const left = deadline - (now || Date.now())
      const stake = ranked.rankedDifficulty != null ? pointsIfHit(ranked.rankedDifficulty) : null
      statusLine = {
        icon: Timer,
        text: left > 0 ? `${pct}% of the way · ${formatCountdown(left)} left` : "Settling…",
        rep: stake != null ? `+${stake} at stake` : null,
        color: "var(--accent-2)",
      }
    }
  }
  const progressPct = isRanked ? (status === "TARGET_HIT" ? 100 : Math.round(Math.max(0, Math.min(1, ranked?.rankedProgress ?? 0)) * 100)) : null

  return (
    <div ref={ref} className="space-y-2.5">
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--idea-bg)", border: "1px solid var(--glass-border)" }}>
        {/* Ticker row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          {a.logoUrl && (
            <img src={a.logoUrl} alt="" className="w-6 h-6 rounded-md object-contain flex-shrink-0" style={{ background: "white", padding: 2 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
          )}
          <span className="font-mono text-base font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>{a.ticker}</span>
          <span className="text-[10.5px] font-extrabold tracking-[.06em] px-2 py-0.5 rounded-lg"
            style={{ color: dirColor, background: bull ? "rgba(46,230,168,0.12)" : bear ? "rgba(255,92,122,0.14)" : "rgba(234,179,8,0.14)" }}>
            {bull ? "LONG" : bear ? "SHORT" : "NEUTRAL"}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--text-secondary)", background: "var(--bg-elevated)" }}>
            {isRanked ? ranked?.rankedTf ?? a.timeframe : a.timeframe}
          </span>
          <div className="ml-auto text-right font-mono leading-tight">
            <b className="block text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>{fmt(last)}</b>
            {sinceCall != null && (
              <small className="text-[11px] tabular-nums" style={{ color: (sinceCall >= 0) === !bear ? "var(--up)" : "var(--down)" }}>
                {sinceCall >= 0 ? "+" : "−"}{Math.abs(sinceCall).toFixed(2)}% {hit ? "target hit" : resolved ? "at deadline" : "since call"}
              </small>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {a.priceSource && a.priceKey && (
          chartCloses === null
            ? <div className="h-[78px] animate-pulse" style={{ background: "var(--glass)" }} />
            : chartCloses.length > 1
              ? <Sparkline closes={chartCloses} target={target} up={chartCloses[chartCloses.length - 1] >= chartCloses[0]} />
              : null
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
          {[
            { label: "Entry", value: <span style={{ color: "var(--text-primary)" }}>{entry ? fmt(entry) : "—"}</span> },
            { label: "Target", value: <span style={{ color: dirColor }}>{target ? fmt(target) : "—"}</span> },
            { label: "Upside", value: <span style={{ color: dirColor }}>{upside != null ? `${upside >= 0 ? "+" : "−"}${Math.abs(upside).toFixed(1)}%` : "—"}</span> },
            {
              label: "Conviction",
              value: (
                <span className="flex gap-[3px] mt-1.5" title={`Conviction ${conviction}/5: how confident the author is (self-rated)`} aria-label={`Conviction ${conviction} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className="block w-3 h-[5px] rounded-sm" style={{ background: n <= conviction ? "var(--accent-hi)" : "var(--glass-border)" }} />
                  ))}
                </span>
              ),
            },
          ].map((s, i) => (
            <div key={s.label} className={`px-3 py-2 ${i % 2 === 1 ? "border-l" : "sm:border-l"} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 0 ? "!border-l-0" : ""}`}
              style={{ borderColor: "var(--glass-border)" }}>
              <small className="block text-[10px] uppercase tracking-[.08em]" style={{ color: "var(--text-secondary)" }}>{s.label}</small>
              <b className="font-mono text-[12.5px] tabular-nums">{s.value}</b>
            </div>
          ))}
        </div>

        {/* Ranked status */}
        {statusLine && (
          <div className="px-3 py-2 flex items-center gap-2.5" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <statusLine.icon size={13} style={{ color: statusLine.color }} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{statusLine.text}</p>
              {progressPct != null && (
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: statusLine.color }} />
                </div>
              )}
            </div>
            {statusLine.rep && <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color: statusLine.color }}>{statusLine.rep}</span>}
          </div>
        )}
        {!isRanked && outcomeReturnPct != null && (
          <div className="px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5" style={{ borderTop: "1px solid var(--glass-border)", color: ink("#10b981") }}>
            <Check size={13} /> Target hit +{outcomeReturnPct}%
          </div>
        )}
      </div>

      {/* Community sentiment */}
      {a.direction !== "neutral" && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,92,122,0.22)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total ? bullPct : 0}%`, background: "var(--up)" }} />
            </div>
            <div className="flex justify-between mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {total ? (
                <>
                  <span style={{ color: "var(--up)" }}>{bullPct}% {bull ? "agree · " : ""}Bullish</span>
                  <span style={{ color: "var(--down)" }}>{100 - bullPct}% {bear ? "agree · " : ""}Bearish</span>
                </>
              ) : (
                <span>No votes yet: are you with this call?</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {([true, false] as const).map((b) => (
              <button key={String(b)} type="button" disabled={voting} onClick={() => vote(b)}
                aria-pressed={vs.mine === b}
                title={b ? "I'm bullish on this" : "I'm bearish on this"}
                className="text-[11px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
                style={vs.mine === b
                  ? { background: b ? "rgba(46,230,168,0.16)" : "rgba(255,92,122,0.16)", color: b ? "var(--up)" : "var(--down)", border: `1px solid ${b ? "rgba(46,230,168,0.4)" : "rgba(255,92,122,0.4)"}` }
                  : { background: "var(--glass)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}>
                {b ? "▲ Bull" : "▼ Bear"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
