"use client"

import Link from "next/link"
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import type { RecentOutcome } from "@/lib/profile-data"

export default function RecentOutcomesCard({ outcomes, username }: { outcomes: RecentOutcome[]; username: string }) {
  if (outcomes.length === 0) return null

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5"
        style={{ color: "var(--text-secondary)" }}>
        <Trophy size={12} className="text-emerald-400" /> Recent target hits
      </h3>

      <div className="space-y-2">
        {outcomes.map((o) => {
          const Icon = o.direction === "bullish" ? TrendingUp : o.direction === "bearish" ? TrendingDown : Minus
          const tint = o.direction === "bullish" ? "#10b981" : o.direction === "bearish" ? "#ef4444" : "#eab308"
          return (
            <Link key={o.id} href={`/feed?ticker=${encodeURIComponent(o.ticker)}`}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              {o.logoUrl ? (
                <img src={o.logoUrl} alt=""
                  className="w-7 h-7 rounded-md object-contain flex-shrink-0"
                  style={{ background: "white", padding: 1 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
              ) : (
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: tint + "22", color: tint }}>
                  <Icon size={12} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  ${o.ticker}
                  {o.outcomeReturnPct != null && (
                    <span className="ml-1.5 text-emerald-400">+{o.outcomeReturnPct}%</span>
                  )}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Hit {formatRelativeTime(o.outcomeAt)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <Link href={`/profile/${username}`}
        className="block text-[10px] font-semibold mt-3 hover:underline"
        style={{ color: "var(--text-secondary)" }}>
        See all calls →
      </Link>
    </div>
  )
}
