"use client"

import { useEffect, useState } from "react"

interface Props {
  trigger: number
  value: string
  positive: boolean
}

export default function BigBangText({ trigger, value, positive }: Props) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setActive(true)
    const t = setTimeout(() => setActive(false), 1700)
    return () => clearTimeout(t)
  }, [trigger])

  if (!active) return null

  return (
    <div
      key={trigger}
      className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center"
    >
      <span
        className={`text-7xl sm:text-8xl font-black tracking-tight ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
        style={{
          textShadow: positive
            ? "0 0 30px rgba(16,185,129,0.8), 0 0 80px rgba(16,185,129,0.45)"
            : "0 0 30px rgba(244,63,94,0.8), 0 0 80px rgba(244,63,94,0.45)",
          animation: "pz-bigbang 1600ms cubic-bezier(.16,.84,.32,1) forwards",
        }}
      >
        {value}
      </span>
      <style>{`
        @keyframes pz-bigbang {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          18%  { transform: scale(1.45) translateY(-10px); opacity: 1; }
          45%  { transform: scale(1) translateY(-30px); opacity: 1; }
          100% { transform: scale(0.92) translateY(-130px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
