"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Trophy } from "lucide-react"
import WidgetHelp from "@/components/ui/WidgetHelp"
import Avatar from "@/components/ui/Avatar"

interface Leader {
  id: string
  name: string
  username: string
  image: string | null
  repScore: number
  repCalls: number
  repHits: number
}

// Leaderboard of Ranked Calls reputation (Glass Terminal right panel).
export default function TopCallersWidget() {
  const t = useTranslations("Widgets")
  const [leaders, setLeaders] = useState<Leader[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/ranked/leaders")
      .then((r) => (r.ok ? r.json() : { leaders: [] }))
      .then((d: { leaders?: Leader[] }) => !cancelled && setLeaders(d.leaders ?? []))
      .catch(() => !cancelled && setLeaders([]))
    return () => { cancelled = true }
  }, [])

  return (
    <div className="pz-glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[.1em] flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
          <Trophy size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t("top_callers_label")}</span>
        </h3>
        <WidgetHelp label={t("top_callers_label")} text={t("top_callers_text")} />
      </div>

      {leaders === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("top_callers_empty")}</p>
      ) : (
        <div className="space-y-2">
          {leaders.map((u, i) => (
            <Link key={u.id} href={`/profile/${u.username}`} className="flex items-center gap-2 group">
              <span className="w-4 text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{i + 1}</span>
              <span className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)" }}>
                <Avatar userId={u.id} image={u.image} name={u.name} size={12} />
              </span>
              <span className="text-xs font-medium truncate flex-1 group-hover:text-emerald-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                @{u.username}
              </span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
                {Math.round((u.repHits / u.repCalls) * 100)}% {t("top_callers_hit")}
              </span>
              <span className="w-9 text-right text-[11.5px] font-mono font-semibold" style={{ color: "var(--up)" }}>
                {u.repScore}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
