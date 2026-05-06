"use client"

import type { TapeEvent } from "./scenarios"

interface Props {
  events: TapeEvent[] // most recent at end
  unit: string
  /** Maximum visible rows */
  maxVisible?: number
}

const fmtPrice = (p: number, unit: string): string => {
  const decimals = p >= 1000 ? 0 : p >= 100 ? 2 : p >= 10 ? 2 : p >= 1 ? 3 : 5
  return `${unit}${p.toFixed(decimals)}`
}

const fmtSize = (s: number): string => {
  if (s >= 1000) return `${(s / 1000).toFixed(1)}k`
  if (s >= 100) return s.toFixed(0)
  if (s >= 1) return s.toFixed(0)
  return s.toFixed(2)
}

const fmtTime = (ms: number): string => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 100))}`
}

export default function TapeStream({ events, unit, maxVisible = 18 }: Props) {
  const visible = events.slice(-maxVisible).reverse() // newest first

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
          Time &amp; Sales
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">{events.length} prints</span>
      </div>
      <div className="grid grid-cols-[64px_1fr_1fr_56px] gap-2 px-3 py-1.5 border-b border-gray-800 text-[9px] uppercase tracking-wider text-gray-500 font-bold">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>
      <div className="max-h-[420px] overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-gray-600 italic">
            Waiting for the tape…
          </div>
        ) : (
          visible.map((e, i) => {
            const isBuy = e.side === "buy"
            const big = e.size >= 500
            const newest = i === 0
            return (
              <div
                key={`${e.t}-${i}`}
                className={`grid grid-cols-[64px_1fr_1fr_56px] gap-2 items-center px-3 py-1 text-xs font-mono tabular-nums border-l-2 ${
                  isBuy ? "border-l-emerald-500/60" : "border-l-rose-500/60"
                } ${newest ? "animate-[pz-tape-flash_350ms_ease-out]" : ""}`}
                style={{
                  backgroundColor: newest
                    ? isBuy
                      ? "rgba(16,185,129,0.18)"
                      : "rgba(244,63,94,0.18)"
                    : isBuy
                      ? "rgba(16,185,129,0.04)"
                      : "rgba(244,63,94,0.04)",
                }}
              >
                <span className="text-gray-500 text-[10px]">{fmtTime(e.t)}</span>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    isBuy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isBuy ? "▲ Buy" : "▼ Sell"}
                </span>
                <span
                  className={`text-right ${
                    isBuy ? "text-emerald-300" : "text-rose-300"
                  } ${big ? "font-bold" : ""}`}
                >
                  {fmtPrice(e.price, unit)}
                </span>
                <span
                  className={`text-right ${big ? "text-amber-300 font-bold" : "text-gray-400"}`}
                >
                  {fmtSize(e.size)}
                </span>
              </div>
            )
          })
        )}
      </div>
      <style>{`
        @keyframes pz-tape-flash {
          0% { transform: translateY(-8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
