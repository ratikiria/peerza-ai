import Link from "next/link"
import { Trophy, Briefcase, Zap, Shuffle } from "lucide-react"
import type { ActiveChallengePerf } from "@/lib/profile-data"

const STYLE_META = {
  INVESTMENT: { icon: Briefcase, color: "#60a5fa" },
  TRADING:    { icon: Zap,       color: "#fb923c" },
  MIXED:      { icon: Shuffle,   color: "#10b981" },
} as const

export default function ActiveChallengesCard({ challenges }: { challenges: ActiveChallengePerf[] }) {
  if (challenges.length === 0) return null

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5"
        style={{ color: "var(--text-secondary)" }}>
        <Trophy size={12} className="text-emerald-400" /> Live performance
      </h3>

      <div className="space-y-3">
        {challenges.map((c) => {
          const meta = STYLE_META[c.style] ?? STYLE_META.MIXED
          const Icon = meta.icon
          const tint = meta.color
          const positive = c.returnPct >= 0
          return (
            <Link key={c.challengeId} href={`/investments/${c.challengeId}`}
              className="block rounded-xl p-3 transition-colors hover:bg-[var(--bg-base)]"
              style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: tint + "22", color: tint }}>
                  <Icon size={12} />
                </div>
                <p className="text-xs font-semibold truncate flex-1" style={{ color: "var(--text-primary)" }}>
                  {c.challengeName}
                </p>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-base font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    #{c.rank}
                    <span className="text-[10px] ml-1 font-normal" style={{ color: "var(--text-secondary)" }}>
                      of {c.totalParticipants}
                    </span>
                  </p>
                </div>
                <p className="text-base font-bold tabular-nums"
                  style={{ color: positive ? "#10b981" : "#ef4444" }}>
                  {positive ? "+" : ""}{c.returnPct}%
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
