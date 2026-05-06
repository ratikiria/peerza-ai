"use client"

import {
  ASSETS,
  type Returns,
  type PortfolioScenario,
  PRESETS,
  portfolioReturn,
} from "./scenarios"

interface Props {
  scenario: PortfolioScenario
  allocation: Returns
  yourPnl: number
  yourReturnPct: number
  startingBalance: number
  onNext: () => void
  isLastRound: boolean
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

export default function PortfolioResult({
  scenario,
  allocation,
  yourPnl,
  yourReturnPct,
  startingBalance,
  onNext,
  isLastRound,
}: Props) {
  const maxAbs = Math.max(...Object.values(scenario.returns).map(Math.abs), 1)

  // Comparison portfolios — pre-defined alternative strategies
  const comparisons = [
    PRESETS.find((p) => p.id === "all-stocks")!,
    PRESETS.find((p) => p.id === "60-40")!,
    PRESETS.find((p) => p.id === "permanent")!,
    PRESETS.find((p) => p.id === "all-cash")!,
  ].map((p) => ({
    label: p.label,
    pct: portfolioReturn(p.allocation, scenario.returns),
  }))

  const youWon = yourPnl >= 0
  const beat6040 = yourReturnPct > comparisons[1].pct

  return (
    <div className="space-y-4">
      {/* Result hero */}
      <div
        className={`rounded-xl p-4 border ${
          youWon
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-rose-500/10 border-rose-500/30"
        }`}
      >
        <p
          className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
            youWon ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          Your portfolio return
        </p>
        <p
          className={`text-3xl font-mono font-bold mb-1 ${
            youWon ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {fmtPct(yourReturnPct)}
        </p>
        <p className={`text-sm ${youWon ? "text-emerald-300/80" : "text-rose-300/80"}`}>
          {fmtMoney(startingBalance)} → {fmtMoney(startingBalance + yourPnl)} ({yourPnl >= 0 ? "+" : ""}
          {fmtMoney(yourPnl)})
        </p>
      </div>

      {/* Asset class returns */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
          What each asset did
        </p>
        <div className="space-y-1.5">
          {ASSETS.map((a) => {
            const r = scenario.returns[a.key]
            const weight = allocation[a.key]
            const widthPct = (Math.abs(r) / maxAbs) * 100
            const isPositive = r > 0
            return (
              <div key={a.key} className="flex items-center gap-2">
                <span className="text-sm w-6 text-center" aria-hidden>
                  {a.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-300 truncate">
                      {a.label}
                      {weight > 0 && (
                        <span className="ml-1.5 text-[10px] text-gray-500">({weight}%)</span>
                      )}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums ${
                        r > 0 ? "text-emerald-400" : r < 0 ? "text-rose-400" : "text-gray-500"
                      }`}
                    >
                      {fmtPct(r)}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-gray-800/50 overflow-hidden flex">
                    <div className="w-1/2 flex justify-end">
                      {!isPositive && r !== 0 && (
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${widthPct}%`, opacity: 0.85 }}
                        />
                      )}
                    </div>
                    <div className="w-px bg-gray-600" />
                    <div className="w-1/2">
                      {isPositive && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${widthPct}%`, opacity: 0.85 }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comparison vs benchmark portfolios */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
            Vs. benchmarks
          </p>
          {beat6040 && (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              ★ Beat 60/40
            </span>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5">
            <span className="text-xs font-bold text-emerald-300">Your portfolio</span>
            <span
              className={`text-xs font-mono font-bold ${
                yourReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {fmtPct(yourReturnPct)}
            </span>
          </div>
          {comparisons.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-1.5"
            >
              <span className="text-xs text-gray-400">{c.label}</span>
              <span
                className={`text-xs font-mono ${
                  c.pct >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                }`}
              >
                {fmtPct(c.pct)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-3 transition-colors"
      >
        {isLastRound ? "See results →" : "Next round →"}
      </button>
    </div>
  )
}
