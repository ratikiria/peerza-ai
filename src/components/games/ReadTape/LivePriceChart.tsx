"use client"

import { useMemo } from "react"

export interface PricePt {
  t: number // ms from stream start
  p: number
}

interface Props {
  startPrice: number
  prePoints: PricePt[]
  postPoints?: PricePt[]
  totalDurationMs: number
  /** Show extension area (post-event) */
  revealed: boolean
  unit: string
  /** Pulsing latest dot during streaming */
  isLive: boolean
}

const W = 640
const H = 220
const PAD_L = 56
const PAD_R = 16
const PAD_T = 18
const PAD_B = 24

const fmtPrice = (p: number, unit: string): string => {
  const decimals = p >= 1000 ? 0 : p >= 100 ? 2 : p >= 10 ? 2 : p >= 1 ? 3 : 5
  return `${unit}${p.toFixed(decimals)}`
}

export default function LivePriceChart({
  startPrice,
  prePoints,
  postPoints = [],
  totalDurationMs,
  revealed,
  unit,
  isLive,
}: Props) {
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  // Time axis spans tape + 30% extension for the post-reveal preview
  const timeSpan = totalDurationMs * 1.3

  const { yMin, yMax } = useMemo(() => {
    const allP = [startPrice, ...prePoints.map((p) => p.p), ...postPoints.map((p) => p.p)]
    const minP = Math.min(...allP)
    const maxP = Math.max(...allP)
    // Center on startPrice with symmetric padding to avoid revealing direction
    const span = Math.max(startPrice - minP, maxP - startPrice) * 1.25 || startPrice * 0.01 || 1
    return { yMin: startPrice - span, yMax: startPrice + span }
  }, [startPrice, prePoints, postPoints])

  const x = (t: number) => PAD_L + (t / Math.max(1, timeSpan)) * innerW
  const y = (p: number) => PAD_T + innerH - ((p - yMin) / (yMax - yMin || 1)) * innerH

  // Path
  const allPre = [{ t: 0, p: startPrice }, ...prePoints]
  const prePath = allPre
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${x(pt.t).toFixed(2)} ${y(pt.p).toFixed(2)}`)
    .join(" ")

  const lastPre = allPre[allPre.length - 1]
  const lastPost = postPoints[postPoints.length - 1]

  const postPath = revealed && postPoints.length
    ? `M ${x(lastPre.t).toFixed(2)} ${y(lastPre.p).toFixed(2)} ` +
      postPoints
        .map((pt) => `L ${x(pt.t).toFixed(2)} ${y(pt.p).toFixed(2)}`)
        .join(" ")
    : ""

  const postUp = lastPost && lastPost.p >= lastPre.p
  const postColor = postUp ? "#10b981" : "#ef4444"
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <style>{`
          @keyframes pz-live-pulse {
            0%, 100% { r: 3; opacity: 1; }
            50% { r: 5; opacity: 0.6; }
          }
        `}</style>
      </defs>

      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            y1={y(t)}
            x2={W - PAD_R}
            y2={y(t)}
            stroke="rgba(255,255,255,0.04)"
          />
          <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#6b7280">
            {fmtPrice(t, unit)}
          </text>
        </g>
      ))}

      {/* Start price reference */}
      <line
        x1={PAD_L}
        y1={y(startPrice)}
        x2={W - PAD_R}
        y2={y(startPrice)}
        stroke="rgba(251,191,36,0.4)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Pre line */}
      <path d={prePath} fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinejoin="round" />

      {/* Live cursor */}
      {isLive && lastPre && (
        <circle
          cx={x(lastPre.t)}
          cy={y(lastPre.p)}
          r="3"
          fill="#fbbf24"
          style={{ animation: "pz-live-pulse 1s ease-in-out infinite" }}
        />
      )}

      {/* Event freeze marker */}
      {!isLive && (
        <line
          x1={x(lastPre.t)}
          y1={PAD_T}
          x2={x(lastPre.t)}
          y2={H - PAD_B}
          stroke="#fbbf24"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
        />
      )}

      {/* Post line */}
      {revealed && postPath && (
        <>
          <path
            d={postPath}
            fill="none"
            stroke={postColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${postColor}aa)` }}
          />
          <circle cx={x(lastPost.t)} cy={y(lastPost.p)} r="4" fill={postColor} />
          <text
            x={Math.min(W - PAD_R - 4, x(lastPost.t) + 8)}
            y={y(lastPost.p) + 4}
            textAnchor={x(lastPost.t) > W - 70 ? "end" : "start"}
            fontSize="11"
            fontWeight="bold"
            fill={postColor}
          >
            {fmtPrice(lastPost.p, unit)}
          </text>
        </>
      )}
    </svg>
  )
}
