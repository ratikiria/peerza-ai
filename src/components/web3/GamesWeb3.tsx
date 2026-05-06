"use client"

import { useState } from "react"
import { Swords, Trophy, Crown, Coins, Lock, Clock, Users, Activity, TrendingUp, Briefcase, Zap, Shield } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface DuelGame {
  id: string
  title: string
  icon: LucideIcon
  challenger: string
  challengerAvatar: string
  challengee: string
  challengeeAvatar: string
  stake: number
}

const sampleDuel: DuelGame = {
  id: "duel-001",
  title: "Guess the Direction",
  icon: TrendingUp,
  challenger: "solana_maxi",
  challengerAvatar: "🦊",
  challengee: "you",
  challengeeAvatar: "🦊",
  stake: 5,
}

interface Tournament {
  id: string
  title: string
  game: string
  icon: LucideIcon
  pool: number
  entries: number
  capacity: number
  entryFee: number
  topN: number
  endsIn: string
}

const sampleTournament: Tournament = {
  id: "tape-daily",
  title: "Daily Tape Reader",
  game: "Read the Tape",
  icon: Activity,
  pool: 87,
  entries: 87,
  capacity: 100,
  entryFee: 1,
  topN: 10,
  endsIn: "2h 14m",
}

const traderScore = {
  rating: 1247,
  tier: "Diamond",
  tierColor: "text-cyan-300",
  tierBg: "bg-cyan-500/15 border-cyan-500/40",
  winRate: 64,
  duels: 28,
  tournaments: 11,
  achievements: 12,
}

export default function GamesWeb3() {
  const [duelAccepted, setDuelAccepted] = useState(false)
  const [enrolled, setEnrolled] = useState(false)

  return (
    <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-gray-950 to-violet-950/20 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
          <Swords size={20} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-50 tracking-tight">Games × Web3</h2>
          <p className="text-xs text-indigo-300/70">Real stakes · provable fairness · portable rating</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          <Lock size={10} /> UI mockup
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">
        The 3 live games + async duels become a real-money layer on Solana. Stakes, tournament pools, and a portable on-chain rating that follows the user across the ecosystem.
      </p>

      {/* Staked Duel */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords size={14} className="text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Staked Duel</span>
          <span className="ml-auto text-[10px] text-gray-500">{sampleDuel.title}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
          {/* Challenger */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              {sampleDuel.challengerAvatar}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-100 truncate">@{sampleDuel.challenger}</p>
              <p className="text-[11px] text-emerald-400 font-semibold">Staked {sampleDuel.stake} USDC</p>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] text-gray-500 font-bold">VS</div>
            <Coins size={14} className="text-amber-400" />
            <div className="text-[10px] text-amber-300 font-bold">{sampleDuel.stake * 2 - 1} USDC</div>
            <div className="text-[9px] text-gray-500">winner takes</div>
          </div>

          {/* You */}
          <div className="flex items-center gap-3 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-sm font-bold text-gray-100">you</p>
              <p className="text-[11px] text-gray-500 font-semibold">
                {duelAccepted ? `Staked ${sampleDuel.stake} USDC` : "Match the stake to accept"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              {sampleDuel.challengeeAvatar}
            </div>
          </div>
        </div>

        <button
          onClick={() => setDuelAccepted(!duelAccepted)}
          className={`w-full rounded-xl px-5 py-3 text-sm font-black tracking-wide transition-colors shadow-lg ${
            duelAccepted
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-indigo-500 hover:bg-indigo-400 text-gray-950 shadow-indigo-500/20"
          }`}
        >
          {duelAccepted ? "Stake escrowed · waiting for opponent…" : `Accept duel · stake ${sampleDuel.stake} USDC`}
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Both stakes held by Solana program. Winner determined by score, paid out automatically.
        </p>
      </div>

      {/* Tournament */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Tournament</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-amber-300 font-semibold">
            <Clock size={10} /> Ends in {sampleTournament.endsIn}
          </span>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <sampleTournament.icon size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-100">{sampleTournament.title}</p>
            <p className="text-xs text-gray-400 mb-2">{sampleTournament.game} · top {sampleTournament.topN} win</p>

            {/* Pool & entries grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Prize pool</p>
                <p className="text-sm font-black text-amber-300 tabular-nums">{sampleTournament.pool} USDC</p>
              </div>
              <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Entries</p>
                <p className="text-sm font-black text-gray-100 tabular-nums">
                  {sampleTournament.entries} <span className="text-gray-500 font-normal">/ {sampleTournament.capacity}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="rounded-full bg-gray-800/60 h-1.5 mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
            style={{ width: `${(sampleTournament.entries / sampleTournament.capacity) * 100}%` }}
          />
        </div>

        <button
          onClick={() => setEnrolled(!enrolled)}
          className={`w-full rounded-xl px-5 py-3 text-sm font-black tracking-wide transition-colors shadow-lg ${
            enrolled
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-amber-500/20"
          }`}
        >
          {enrolled ? "Enrolled · good luck!" : `Enter · ${sampleTournament.entryFee} USDC`}
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Entry fees pool on-chain. Top {sampleTournament.topN} split the pool by rank — paid automatically when tournament closes.
        </p>
      </div>

      {/* Trader Score */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown size={14} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Trader Score</span>
          <span className="ml-auto text-[10px] text-cyan-300/80">on-chain · portable</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          {/* Score big */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 p-4 flex-shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1">Rating</p>
            <p className="text-3xl font-black text-cyan-300 tabular-nums leading-none">{traderScore.rating}</p>
            <span className={`mt-2 inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${traderScore.tierBg} ${traderScore.tierColor}`}>
              {traderScore.tier}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Win rate</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">{traderScore.winRate}%</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Duels</p>
              <p className="text-sm font-bold text-gray-100 tabular-nums">{traderScore.duels}</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Tournaments</p>
              <p className="text-sm font-bold text-gray-100 tabular-nums">{traderScore.tournaments}</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 border border-gray-800 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Achievements</p>
              <p className="text-sm font-bold text-gray-100 tabular-nums">{traderScore.achievements}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          A single on-chain score that aggregates paper P&amp;L, duel record, tournament finishes, and achievements.
          Other Solana apps can read it — your reputation follows you across the ecosystem.
        </p>
      </div>

      {/* Tier rail at bottom */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-3">
          <Zap size={14} className="text-amber-400 mb-1" />
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Why Solana</p>
          <p className="text-xs font-semibold text-gray-200 leading-tight">5 USDC stakes economical at sub-cent fees</p>
        </div>
        <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-3">
          <Shield size={14} className="text-emerald-400 mb-1" />
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Provably fair</p>
          <p className="text-xs font-semibold text-gray-200 leading-tight">Switchboard VRF seeds every scenario</p>
        </div>
        <div className="rounded-xl bg-gray-900/40 border border-gray-800 p-3">
          <Users size={14} className="text-purple-400 mb-1" />
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Portable</p>
          <p className="text-xs font-semibold text-gray-200 leading-tight">Score readable by any Solana app</p>
        </div>
      </div>
    </div>
  )
}
