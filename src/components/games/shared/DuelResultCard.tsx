"use client"

import { Swords, Trophy } from "lucide-react"

interface Props {
  duel: {
    id: string
    challengerPct: number
    challengeePct: number
    youWon: boolean
    tied: boolean
  }
}

export default function DuelResultCard({ duel }: Props) {
  const verdict = duel.tied
    ? { label: "Tied!", color: "amber", emoji: "⚖️" }
    : duel.youWon
    ? { label: "You won!", color: "emerald", emoji: "🏆" }
    : { label: "You lost.", color: "rose", emoji: "💀" }

  const palette =
    verdict.color === "emerald"
      ? "border-emerald-500/40 from-emerald-500/15 to-emerald-500/5"
      : verdict.color === "rose"
      ? "border-rose-500/40 from-rose-500/15 to-rose-500/5"
      : "border-amber-500/40 from-amber-500/15 to-amber-500/5"

  const textColor =
    verdict.color === "emerald"
      ? "text-emerald-300"
      : verdict.color === "rose"
      ? "text-rose-300"
      : "text-amber-300"

  return (
    <div
      className={`mb-4 rounded-xl border bg-gradient-to-r px-4 py-3 ${palette} animate-[pz-pop_400ms_ease-out]`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Swords size={18} className={textColor} />
        <p className={`text-sm font-bold ${textColor}`}>
          {verdict.emoji} Duel result — {verdict.label}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">You</p>
          <p className={`font-mono font-bold ${duel.youWon ? "text-emerald-400" : "text-gray-200"}`}>
            {duel.challengeePct >= 0 ? "+" : ""}
            {duel.challengeePct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Challenger</p>
          <p className={`font-mono font-bold ${!duel.youWon && !duel.tied ? "text-emerald-400" : "text-gray-200"}`}>
            {duel.challengerPct >= 0 ? "+" : ""}
            {duel.challengerPct.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}
