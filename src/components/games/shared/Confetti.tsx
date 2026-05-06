"use client"

import { useEffect, useState } from "react"

const COLORS = ["#10b981", "#fbbf24", "#3b82f6", "#ec4899", "#f97316", "#a855f7"]

interface Piece {
  id: number
  left: number
  delay: number
  rotation: number
  color: string
  duration: number
  size: number
}

export default function Confetti({
  trigger,
  count = 60,
}: {
  trigger: number
  count?: number
}) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    if (trigger === 0) return
    const next = Array.from({ length: count }, (_, i) => ({
      id: trigger * 10000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      rotation: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 1.6 + Math.random() * 1.6,
      size: 6 + Math.random() * 6,
    }))
    setPieces(next)
    const t = setTimeout(() => setPieces([]), 3500)
    return () => clearTimeout(t)
  }, [trigger, count])

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            animation: `pz-confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes pz-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
