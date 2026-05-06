"use client"

import { useEffect, useRef, useState } from "react"

interface Tier {
  min: number
  label: string
  emoji: string
  gradient: string
}

const TIERS: Tier[] = [
  { min: 6, label: "LEGENDARY!",   emoji: "👑", gradient: "from-purple-500 via-fuchsia-500 to-pink-500" },
  { min: 5, label: "UNSTOPPABLE!", emoji: "💎", gradient: "from-cyan-500 via-blue-500 to-indigo-500" },
  { min: 4, label: "ON FIRE!",     emoji: "🔥", gradient: "from-red-500 via-orange-500 to-amber-500" },
  { min: 3, label: "STREAKING!",   emoji: "⚡", gradient: "from-amber-500 via-orange-500 to-red-500" },
  { min: 2, label: "NICE!",        emoji: "🎯", gradient: "from-emerald-500 to-teal-500" },
]

export default function StreakBanner({ streak }: { streak: number }) {
  const [active, setActive] = useState(false)
  const [tier, setTier] = useState<Tier | null>(null)
  const lastShownRef = useRef(0)

  useEffect(() => {
    if (streak < 2) {
      lastShownRef.current = 0
      return
    }
    if (streak === lastShownRef.current) return
    const matched = TIERS.find((t) => streak >= t.min)
    if (matched) {
      setTier(matched)
      setActive(true)
      lastShownRef.current = streak
      const t = setTimeout(() => setActive(false), 1600)
      return () => clearTimeout(t)
    }
  }, [streak])

  if (!active || !tier) return null

  return (
    <div
      key={streak}
      className="pointer-events-none fixed inset-0 z-[58] flex items-center justify-center"
    >
      <div
        className={`px-10 py-6 rounded-2xl bg-gradient-to-br ${tier.gradient} shadow-2xl shadow-black/50 border border-white/20`}
        style={{ animation: "pz-streak 1500ms cubic-bezier(.34,1.56,.64,1) forwards" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-1">{tier.emoji}</div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-wide drop-shadow-lg">
            {tier.label}
          </div>
          <div className="text-sm font-bold text-white/85 mt-1">×{streak} STREAK</div>
        </div>
      </div>
      <style>{`
        @keyframes pz-streak {
          0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
          18%  { transform: scale(1.18) rotate(3deg); opacity: 1; }
          35%  { transform: scale(1) rotate(0deg); opacity: 1; }
          78%  { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.85) rotate(0deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
