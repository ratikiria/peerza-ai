import Link from "next/link"
import { Gamepad2, Trophy, ArrowRight } from "lucide-react"
import type { UserGameStats } from "@/lib/games"
import { GAME_META } from "@/lib/games"
import { formatRelativeTime } from "@/lib/utils"

interface Props {
  stats: UserGameStats
  isOwnProfile: boolean
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

export default function ProfileGamesCard({ stats, isOwnProfile }: Props) {
  if (stats.totalGames === 0) {
    if (!isOwnProfile) return null
    return (
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Games
          </h3>
        </div>
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          Test your market instincts in 5-minute scenarios.
        </p>
        <Link
          href="/games"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Play first game <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  const best = stats.bestRun
  const winning = best && best.returnPct >= 0

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Games
          </h3>
        </div>
        <Link
          href="/games"
          className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
        >
          View →
        </Link>
      </div>

      {/* Best run hero */}
      {best && (
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={12} className="text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
              Best run
            </span>
          </div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {best.gameTitle}
          </p>
          <div className="flex items-baseline justify-between">
            <p
              className={`text-lg font-mono font-black tabular-nums ${
                winning ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {fmtPct(best.returnPct)}
            </p>
            <p className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
              {fmtMoney(best.finalBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Per-game cards */}
      {stats.byGame.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {stats.byGame.map((g) => {
            const meta = GAME_META[g.gameId]
            return (
              <div
                key={g.gameId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{ background: "var(--bg-base)" }}
              >
                <span className="text-base" aria-hidden>
                  {meta?.emoji || "🎮"}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {g.gameTitle}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    {g.played} played · best {fmtPct(g.bestReturnPct)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent runs */}
      {stats.recent.length > 0 && (
        <div>
          <p
            className="text-[10px] uppercase tracking-wider font-bold mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Recent
          </p>
          <div className="space-y-0.5">
            {stats.recent.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-[11px] py-0.5"
              >
                <span className="truncate flex-1" style={{ color: "var(--text-secondary)" }}>
                  {r.gameTitle}
                </span>
                <span className="text-[10px] mr-2" style={{ color: "var(--text-secondary)" }}>
                  {formatRelativeTime(r.completedAt.toISOString())}
                </span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    r.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {fmtPct(r.returnPct)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
