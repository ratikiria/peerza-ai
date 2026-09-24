"use client"

import { useEffect, useMemo, useState } from "react"
import { Trophy, Lock, Loader2 } from "lucide-react"
import { ink } from "@/lib/ink"
import {
  RANKED_TFS, TF_DEFS, STYLE_META, DIFFICULTY_META, rankedWindow, difficultyRatio, difficultyLevel,
  pointsIfHit, pointsIfMissed, type RankedTf, type AssetKind, type SessionHint, type TraderStyle,
} from "@/lib/ranked"

export interface RankedAsset { source: "crypto" | "stooq"; key: string; ticker: string }

interface Quote { kind: AssetKind; price: number; dailySigmaPct: number | null; session: SessionHint | null }

interface Props {
  enabled: boolean
  onEnabledChange: (on: boolean) => void
  tf: RankedTf
  onTfChange: (tf: RankedTf) => void
  asset: RankedAsset | null
  direction: "bullish" | "bearish" | "neutral"
  target: string
  /** null when the call can be posted as ranked, else the reason it can't. */
  onBlockedChange: (reason: string | null) => void
}

// short = label for phone widths, where a 2-column zone is ~55px wide
const ZONES: { style: TraderStyle; span: number; short: string }[] = [
  { style: "scalper", span: 2, short: "Scalper" }, { style: "day", span: 3, short: "Day" }, { style: "swing", span: 2, short: "Swing" },
  { style: "position", span: 2, short: "Position" }, { style: "investor", span: 2, short: "Investor" },
]

const TRACK_GRADIENT = "linear-gradient(90deg, #fbbf24 0%, #fbbf24 14%, #34d399 20%, #34d399 42%, #60a5fa 52%, #60a5fa 62%, #a78bfa 72%, #a78bfa 82%, #f472b6 90%, #f472b6 100%)"

function parsePrice(s: string): number | null {
  const n = parseFloat(s.replace(/[$,\s]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatDeadline(ms: number, tf: RankedTf): string {
  const long = (TF_DEFS[tf].months ?? 0) >= 3
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    ...(long ? { year: "numeric" } : {}),
  })
}

function relativeWindow(tf: RankedTf): string {
  const d = TF_DEFS[tf]
  if (d.minutes) return d.minutes < 60 ? `in ${d.minutes} minutes` : `in ${d.minutes / 60} hour${d.minutes > 60 ? "s" : ""}`
  if (d.tradingDays === 1) return "in 1 trading day"
  if (d.tradingDays === 5) return "in 1 week"
  return d.months === 12 ? "in 1 year" : `in ${d.months} month${d.months! > 1 ? "s" : ""}`
}

export default function RankedCallPicker({ enabled, onEnabledChange, tf, onTfChange, asset, direction, target, onBlockedChange }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "unrankable">("idle")
  const [now, setNow] = useState(() => Date.now())

  const assetKey = asset ? `${asset.source}:${asset.key}:${asset.ticker}` : ""

  useEffect(() => {
    if (!enabled || !asset) return
    let cancelled = false
    async function load() {
      setQuoteState((s) => (s === "ready" ? s : "loading"))
      try {
        const q = new URLSearchParams({ source: asset!.source, key: asset!.key, ticker: asset!.ticker })
        const res = await fetch(`/api/ranked/quote?${q}`)
        const d = res.ok ? await res.json() : null
        if (cancelled) return
        if (d?.rankable) { setQuote(d); setQuoteState("ready") } else { setQuote(null); setQuoteState("unrankable") }
      } catch {
        if (!cancelled) setQuoteState("unrankable")
      }
      if (!cancelled) setNow(Date.now())
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
    // assetKey captures the asset identity; the object itself changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, assetKey])

  const calc = useMemo(() => {
    if (!quote) return null
    const window = rankedWindow(tf, quote.kind, now, quote.session)
    const available = new Set(RANKED_TFS.filter((t) => rankedWindow(t, quote.kind, now, quote.session) != null))
    const t = parsePrice(target)
    const move = t != null ? ((t - quote.price) / quote.price) * 100 : null
    const wrongSide = move != null && (direction === "bullish" ? move <= 0 : direction === "bearish" ? move >= 0 : false)
    const ratio = move != null && !wrongSide ? difficultyRatio(move, tf, quote.kind, quote.dailySigmaPct) : null
    const level = ratio != null ? difficultyLevel(ratio) : null
    return { window, available, move, wrongSide, ratio, level }
  }, [quote, tf, now, target, direction])

  const blocked: string | null = !enabled ? null
    : direction === "neutral" ? "Ranked calls need a bullish or bearish direction"
    : !asset ? "Pick the asset from search to rank this call"
    : quoteState === "unrankable" ? "Live prices for this asset aren't available, so it can't be ranked"
    : !calc ? "Loading live price…"
    : !calc.window ? "Market is closed — pick 1D or longer"
    : calc.move == null ? "Set a target price"
    : calc.wrongSide ? (direction === "bullish" ? "A bullish target must be above the current price" : "A bearish target must be below the current price")
    : calc.level === "too_close" ? "Target is too close for this deadline"
    : null

  useEffect(() => { onBlockedChange(blocked) }, [blocked, onBlockedChange])

  const idx = RANKED_TFS.indexOf(tf)
  const style = TF_DEFS[tf].style
  const styleColor = STYLE_META[style].color
  const directionless = direction === "neutral"

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onEnabledChange(!enabled)}
        disabled={directionless}
        aria-pressed={enabled}
        className="w-full flex items-center gap-3 text-left rounded-xl p-3 transition-colors disabled:opacity-50"
        style={{
          background: enabled ? "rgba(16,185,129,0.08)" : "var(--bg-card)",
          border: `1px solid ${enabled ? "rgba(16,185,129,0.45)" : "var(--border)"}`,
        }}
      >
        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.14)", color: ink("#34d399") }}>
          <Trophy size={17} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold" style={{ color: "var(--text-primary)" }}>Make it a Ranked Call</span>
          <span className="block text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
            {directionless
              ? "Pick bullish or bearish to rank a call."
              : "Set a deadline and earn public reputation. Hits and misses both count, and ranked calls can't be deleted."}
          </span>
        </span>
        <span className="w-10 h-6 rounded-full p-0.5 flex flex-shrink-0 transition-colors"
          style={{ background: enabled ? "#10b981" : "var(--border)", justifyContent: enabled ? "flex-end" : "flex-start" }}>
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </span>
      </button>

      {enabled && !directionless && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Target deadline</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                When will {asset ? `$${asset.ticker}` : "it"} reach your target?
              </p>
            </div>
            <span className="text-3xl font-black leading-none tabular-nums" style={{ color: ink(styleColor) }}>{tf}</span>
          </div>

          {/* Dial */}
          <div className="relative h-14">
            <div className="absolute h-1 rounded-full" style={{ top: 13, left: "calc(100% / 22)", right: "calc(100% / 22)", background: TRACK_GRADIENT, opacity: 0.35 }} />
            <div className="absolute h-1 rounded-full transition-all duration-300"
              style={{ top: 13, left: "calc(100% / 22)", width: `calc((100% - 100% / 11) * ${idx / 10})`, background: styleColor }} />
            <div className="absolute inset-x-0 top-0 grid grid-cols-11">
              {RANKED_TFS.map((t, i) => {
                const c = STYLE_META[TF_DEFS[t].style].color
                const on = i === idx
                const off = calc ? !calc.available.has(t) : false
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTfChange(t)}
                    disabled={off}
                    aria-label={`Deadline ${t}`}
                    aria-pressed={on}
                    title={off ? "Market closed — opens when it trades" : undefined}
                    className="h-14 flex flex-col items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="h-[30px] flex items-center justify-center">
                      <span className="rounded-full transition-all duration-200"
                        style={{
                          width: on ? 22 : 13, height: on ? 22 : 13,
                          background: i <= idx ? c : "var(--bg-base)",
                          border: `2px solid ${c}`,
                          boxShadow: on ? `0 0 0 5px ${c}33, 0 0 18px ${c}66` : "none",
                        }} />
                    </span>
                    <span className="text-[10px] font-mono tabular-nums"
                      style={{ color: on ? ink(c) : "var(--text-secondary)", fontWeight: on ? 700 : 500 }}>{t}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-11 gap-1">
            {ZONES.map((z) => {
              const m = STYLE_META[z.style]
              const on = z.style === style
              return (
                <span key={z.style} className="text-center text-[9px] sm:text-[10px] tracking-tight sm:tracking-normal font-bold rounded-md py-1 px-0 sm:px-0.5 truncate transition-colors"
                  style={{
                    gridColumn: `span ${z.span}`,
                    background: on ? m.color + "22" : "transparent",
                    color: on ? ink(m.color) : "var(--text-secondary)",
                    border: `1px solid ${on ? m.color + "66" : "var(--border)"}`,
                  }}>
                  <span className="sm:hidden">{z.short}</span>
                  <span className="hidden sm:inline">{m.name}</span>
                </span>
              )
            })}
          </div>

          {quoteState === "loading" && !calc && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Loader2 size={12} className="animate-spin" /> Loading live price and volatility…
            </div>
          )}

          {calc && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg p-2.5" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Resolves</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {calc.window ? formatDeadline(calc.window.deadline, tf) : "Market closed"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {calc.window?.deferred
                      ? `Clock starts at the next open · ${formatDeadline(calc.window.startsAt, tf)}`
                      : `${relativeWindow(tf)} · then it's final`}
                  </p>
                </div>
                <div className="rounded-lg p-2.5" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Counts toward</p>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5" style={{ color: ink(styleColor) }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: styleColor }} />
                    {STYLE_META[style].name}
                  </p>
                  <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                    <Lock size={10} /> Entry locks at ${quote!.price.toLocaleString("en-US", { maximumFractionDigits: quote!.price >= 1 ? 2 : 6 })}
                  </p>
                </div>
              </div>

              {calc.level && calc.ratio != null && (() => {
                const meta = DIFFICULTY_META[calc.level]
                return (
                  <div className="rounded-lg p-2.5 space-y-2" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Difficulty</p>
                      <p className="text-xs font-extrabold" style={{ color: ink(meta.color) }}>{meta.name}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className="h-1.5 rounded-full transition-colors"
                          style={{ background: n <= meta.bars ? meta.color : "var(--border)" }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      <span>{meta.hint}</span>
                      {calc.level !== "too_close" && (
                        <span className="font-mono">
                          <span className="font-bold" style={{ color: ink("#34d399") }}>+{pointsIfHit(calc.ratio)} rep</span> if hit ·{" "}
                          <span className="font-bold" style={{ color: ink("#fb7185") }}>−{pointsIfMissed(calc.ratio)} rep</span> if missed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {blocked && quoteState !== "loading" && (
            <p className="text-[11px] font-medium" style={{ color: ink("#fb923c") }}>{blocked}</p>
          )}
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Simulated call for reputation only. Not financial advice.</p>
        </div>
      )}
    </div>
  )
}
