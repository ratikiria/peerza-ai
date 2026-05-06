"use client"

import { useState } from "react"
import { Target, TrendingUp, Trophy, Users, Lock, Coins, Crown } from "lucide-react"

const market = {
  question: "Will SOL close above $215 by end of week?",
  yesPercent: 58,
  noPercent: 42,
  pool: 12480,
  participants: 217,
  closes: "Sun 11:59 PM UTC",
}

const leaderboard = [
  { rank: 1, name: "Olivia Chen", handle: "solana_maxi", winnings: 1240, accuracy: 78 },
  { rank: 2, name: "Daniel Park", handle: "onchain_alpha", winnings: 980, accuracy: 71 },
  { rank: 3, name: "Sofia Reyes", handle: "defi_degen", winnings: 815, accuracy: 69 },
  { rank: 4, name: "Ryan Walker", handle: "wallet_wizard", winnings: 640, accuracy: 64 },
  { rank: 5, name: "Priya Sharma", handle: "block_hodler", winnings: 510, accuracy: 62 },
]

export default function PredictionLeague() {
  const [side, setSide] = useState<"YES" | "NO" | null>(null)
  const [stake, setStake] = useState(5)

  const expectedPayout = side === "YES" ? (stake / market.yesPercent) * 100 : side === "NO" ? (stake / market.noPercent) * 100 : 0

  return (
    <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-gray-950 to-orange-950/10 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Target size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-50 tracking-tight">Prediction League</h2>
          <p className="text-xs text-amber-300/70">Non-custodial · USDC stakes on-chain</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          <Lock size={10} /> UI mockup
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">
        Crypto-native prediction markets with on-chain stakes — pool held by a Solana program, settled by price oracle, auto-payout to winners. Crypto outcomes only (SOL, BTC, ETH, on-chain metrics) to avoid securities regulation; sports & entertainment markets follow.
      </p>

      {/* Active market card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-1">Active market</p>
            <h3 className="text-base font-bold text-gray-100 leading-snug">{market.question}</h3>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Users size={12} /> {market.participants}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{market.closes}</p>
          </div>
        </div>

        {/* YES/NO bar */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSide("YES")}
            className={`relative rounded-xl border p-3 text-left transition-all ${
              side === "YES"
                ? "border-emerald-500/60 bg-emerald-500/15"
                : "border-gray-800 bg-gray-900/40 hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400">YES</span>
              <span className="text-[10px] text-gray-500">↑ +12% today</span>
            </div>
            <p className="text-2xl font-black text-emerald-300 tabular-nums">{market.yesPercent}¢</p>
          </button>
          <button
            onClick={() => setSide("NO")}
            className={`relative rounded-xl border p-3 text-left transition-all ${
              side === "NO"
                ? "border-rose-500/60 bg-rose-500/15"
                : "border-gray-800 bg-gray-900/40 hover:border-rose-500/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-rose-400">NO</span>
              <span className="text-[10px] text-gray-500">↓ -12% today</span>
            </div>
            <p className="text-2xl font-black text-rose-300 tabular-nums">{market.noPercent}¢</p>
          </button>
        </div>

        {/* Stake input */}
        <div className="rounded-xl bg-gray-950/60 border border-gray-800 p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Your stake</span>
            <div className="flex gap-1">
              {[1, 5, 25, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    stake === amt
                      ? "bg-amber-500/30 text-amber-200"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Coins size={16} className="text-amber-400" />
            <span className="text-2xl font-black text-gray-100 tabular-nums">{stake}</span>
            <span className="text-sm font-semibold text-amber-300">USDC</span>
            {side && (
              <span className="ml-auto text-xs text-gray-400">
                Win →{" "}
                <span className="font-bold text-emerald-400">{expectedPayout.toFixed(2)} USDC</span>
              </span>
            )}
          </div>
        </div>

        {/* Pool */}
        <div className="flex items-center justify-between text-xs mb-4">
          <span className="text-gray-500">Total pool</span>
          <span className="font-bold text-amber-300 tabular-nums">{market.pool.toLocaleString()} USDC</span>
        </div>

        <button
          disabled={!side}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 text-gray-950 disabled:cursor-not-allowed font-black px-5 py-3 text-sm tracking-wide transition-colors shadow-lg shadow-amber-500/20"
        >
          {side ? `Stake ${stake} USDC on ${side}` : "Pick a side"}
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Funds held by Solana program. Auto-paid on resolution. Provably fair via on-chain VRF.
        </p>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/60">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Top earners — this week</span>
        </div>
        <div className="divide-y divide-gray-800">
          {leaderboard.map((p) => (
            <div key={p.handle} className="flex items-center gap-3 px-4 py-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                p.rank === 1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                p.rank === 2 ? "bg-gray-400/20 text-gray-200 border border-gray-400/40" :
                p.rank === 3 ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" :
                "bg-gray-800 text-gray-400"
              }`}>
                {p.rank === 1 ? <Crown size={12} /> : p.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100 leading-tight">{p.name}</p>
                <p className="text-[11px] text-gray-500">@{p.handle} · {p.accuracy}% accuracy</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400 tabular-nums">+{p.winnings} USDC</p>
                <p className="text-[10px] text-gray-500">this week</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
