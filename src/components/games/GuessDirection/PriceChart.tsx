"use client"

import { useMemo } from "react"
import type { PricePoint } from "./scenarios"

interface Props {
  prePoints: PricePoint[]
  postPoints: PricePoint[]
  revealed: boolean
  unit: string
}

const W = 640
const H = 280
const PAD_L = 56
const PAD_R = 16
const PAD_T = 24
const PAD_B = 28

export default function PriceChart({ prePoints, postPoints, revealed, unit }: Props) {
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  // Scale always fits pre + post so it doesn't shift when the answer is revealed.
  // Centered on the last pre-event price (no directional spoiler).
  const { yMin, yMax, total, x, y, ticks } = useMemo(() => {
    const all = [...prePoints, ...postPoints].map((p) => p.p)
    const minP = Math.min(...all)
    const maxP = Math.max(...all)
    const lastPre = prePoints[prePoints.length - 1].p
    const span = Math.max(lastPre - minP, maxP - lastPre) * 1.18 || lastPre * 0.05 || 1
    const yMin = lastPre - span
    const yMax = lastPre + span
    const total = prePoints.length + postPoints.length
    const x = (i: number) => PAD_L + (i / Math.max(1, total - 1)) * innerW
    const y = (p: number) => PAD_T + innerH - ((p - yMin) / (yMax - yMin || 1)) * innerH
    const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4)
    return { yMin, yMax, total, x, y, ticks }
  }, [prePoints, postPoints, innerW, innerH])

  const prePath =
    prePoints
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(pt.p).toFixed(2)}`)
      .join(" ") || ""

  const postPath = revealed
    ? `M ${x(prePoints.length - 1).toFixed(2)} ${y(prePoints[prePoints.length - 1].p).toFixed(2)} ` +
      postPoints
        .map((pt, i) => `L ${x(prePoints.length + i).toFixed(2)} ${y(pt.p).toFixed(2)}`)
        .join(" ")
    : ""

  const drawAnim: React.CSSProperties = {
    strokeDasharray: 1,
    strokeDashoffset: 1,
    animation: "pz-draw 2200ms ease-out forwards",
  }
  const postDrawAnim: React.CSSProperties = {
    strokeDasharray: 1,
    strokeDashoffset: 1,
    animation: "pz-draw 1100ms ease-out forwards",
  }

  const eventX = x(prePoints.length - 1)
  const lastPre = prePoints[prePoints.length - 1]
  const lastPost = postPoints[postPoints.length - 1]
  const isUp = lastPost.p > lastPre.p
  const lineColor = isUp ? "#10b981" : "#ef4444"

  function fmtPrice(v: number): string {
    if (v >= 1000) return v.toFixed(0)
    if (v >= 100) return v.toFixed(0)
    if (v >= 10) return v.toFixed(2)
    return v.toFixed(4)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <style>{`
          @keyframes pz-draw {
            from { stroke-dashoffset: 1; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes pz-pulse {
            0%, 100% { r: 3; opacity: 1; }
            50% { r: 5; opacity: 0.55; }
          }
          @keyframes pz-halo {
            0%, 100% { r: 5; opacity: 0.0; }
            50% { r: 11; opacity: 0.35; }
          }
        `}</style>
      </defs>
      {/* Grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            y1={y(t)}
            x2={W - PAD_R}
            y2={y(t)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
          <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
            {fmtPrice(t)}
          </text>
        </g>
      ))}

      {/* Event vertical line */}
      <line
        x1={eventX}
        y1={PAD_T}
        x2={eventX}
        y2={H - PAD_B}
        stroke="#fbbf24"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.7"
      />
      <text x={eventX} y={PAD_T - 8} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="bold">
        EVENT
      </text>

      {/* Pre line — draws itself in on mount */}
      <path
        key={`pre-${prePath}`}
        d={prePath}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.6"
        strokeLinejoin="round"
        pathLength={1}
        style={drawAnim}
      />

      {/* Post line */}
      {revealed && (
        <>
          <path
            key={`post-${postPath}`}
            d={postPath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.2"
            strokeLinejoin="round"
            pathLength={1}
            style={{ ...postDrawAnim, filter: `drop-shadow(0 0 4px ${lineColor}88)` }}
          />
          <circle cx={x(total - 1)} cy={y(lastPost.p)} r="4" fill={lineColor} />
          <text
            x={Math.min(W - PAD_R - 4, x(total - 1) + 8)}
            y={y(lastPost.p) + 4}
            textAnchor={x(total - 1) > W - 60 ? "end" : "start"}
            fontSize="11"
            fontWeight="bold"
            fill={lineColor}
          >
            {unit}
            {fmtPrice(lastPost.p)}
          </text>
        </>
      )}

      {/* Pulsing event dot — stays alive across phases */}
      <circle
        cx={x(prePoints.length - 1)}
        cy={y(lastPre.p)}
        fill="#fbbf24"
        opacity="0.4"
        style={{ animation: "pz-halo 1.6s ease-in-out infinite" }}
      />
      <circle
        cx={x(prePoints.length - 1)}
        cy={y(lastPre.p)}
        r="3"
        fill="#fbbf24"
        style={{ animation: "pz-pulse 1.6s ease-in-out infinite" }}
      />

      {/* X-axis labels */}
      <text x={x(0)} y={H - PAD_B + 16} textAnchor="start" fontSize="10" fill="#6b7280">
        {prePoints[0].t}
      </text>
      <text x={eventX} y={H - PAD_B + 16} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="600">
        {lastPre.t}
      </text>
      {revealed && (
        <text
          x={x(total - 1)}
          y={H - PAD_B + 16}
          textAnchor="end"
          fontSize="10"
          fill="#6b7280"
        >
          {lastPost.t}
        </text>
      )}
    </svg>
  )
}
