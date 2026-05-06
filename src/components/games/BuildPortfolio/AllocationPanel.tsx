"use client"

import { ASSETS, type AssetClass, type Returns, PRESETS } from "./scenarios"

interface Props {
  allocation: Returns
  onChange: (next: Returns) => void
  onLockIn: () => void
  disabled: boolean
}

const ALLOCATABLE: AssetClass[] = ["stocks", "bonds", "gold", "oil"]

export default function AllocationPanel({ allocation, onChange, onLockIn, disabled }: Props) {
  const cash = Math.max(0, 100 - (allocation.stocks + allocation.bonds + allocation.gold + allocation.oil))
  const overAllocated = allocation.stocks + allocation.bonds + allocation.gold + allocation.oil > 100

  function setOne(key: AssetClass, value: number) {
    const others =
      ALLOCATABLE.filter((k) => k !== key).reduce((sum, k) => sum + allocation[k], 0)
    const max = 100 - others
    const clamped = Math.max(0, Math.min(max, value))
    onChange({ ...allocation, [key]: clamped, cash: Math.max(0, 100 - others - clamped) })
  }

  function applyPreset(p: Returns) {
    onChange({ ...p })
  }

  const allocatedCount = (Object.keys(allocation) as AssetClass[]).filter((k) => allocation[k] > 0).length

  return (
    <div className="space-y-4">
      {/* Stacked allocation bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Your portfolio</p>
          <p className="text-xs text-gray-500">{allocatedCount} asset{allocatedCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-800 ring-1 ring-gray-700">
          {ASSETS.map((a) => {
            const v = a.key === "cash" ? cash : allocation[a.key]
            if (v <= 0) return null
            return (
              <div
                key={a.key}
                className="transition-[width] duration-200"
                style={{ width: `${v}%`, backgroundColor: a.color }}
                title={`${a.label}: ${v}%`}
              />
            )
          })}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-2.5">
        {ASSETS.map((a) => {
          const value = a.key === "cash" ? cash : allocation[a.key]
          const isCash = a.key === "cash"
          return (
            <div key={a.key} className="flex items-center gap-3">
              <span className="text-base w-6 text-center" aria-hidden>
                {a.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-300 truncate">{a.label}</span>
                  <span
                    className="text-xs font-mono font-bold tabular-nums"
                    style={{ color: a.color }}
                  >
                    {value}%
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 transition-[width] duration-150"
                    style={{ width: `${value}%`, backgroundColor: a.color, opacity: isCash ? 0.5 : 1 }}
                  />
                  {!isCash && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={value}
                      onChange={(e) => setOne(a.key, Number(e.target.value))}
                      disabled={disabled}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      aria-label={a.label}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {overAllocated && (
        <p className="text-xs text-rose-400 text-center font-medium">
          Allocation over 100%. Reduce a slider to continue.
        </p>
      )}

      {/* Presets */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
          Quick presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.allocation)}
              disabled={disabled}
              className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-xs font-medium text-gray-300 px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onLockIn}
        disabled={disabled || overAllocated}
        className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-bold py-3 transition-colors disabled:cursor-not-allowed"
      >
        Lock in portfolio →
      </button>
    </div>
  )
}
