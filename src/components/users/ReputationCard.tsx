import Link from "next/link"
import { Trophy, Star, Check, X } from "lucide-react"
import { ink } from "@/lib/ink"
import { STYLE_META, TIER_META, RANK_MIN_CALLS, STYLE_MIN_CALLS, formatCountdown } from "@/lib/ranked"
import type { ReputationProfile } from "@/lib/reputation"

const R = 50
const CIRC = 2 * Math.PI * R

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{children}</p>
}

export default function ReputationCard({ rep, isOwnProfile }: { rep: ReputationProfile | null; isOwnProfile: boolean }) {
  if (!rep) {
    if (!isOwnProfile) return null
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.14)", color: ink("#34d399") }}>
          <Trophy size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Build your public reputation</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Post a trade idea, set a deadline with “Make it a Ranked Call”, and earn a score, a rank and a trader style.
          </p>
        </div>
        <Link href="/feed" className="text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0" style={{ background: "#10b981", color: "#0f1117" }}>
          Post a call
        </Link>
      </div>
    )
  }

  const tier = TIER_META[rep.tier]
  const ranked = rep.resolvedCalls >= RANK_MIN_CALLS
  const scoreColor = ranked ? tier.color : "#9ca3af"
  const style = rep.style ? STYLE_META[rep.style] : null
  const nextMeta = rep.nextTier ? TIER_META[rep.nextTier] : null
  // Progress within the current tier band toward the next one.
  const band = nextMeta ? Math.max(1, nextMeta.min - tier.min) : 1
  const toNextPct = nextMeta && ranked ? Math.max(4, Math.min(100, ((rep.score - tier.min) / band) * 100)) : 100

  const stats = [
    { value: rep.hitRatePct != null ? `${rep.hitRatePct}%` : "—", label: `Hit rate (${rep.hits} of ${rep.resolvedCalls})`, color: "var(--text-primary)" },
    { value: rep.avgMovePct != null ? `+${rep.avgMovePct}%` : "—", label: "Avg target move", color: ink("#34d399") },
    { value: rep.bestMovePct != null ? `+${rep.bestMovePct}%` : "—", label: "Best call", color: ink("#34d399") },
    { value: String(rep.streak), label: "Hit streak", color: ink("#fbbf24") },
  ]

  return (
    <section className="rounded-2xl p-4 sm:p-5 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      aria-label="Ranked call reputation">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Trophy size={15} style={{ color: ink("#34d399") }} /> Ranked calls
        </h2>
        <div className="flex items-center gap-1.5">
          {ranked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: tier.color + "26", color: ink(tier.color) }}>
              <Star size={11} fill="currentColor" /> {tier.name}
            </span>
          )}
          {style && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ border: `1px solid ${style.color}66`, color: ink(style.color) }}>
              {style.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
        <div className="relative w-[120px] h-[120px] flex-shrink-0 self-center">
          <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle cx="60" cy="60" r={R} fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(CIRC * (ranked ? rep.score / 1000 : rep.resolvedCalls / RANK_MIN_CALLS)).toFixed(1)} ${CIRC.toFixed(1)}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold leading-none" style={{ color: ink(scoreColor) }}>{ranked ? rep.score : `${rep.resolvedCalls}/${RANK_MIN_CALLS}`}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-secondary)" }}>{ranked ? "Peerza score" : "Calls to rank"}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-lg font-mono font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {ranked ? (
                <>
                  <span>{tier.name}</span>
                  <span>{nextMeta && rep.pointsToNext != null ? `${rep.pointsToNext} points to ${nextMeta.name}` : "Top rank"}</span>
                </>
              ) : (
                <>
                  <span>Unranked</span>
                  <span>{RANK_MIN_CALLS - rep.resolvedCalls} more settled calls to get a rank</span>
                </>
              )}
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-1.5 rounded-full" style={{
                width: `${ranked ? toNextPct : (rep.resolvedCalls / RANK_MIN_CALLS) * 100}%`,
                background: ranked && nextMeta ? `linear-gradient(90deg, ${tier.color}, ${nextMeta.color})` : scoreColor,
              }} />
            </div>
          </div>
        </div>
      </div>

      {rep.styleMix.length > 0 && (
        <div className="space-y-2">
          <Label>Trading style · {rep.resolvedCalls + rep.openCalls} ranked calls{rep.openCalls ? ` · ${rep.openCalls} live` : ""}</Label>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {rep.styleMix.map((m) => (
              <div key={m.style} style={{ width: `${m.pct}%`, background: STYLE_META[m.style].color }} title={`${STYLE_META[m.style].name} ${m.pct}%`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {rep.styleMix.map((m) => (
              <span key={m.style} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: STYLE_META[m.style].color }} />
                <span style={{ color: "var(--text-primary)" }}>{STYLE_META[m.style].name}</span>
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{m.pct}%</span>
              </span>
            ))}
          </div>
          {!style && (
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>A trader style appears after {STYLE_MIN_CALLS} ranked calls.</p>
          )}
        </div>
      )}

      {rep.badges.length > 0 && (
        <div className="space-y-2">
          <Label>Badges</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {rep.badges.map((b) => (
              <div key={b.key} className="rounded-xl p-3" style={{ background: b.color + "12", border: `1px solid ${b.color}44` }}>
                <p className="text-sm font-extrabold" style={{ color: ink(b.color) }}>{b.name}</p>
                <p className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--text-secondary)" }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {rep.recent.length > 0 && (
        <div className="space-y-2">
          <Label>Recent ranked calls</Label>
          <ul className="rounded-xl overflow-hidden divide-y divide-[var(--border)]" style={{ border: "1px solid var(--border)" }}>
            {rep.recent.map((r) => {
              const hit = r.status === "TARGET_HIT"
              const st = r.style ? STYLE_META[r.style] : null
              return (
                <li key={r.id}>
                  <Link href={`/posts/${r.id}`} className="grid grid-cols-[24px_minmax(0,1fr)_auto] sm:grid-cols-[24px_80px_44px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-base)]">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={hit ? { background: "#34d399", color: "#0f1117" } : { background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                      {hit ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                    </span>
                    <span className="font-bold truncate" style={{ color: "var(--text-primary)" }}>${r.ticker}</span>
                    <span className="hidden sm:inline text-xs font-mono" style={{ color: st ? ink(st.color) : "var(--text-secondary)" }}>{r.tf}</span>
                    <span className="hidden sm:inline truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                      {hit
                        ? `Hit${r.movePct != null ? ` +${r.movePct.toFixed(1)}%` : ""}${r.hitAfterMs != null ? ` in ${formatCountdown(r.hitAfterMs)}` : ""}`
                        : `Expired${r.progressPct != null ? ` at ${r.progressPct}% of target` : ""}`}
                    </span>
                    <span className="text-xs font-mono font-bold text-right" style={{ color: hit ? ink("#34d399") : ink("#fb7185") }}>
                      {r.points > 0 ? `+${r.points}` : `−${Math.abs(r.points)}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Scores come from simulated, time-boxed calls checked against market data. Past calls don&apos;t predict future results. Not financial advice.
      </p>
    </section>
  )
}
