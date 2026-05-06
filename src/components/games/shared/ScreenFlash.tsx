"use client"

import { useEffect, useState } from "react"

type FlashColor = "green" | "red" | "gold"

interface Props {
  trigger: number
  color: FlashColor
}

const COLORS: Record<FlashColor, string> = {
  green: "rgba(16,185,129,0.22)",
  red: "rgba(244,63,94,0.22)",
  gold: "rgba(251,191,36,0.22)",
}

export default function ScreenFlash({ trigger, color }: Props) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setActive(true)
    const t = setTimeout(() => setActive(false), 500)
    return () => clearTimeout(t)
  }, [trigger])

  if (!active) return null

  return (
    <div
      key={trigger}
      className="pointer-events-none fixed inset-0 z-[45]"
      style={{
        backgroundColor: COLORS[color],
        animation: "pz-flash 450ms ease-out forwards",
      }}
    >
      <style>{`
        @keyframes pz-flash {
          0%   { opacity: 0; }
          18%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
