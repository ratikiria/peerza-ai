import Link from "next/link"
import {
  Gamepad2,
  TrendingUp,
  Clock,
  Wallet,
  Trophy,
  ArrowRight,
  Sparkles,
  Lock,
  Briefcase,
  Activity,
  Target,
  Swords,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import LeaderboardWidget from "@/components/games/shared/LeaderboardWidget"

interface LiveGame {
  href: string
  title: string
  tagline: string
  blurb: string
  duration: string
  bankroll: string
  rounds: string
  difficulty: string
  icon: LucideIcon
  isNew?: boolean
}

const liveGames: LiveGame[] = [
  {
    href: "/games/guess-direction",
    title: "Guess the Direction",
    tagline: "Real history. Real charts. Five high-stakes minutes.",
    blurb:
      "Russia/Ukraine, Brexit, Lehman, GameStop, BTC top — read the moment, call BUY or SELL, and find out what really happened.",
    duration: "5 min",
    bankroll: "$10,000",
    rounds: "6 scenarios",
    difficulty: "Beginner-friendly",
    icon: TrendingUp,
  },
  {
    href: "/games/build-portfolio",
    title: "Build the Portfolio",
    tagline: "Allocate. Survive. Outperform 60/40.",
    blurb:
      "Distribute $10k across stocks, bonds, gold, oil and cash before each macro event. See how diversification actually works in different regimes.",
    duration: "6 min",
    bankroll: "$10,000",
    rounds: "6 scenarios",
    difficulty: "Intermediate",
    icon: Briefcase,
  },
  {
    href: "/games/read-tape",
    title: "Read the Tape",
    tagline: "Order flow live. Spot the aggressor.",
    blurb:
      "Thirty seconds of order flow stream in across the screen. Read who's lifting the offer, who's hitting the bid — then call which way price moves next.",
    duration: "6 min",
    bankroll: "$10,000",
    rounds: "5 scenarios",
    difficulty: "Advanced",
    icon: Activity,
    isNew: true,
  },
]

const comingSoon = [
  {
    title: "Prediction League",
    icon: Target,
    blurb: "Daily multiplayer prediction markets — earn points, climb the leaderboard.",
  },
]

export default function GamesPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 mb-8 bg-gradient-to-br from-emerald-950/60 via-gray-950 to-indigo-950/40">
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl animate-[pz-blob_12s_ease-in-out_infinite]" />
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-[pz-blob2_14s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl animate-[pz-blob3_16s_ease-in-out_infinite]" />
        </div>

        <div className="relative p-8 sm:p-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles size={12} /> Pillar 4 — Now live
            </span>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Gamepad2 size={28} className="text-gray-950" />
              <span className="absolute -inset-1 rounded-2xl bg-emerald-400/30 blur-md -z-10 animate-[pz-glow_3s_ease-in-out_infinite]" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-50 tracking-tight leading-none">
                GAMES
              </h1>
              <p className="text-sm text-emerald-300/80 font-medium mt-1">Learn the markets by playing them</p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-6">
            Step into real historical moments. Make the call. Find out instantly what the world actually did — and why.
          </p>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Live games</p>
              <p className="text-xl font-black text-emerald-400 tabular-nums">{liveGames.length}</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Bankroll</p>
              <p className="text-xl font-black text-amber-300 tabular-nums">$10K</p>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Round</p>
              <p className="text-xl font-black text-gray-100 tabular-nums">5 min</p>
            </div>
          </div>
        </div>
      </section>

      {/* Duels CTA */}
      <section className="mb-6">
        <Link
          href="/games/duels"
          className="group flex items-center gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-gray-900 to-gray-900 p-4 hover:border-indigo-400/50 transition"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Swords size={20} className="text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-100">Duels — challenge a friend</p>
            <p className="text-xs text-indigo-200/70">
              Same scenarios, same seed. Compare your score head-to-head.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-300 group-hover:translate-x-1 transition-transform">
            Open inbox →
          </span>
        </Link>
      </section>

      {/* Featured games */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
            <Trophy size={14} className="text-emerald-400" /> Live games
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {liveGames.map((g) => {
            const Icon = g.icon
            return (
              <Link key={g.href} href={g.href} className="group block">
                <div className="relative overflow-hidden h-full rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-0.5">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />

                  {g.isNew && (
                    <span className="absolute top-3 right-3 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 animate-pulse">
                      ● NEW
                    </span>
                  )}

                  <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <Icon size={22} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black text-gray-50 tracking-tight mb-1">
                          {g.title}
                        </h3>
                        <p className="text-sm font-semibold text-emerald-400/90">{g.tagline}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed mb-5">{g.blurb}</p>

                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300">
                        <Clock size={12} className="text-gray-400" /> {g.duration}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300">
                        <Wallet size={12} className="text-emerald-400" /> {g.bankroll}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300">
                        <Trophy size={12} className="text-amber-400" /> {g.rounds}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800/60 border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300">
                        {g.difficulty}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 group-hover:bg-emerald-400 text-gray-950 font-black px-5 py-3 text-sm tracking-wide transition-colors shadow-lg shadow-emerald-500/30">
                      <span>PLAY NOW</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mb-10">
        <LeaderboardWidget />
      </section>

      {/* Coming soon */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
            <Lock size={14} className="text-gray-500" /> In development
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comingSoon.map((g) => {
            const Icon = g.icon
            return (
              <div
                key={g.title}
                className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 opacity-60 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-center">
                    <Icon size={18} className="text-gray-500" />
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-200 mb-1">{g.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{g.blurb}</p>
              </div>
            )
          })}
        </div>
      </section>

      <style>{`
        @keyframes pz-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.1); }
        }
        @keyframes pz-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.08); }
        }
        @keyframes pz-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -25px) scale(0.92); }
        }
        @keyframes pz-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
