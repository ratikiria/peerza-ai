import { Award, Target, TrendingUp, EyeOff } from "lucide-react"
import type { TrackRecord } from "@/lib/track-record"

interface Props {
  record: TrackRecord
  isOwnProfile: boolean
  showTrackRecord: boolean   // user's preference
}

export default function TrackRecordCard({ record, isOwnProfile, showTrackRecord }: Props) {
  const { totalCalls, callsHit, accuracyPct, avgReturnPct, bestReturnPct, threshold, meetsThreshold } = record

  // Other users' profiles: only show when meets threshold AND user opted in
  if (!isOwnProfile && (!meetsThreshold || !showTrackRecord)) return null

  // Own profile, no calls yet: don't show anything
  if (isOwnProfile && totalCalls === 0) return null

  // Own profile, below threshold: show progress card encouraging more calls
  if (isOwnProfile && !meetsThreshold) {
    const pct = Math.min(100, (totalCalls / threshold) * 100)
    return (
      <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Award size={14} className="text-emerald-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Track record</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          Share <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{threshold - totalCalls}</span> more
          {" "}{threshold - totalCalls === 1 ? "Trade Idea" : "Trade Ideas"} with a target to unlock your stats.
        </p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
        </div>
        <p className="text-[10px] mt-2 text-right tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {totalCalls} / {threshold}
        </p>
      </div>
    )
  }

  // Own profile, meets threshold but hidden: show with note about hiding
  // Other or own with showTrackRecord on, meets threshold: full card
  const hidden = isOwnProfile && !showTrackRecord

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={14} className="text-emerald-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Track record</h3>
        </div>
        {hidden && (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <EyeOff size={10} /> Hidden from others
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Target size={12} />}
          label="Tracked calls"
          value={`${callsHit} / ${totalCalls}`}
          sub="hit target"
        />
        <Stat
          icon={<Award size={12} />}
          label="Accuracy"
          value={accuracyPct != null ? `${accuracyPct}%` : "—"}
          accent="#10b981"
        />
        <Stat
          icon={<TrendingUp size={12} />}
          label="Avg return"
          value={avgReturnPct != null ? `+${avgReturnPct}%` : "—"}
          accent="#10b981"
          sub={bestReturnPct != null ? `best +${bestReturnPct}%` : undefined}
        />
      </div>

      <p className="text-[10px] mt-3" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
        Counts only Trade Ideas with a target on a tracked asset. Open positions don't count yet.
      </p>
    </div>
  )
}

function Stat({
  icon, label, value, accent, sub,
}: { icon: React.ReactNode; label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide mb-1"
        style={{ color: "var(--text-secondary)" }}>
        {icon}{label}
      </div>
      <p className="text-base font-bold tabular-nums" style={{ color: accent ?? "var(--text-primary)" }}>{value}</p>
      {sub && (
        <p className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>{sub}</p>
      )}
    </div>
  )
}
