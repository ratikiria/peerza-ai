"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Briefcase,
  Clock,
  Wallet,
  Trophy,
  RotateCcw,
  Newspaper,
  GraduationCap,
  Lightbulb,
} from "lucide-react"
import {
  PORTFOLIO_SCENARIOS,
  type PortfolioScenario,
  type Returns,
  ZERO_ALLOCATION,
  portfolioReturn,
  ASSETS,
} from "./scenarios"
import AllocationPanel from "./AllocationPanel"
import PortfolioResult from "./PortfolioResult"
import Confetti from "../shared/Confetti"
import SoundControl from "../shared/SoundControl"
import BigBangText from "../shared/BigBangText"
import ScreenFlash from "../shared/ScreenFlash"
import ShareButton from "../shared/ShareButton"
import { useAnimatedCounter } from "../shared/useAnimatedCounter"
import { useGameSounds } from "../shared/useGameSounds"
import { useGameMusic } from "../shared/useGameMusic"
import { useGameSave } from "../shared/useGameSave"
import { useDuelContext } from "../shared/useDuelContext"
import { makeRng, shuffleWith } from "../shared/seededRng"
import ChallengeFriendModal from "../shared/ChallengeFriendModal"
import DuelResultCard from "../shared/DuelResultCard"

const STARTING_BALANCE = 10000
const GAME_SECONDS = 360 // 6 minutes — slightly more than Guess Direction since allocating takes longer

type Phase = "allocating" | "revealed" | "finished"

interface RoundResult {
  scenario: PortfolioScenario
  allocation: Returns
  returnPct: number
  pnl: number
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`
const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`

function buildPortfolioShareText(
  balance: number,
  pnl: number,
  rounds: number,
  profitable: number,
  isPersonalBest: boolean
): string {
  const ret = ((pnl / 10000) * 100).toFixed(1)
  const verb = pnl >= 0 ? "💼" : "📉"
  const pb = isPersonalBest ? " 🏆 New personal best!" : ""
  return `${verb} Just played Build the Portfolio.\n\nFinished at ${fmtMoney(balance)} (${pnl >= 0 ? "+" : ""}${ret}%) — ${profitable}/${rounds} profitable rounds.${pb}\n\nAllocate $10k across stocks, bonds, gold, oil and cash before each macro shock. Try it under Games.`
}

export default function BuildPortfolioGame() {
  const duel = useDuelContext()
  const [showChallenge, setShowChallenge] = useState(false)
  const [scenarios, setScenarios] = useState<PortfolioScenario[]>([])
  const [balance, setBalance] = useState(STARTING_BALANCE)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>("allocating")
  const [allocation, setAllocation] = useState<Returns>({ ...ZERO_ALLOCATION, cash: 100 })
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS)
  const [results, setResults] = useState<RoundResult[]>([])
  const [confettiTick, setConfettiTick] = useState(0)
  const [bumpKey, setBumpKey] = useState(0)
  const [flashTick, setFlashTick] = useState(0)
  const [flashColor, setFlashColor] = useState<"green" | "red" | "gold">("green")
  const [bigBangTick, setBigBangTick] = useState(0)
  const [bigBangValue, setBigBangValue] = useState("")
  const [bigBangPositive, setBigBangPositive] = useState(true)
  const sounds = useGameSounds()
  const finishedSoundRef = useRef(false)
  const animatedBalance = useAnimatedCounter(balance, 700)

  const { saved, reset: resetSave } = useGameSave(phase === "finished" && results.length > 0, {
    gameId: "build-portfolio",
    startingBalance: STARTING_BALANCE,
    finalBalance: balance,
    pnl: balance - STARTING_BALANCE,
    returnPct: ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100,
    roundsPlayed: results.length,
    winRate: results.length > 0 ? results.filter((r) => r.pnl > 0).length / results.length : 0,
    durationSec: GAME_SECONDS - secondsLeft,
    scenarios: results.map((r) => r.scenario.id),
    duelId: duel.duelId,
    seed: duel.seed,
  })

  const musicIntensity =
    secondsLeft < 30 ? 0.95 : secondsLeft < 90 ? 0.7 : secondsLeft < 200 ? 0.5 : 0.3
  useGameMusic({
    active: scenarios.length > 0 && phase !== "finished",
    muted: sounds.muted,
    intensity: musicIntensity,
    volume: sounds.volume,
  })

  useEffect(() => {
    if (!duel.seed) return
    setScenarios(shuffleWith(PORTFOLIO_SCENARIOS, makeRng(duel.seed)))
  }, [duel.seed])

  useEffect(() => {
    if (phase === "finished" || scenarios.length === 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setPhase("finished")
          return 0
        }
        if (s <= 11) sounds.tick()
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, scenarios.length, sounds])

  useEffect(() => {
    if (phase !== "finished" || finishedSoundRef.current) return
    finishedSoundRef.current = true
    if (balance >= STARTING_BALANCE) {
      sounds.win()
      setConfettiTick((t) => t + 1)
    } else {
      sounds.lose()
    }
  }, [phase, balance, sounds])

  // Reset allocation when round changes
  useEffect(() => {
    if (phase === "allocating") {
      setAllocation({ ...ZERO_ALLOCATION, cash: 100 })
    }
  }, [idx, phase])

  // Newscaster TTS
  const current = scenarios[idx]
  useEffect(() => {
    if (phase !== "allocating" || !current) return
    if (typeof window === "undefined" || !window.speechSynthesis) return
    if (sounds.voiceMuted) return

    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(
      `Breaking news. ${current.headline}. ${current.story}`
    )
    utter.rate = 1.05
    utter.pitch = 0.92
    utter.volume = Math.max(0, Math.min(1, sounds.voiceVolume))

    function pickVoice(): SpeechSynthesisVoice | null {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return null
      const preferred = [
        "Google UK English Male",
        "Google US English",
        "Microsoft Guy",
        "Microsoft Mark",
        "Microsoft David",
        "Daniel",
        "Alex",
      ]
      for (const name of preferred) {
        const v = voices.find((vc) => vc.name.includes(name))
        if (v) return v
      }
      const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"))
      const male = en.find((v) => /male|david|mark|guy|daniel|alex|fred/i.test(v.name))
      return male || en[0] || voices[0]
    }

    function speakNow() {
      const v = pickVoice()
      if (v) utter.voice = v
      window.speechSynthesis.speak(utter)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        speakNow()
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      speakNow()
    }

    return () => {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
  }, [phase, current, sounds.voiceMuted])

  useEffect(() => {
    if (sounds.voiceMuted && typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
  }, [sounds.voiceMuted])

  const lastResult = results[results.length - 1]

  function handleLockIn() {
    if (phase !== "allocating" || !current) return
    sounds.click()
    const total =
      allocation.stocks + allocation.bonds + allocation.gold + allocation.oil + allocation.cash
    if (total < 100) {
      // Auto-fill cash with the remainder
      allocation.cash = 100 - (allocation.stocks + allocation.bonds + allocation.gold + allocation.oil)
    }
    const returnPct = portfolioReturn(allocation, current.returns)
    const pnl = (balance * returnPct) / 100
    const newBalance = Math.max(0, balance + pnl)
    setBalance(newBalance)
    setBumpKey((k) => k + 1)
    setResults((r) => [...r, { scenario: current, allocation: { ...allocation }, returnPct, pnl }])
    setPhase("revealed")

    const sign = pnl >= 0 ? "+" : "−"
    setBigBangValue(`${sign}${fmtMoney(Math.abs(pnl))}`)
    setBigBangPositive(pnl >= 0)
    setBigBangTick((t) => t + 1)
    setFlashColor(pnl >= 0 ? "green" : "red")
    setFlashTick((t) => t + 1)

    if (pnl > 0) {
      setConfettiTick((t) => t + 1)
      sounds.correct()
    } else if (pnl < 0) {
      sounds.wrong()
    } else {
      sounds.click()
    }
  }

  function handleNext() {
    sounds.click()
    if (idx + 1 >= scenarios.length) {
      setPhase("finished")
      return
    }
    setIdx(idx + 1)
    setPhase("allocating")
  }

  function handleReplay() {
    finishedSoundRef.current = false
    resetSave()
    setScenarios(shuffleWith(PORTFOLIO_SCENARIOS, makeRng(duel.seed)))
    setBalance(STARTING_BALANCE)
    setIdx(0)
    setSecondsLeft(GAME_SECONDS)
    setResults([])
    setAllocation({ ...ZERO_ALLOCATION, cash: 100 })
    setPhase("allocating")
  }

  if (scenarios.length === 0 || !current) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">Loading…</div>
  }

  if (phase === "finished") {
    const totalPnl = balance - STARTING_BALANCE
    const winning = totalPnl >= 0
    const winRounds = results.filter((r) => r.pnl > 0).length
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Confetti trigger={confettiTick} count={120} />
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                winning ? "bg-emerald-500/15" : "bg-rose-500/15"
              }`}
            >
              <Trophy size={24} className={winning ? "text-emerald-400" : "text-rose-400"} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Game Over</h2>
              <p className="text-sm text-gray-500">
                {results.length} round{results.length !== 1 ? "s" : ""} played
                {secondsLeft === 0 ? " • time expired" : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-gray-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Final balance
              </p>
              <p className="text-xl font-bold text-gray-100">{fmtMoney(balance)}</p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">P&amp;L</p>
              <p
                className={`text-xl font-bold font-mono ${
                  winning ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}
                {fmtMoney(totalPnl)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Profitable</p>
              <p className="text-xl font-bold text-gray-100">
                {winRounds}/{results.length}
              </p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-gray-800/30 px-3 py-2"
                >
                  <span className="text-[10px] text-gray-600 font-mono w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 truncate">{r.scenario.headline}</p>
                    <p className="text-[10px] text-gray-500">
                      Return {r.returnPct >= 0 ? "+" : ""}
                      {r.returnPct.toFixed(1)}%
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      r.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {r.pnl >= 0 ? "+" : ""}
                    {fmtMoney(r.pnl)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {saved?.isPersonalBest && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-4 py-3 flex items-center gap-3 animate-[pz-pop_400ms_ease-out]">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-bold text-amber-300">New personal best!</p>
                <p className="text-xs text-amber-200/70">
                  Your best return on Build the Portfolio so far.
                </p>
              </div>
            </div>
          )}

          {saved?.duel && <DuelResultCard duel={saved.duel} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={handleReplay}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold py-3 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Play again
            </button>
            {!duel.duelId && (
              <button
                onClick={() => setShowChallenge(true)}
                className="rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 transition-colors flex items-center justify-center gap-2"
              >
                ⚔️ Challenge a friend
              </button>
            )}
            <ShareButton
              text={buildPortfolioShareText(
                balance,
                totalPnl,
                results.length,
                winRounds,
                saved?.isPersonalBest ?? false
              )}
            />
            <Link
              href="/games"
              className="rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium py-3 transition-colors flex items-center justify-center"
            >
              Back to Games
            </Link>
          </div>
        </div>
        {showChallenge && (
          <ChallengeFriendModal
            gameId="build-portfolio"
            seed={duel.seed}
            yourReturnPct={((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100}
            onClose={() => setShowChallenge(false)}
          />
        )}
      </div>
    )
  }

  const showReveal = phase === "revealed" && lastResult

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Confetti trigger={confettiTick} count={70} />
      <ScreenFlash trigger={flashTick} color={flashColor} />
      <BigBangText trigger={bigBangTick} value={bigBangValue} positive={bigBangPositive} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Briefcase size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100">Build the Portfolio</h1>
            <p className="text-xs text-gray-500">
              Round {idx + 1} of {scenarios.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-gray-800/60 px-3 py-2 flex items-center gap-2">
            <Clock size={14} className={secondsLeft < 30 ? "text-rose-400" : "text-gray-400"} />
            <span
              className={`text-sm font-mono font-semibold ${
                secondsLeft < 30 ? "text-rose-400" : "text-gray-200"
              }`}
            >
              {fmtTime(secondsLeft)}
            </span>
          </div>
          <div
            key={`bump-${bumpKey}`}
            className="rounded-xl bg-gray-800/60 px-3 py-2 flex items-center gap-2 animate-[pz-pop_300ms_ease-out]"
          >
            <Wallet size={14} className="text-emerald-400" />
            <span className="text-sm font-mono font-semibold text-gray-200 tabular-nums">
              {fmtMoney(animatedBalance)}
            </span>
          </div>
          <SoundControl
            muted={sounds.muted}
            volume={sounds.volume}
            onToggleMute={sounds.toggleMute}
            onVolumeChange={sounds.setVolume}
            voiceMuted={sounds.voiceMuted}
            voiceVolume={sounds.voiceVolume}
            onToggleVoiceMute={sounds.toggleVoiceMute}
            onVoiceVolumeChange={sounds.setVoiceVolume}
          />
        </div>
      </div>
      <style>{`
        @keyframes pz-pop {
          0% { transform: scale(0.85); }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* News + asset overview */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper size={16} className="text-amber-400" />
              <p className="text-xs uppercase tracking-wider font-bold text-amber-400">
                Breaking news
              </p>
              <span className="ml-auto text-xs text-gray-500 font-mono">{current.date}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-50 mb-2 leading-snug">
              {current.headline}
            </p>
            <p className="text-base text-gray-300 leading-relaxed">{current.story}</p>
          </div>

          {/* Resolution window hint */}
          <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-4">
            <p className="text-xs text-gray-400 mb-2">
              <span className="font-semibold text-gray-300">Window:</span> the {current.resolutionWindow}.
              You'll see how each asset performed once you lock in your portfolio.
            </p>
            <div className="flex flex-wrap gap-2">
              {ASSETS.map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-[11px] text-gray-300"
                >
                  <span aria-hidden>{a.icon}</span>
                  {a.label.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Allocation / Result panel */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          {phase === "allocating" ? (
            <>
              <p className="text-sm font-semibold text-gray-100 mb-1">Allocate your $10k</p>
              <p className="text-xs text-gray-500 mb-4">
                Spread it across asset classes. Anything you don't allocate stays in cash.
              </p>
              <AllocationPanel
                allocation={allocation}
                onChange={setAllocation}
                onLockIn={handleLockIn}
                disabled={false}
              />
            </>
          ) : showReveal ? (
            <PortfolioResult
              scenario={current}
              allocation={lastResult.allocation}
              yourPnl={lastResult.pnl}
              yourReturnPct={lastResult.returnPct}
              startingBalance={balance - lastResult.pnl}
              onNext={handleNext}
              isLastRound={idx + 1 >= scenarios.length}
            />
          ) : null}
        </div>
      </div>

      {/* Lesson panel */}
      {showReveal && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper size={16} className="text-gray-400" />
              <p className="text-xs uppercase tracking-wider font-bold text-gray-400">
                What happened
              </p>
            </div>
            <p className="text-base text-gray-200 leading-relaxed">{current.explanation}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={16} className="text-emerald-400" />
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                The lesson
              </p>
            </div>
            <p className="text-base text-gray-100 leading-relaxed">{current.lesson}</p>
            {lastResult && lastResult.pnl < 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-start gap-2">
                <Lightbulb size={14} className="text-amber-400 mt-1 flex-shrink-0" />
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  <span className="font-semibold">Hindsight optimal:</span>{" "}
                  {ASSETS.filter((a) => current.optimal[a.key] > 0)
                    .map((a) => `${current.optimal[a.key]}% ${a.label.split(" ")[0]}`)
                    .join(", ")}
                  . The lesson above explains why.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
