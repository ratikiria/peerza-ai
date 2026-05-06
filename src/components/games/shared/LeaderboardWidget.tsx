"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, User } from "lucide-react"

interface Entry {
  rank: number
  id: string
  gameId: string
  returnPct: number
  finalBalance: number
  user: {
    id: string
    username: string
    name: string
    image: string | null
    isPremium: boolean
  }
}

const GAME_EMOJI: Record<string, string> = {
  "guess-direction": "🎯",
  "build-portfolio": "💼",
  "read-tape": "📊",
}

const GAME_LABEL: Record<string, string> = {
  "guess-direction": "Guess Direction",
  "build-portfolio": "Build Portfolio",
  "read-tape": "Read the Tape",
}

export default function LeaderboardWidget() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/games/leaderboard?period=week&limit=10")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setEntries(data.entries || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400">
            Top this week
          </h2>
        </div>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400">
            Top this week
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          No results yet this week. Be first on the board.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400">
            Top this week
          </h2>
        </div>
        <span className="text-[10px] text-gray-500">{entries.length} player{entries.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-1">
        {entries.map((e) => {
          const isPodium = e.rank <= 3
          const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : null
          return (
            <Link
              key={e.id}
              href={`/profile/${e.user.username}`}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-gray-800 ${
                isPodium ? "bg-gradient-to-r from-amber-500/10 to-transparent" : ""
              }`}
            >
              <span className="text-xs font-mono font-bold text-gray-500 w-6 text-center tabular-nums">
                {medal || `#${e.rank}`}
              </span>
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {e.user.image ? (
                  <img src={e.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={12} className="text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate">{e.user.name}</p>
                <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                  <span aria-hidden>{GAME_EMOJI[e.gameId] || "🎮"}</span>
                  {GAME_LABEL[e.gameId] || e.gameId}
                </p>
              </div>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  e.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {e.returnPct >= 0 ? "+" : ""}
                {e.returnPct.toFixed(1)}%
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
