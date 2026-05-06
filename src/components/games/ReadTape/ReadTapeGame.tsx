"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowUp,
  ArrowDown,
  Clock,
  Wallet,
  Trophy,
  RotateCcw,
  Newspaper,
  GraduationCap,
  Activity,
  Lightbulb,
} from "lucide-react"
import {
  SCENARIOS,
  type ReadTapeScenario,
  type TapeEvent,
  generateEvents,
  totalDuration,
} from "./scenarios"
import TapeStream from "./TapeStream"
import LivePriceChart, { type PricePt } from "./LivePriceChart"
import Confetti from "../shared/Confetti"
import SoundControl from "../shared/SoundControl"
import BigBangText from "../shared/BigBangText"
import ScreenFlash from "../shared/ScreenFlash"
import StreakBanner from "../shared/StreakBanner"
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
const TOTAL_GAME_SECONDS = 360
const POST_POINTS = 16

type Phase = "ready" | "streaming" | "choosing" | "revealed" | "finished"
type Direction = "up" | "down"

interface RoundResult {
  scenario: ReadTapeScenario
  direction: Direction
  bet: number
  pct: number
  pnl: number
  correct: boolean
}

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`
const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`

function buildShareText(
  balance: number,
  pnl: number,
  rounds: number,
  correct: number,
  isPersonalBest: boolean
): string {
  const ret = ((pnl / 10000) * 100).toFixed(1)
  const verb = pnl >= 0 ? "📊" : "💀"
  const pb = isPersonalBest ? " 🏆 New personal best!" : ""
  return `${verb} Just played Read the Tape.\n\nFinished at ${fmtMoney(balance)} (${pnl >= 0 ? "+" : ""}${ret}%) — read ${correct}/${rounds} tapes correctly.${pb}\n\nWatch the order flow. Call the next move. Try it under Games.`
}

export default function ReadTapeGame() {
  const duel = useDuelContext()
  const [showChallenge, setShowChallenge] = useState(false)
  const [scenarios, setScenarios] = useState<ReadTapeScenario[]>([])
  const [balance, setBalance] = useState(STARTING_BALANCE)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>("ready")
  const [allEvents, setAllEvents] = useState<TapeEvent[]>([])
  const [streamedCount, setStreamedCount] = useState(0)
  const [postPoints, setPostPoints] = useState<PricePt[]>([])
  const [streamElapsed, setStreamElapsed] = useState(0)
  const [betPct, setBetPct] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_GAME_SECONDS)
  const [results, setResults] = useState<RoundResult[]>([])
  const [streak, setStreak] = useState(0)
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
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const musicIntensity =
    phase === "streaming"
      ? 0.7
      : secondsLeft < 30
        ? 0.95
        : secondsLeft < 90
          ? 0.65
          : 0.35
  useGameMusic({
    active: scenarios.length > 0 && phase !== "finished",
    muted: sounds.muted,
    intensity: musicIntensity,
    volume: sounds.volume,
  })

  useEffect(() => {
    if (!duel.seed) return
    setScenarios(shuffleWith(SCENARIOS, makeRng(duel.seed)))
  }, [duel.seed])

  // Game timer
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

  // Win/lose fanfare
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

  const current = scenarios[idx]

  // TTS for the news headline before tape begins
  useEffect(() => {
    if (phase !== "ready" || !current) return
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
      const preferred = ["Google UK English Male", "Google US English", "Microsoft Guy", "Microsoft Mark", "Microsoft David", "Daniel", "Alex"]
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

  // Generate events whenever scenario changes (deterministic seed = idx + scenario hash)
  useEffect(() => {
    if (!current) return
    const seed = (idx + 1) * 1000 + current.id.length
    const events = generateEvents(current, seed)
    setAllEvents(events)
    setStreamedCount(0)
    setPostPoints([])
    setStreamElapsed(0)
  }, [current, idx])

  // Reset round state on scenario change
  useEffect(() => {
    if (phase === "ready" || phase === "streaming") return
    // No-op
  }, [phase])

  // Cleanup tape timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    }
  }, [])

  const totalMs = useMemo(() => (current ? totalDuration(current) : 30000), [current])

  function startStream() {
    if (!current || phase !== "ready") return
    sounds.click()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    setPhase("streaming")

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setStreamedCount(0)
    setStreamElapsed(0)

    // Schedule each event
    allEvents.forEach((_, i) => {
      const handle = setTimeout(() => {
        setStreamedCount((c) => Math.max(c, i + 1))
      }, allEvents[i].t)
      timersRef.current.push(handle)
    })

    // Elapsed counter (visual progress bar)
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    const startedAt = performance.now()
    elapsedTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt
      setStreamElapsed(elapsed)
      if (elapsed >= totalMs) {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
        setStreamedCount(allEvents.length)
        setStreamElapsed(totalMs)
        setPhase("choosing")
      }
    }, 100)
  }

  const lastResult = results[results.length - 1]
  const betAmount = Math.max(0, Math.round((balance * betPct) / 100))

  function handleBet(direction: Direction) {
    if (phase !== "choosing" || !current || betAmount <= 0) return
    sounds.click()
    const correct =
      (direction === "up" && current.outcome === "up") ||
      (direction === "down" && current.outcome === "down")
    const moveSign = current.outcome === "up" ? 1 : -1
    const pct = moveSign * current.outcomeMovePct
    const pnl = correct
      ? betAmount * (current.outcomeMovePct / 100)
      : -betAmount * (current.outcomeMovePct / 100)
    const newBalance = Math.max(0, balance + pnl)
    setBalance(newBalance)
    setBumpKey((k) => k + 1)

    // Generate post points: extend price along moveSign over POST_POINTS steps
    const last = allEvents[allEvents.length - 1]
    const startP = last?.price ?? current.preTickerPrice
    const endP = startP * (1 + pct / 100)
    const dur = totalMs * 0.3 // post window = 30% of tape
    const postEnd = totalMs + dur
    const newPost: PricePt[] = []
    for (let i = 1; i <= POST_POINTS; i++) {
      const r = i / POST_POINTS
      const t = totalMs + dur * r
      // Slight curve — accelerate then settle
      const eased = 1 - Math.pow(1 - r, 2)
      const p = startP + (endP - startP) * eased
      newPost.push({ t, p })
    }
    setPostPoints(newPost)
    setResults((r) => [...r, { scenario: current, direction, bet: betAmount, pct, pnl, correct }])
    setPhase("revealed")

    const sign = pnl >= 0 ? "+" : "−"
    setBigBangValue(`${sign}${fmtMoney(Math.abs(pnl))}`)
    setBigBangPositive(pnl >= 0)
    setBigBangTick((t) => t + 1)
    setFlashColor(correct ? "green" : "red")
    setFlashTick((t) => t + 1)

    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setConfettiTick((t) => t + 1)
      if (newStreak >= 2) sounds.streak()
      else sounds.correct()
    } else {
      setStreak(0)
      sounds.wrong()
    }
  }

  function handleNext() {
    sounds.click()
    if (idx + 1 >= scenarios.length) {
      setPhase("finished")
      return
    }
    setIdx(idx + 1)
    setPhase("ready")
  }

  function handleReplay() {
    finishedSoundRef.current = false
    setScenarios(shuffleWith(SCENARIOS, makeRng(duel.seed)))
    setBalance(STARTING_BALANCE)
    setIdx(0)
    setBetPct(25)
    setSecondsLeft(TOTAL_GAME_SECONDS)
    setResults([])
    setStreak(0)
    setStreamedCount(0)
    setStreamElapsed(0)
    setPostPoints([])
    setPhase("ready")
  }

  const { saved, reset: resetSave } = useGameSave(phase === "finished" && results.length > 0, {
    gameId: "read-tape",
    startingBalance: STARTING_BALANCE,
    finalBalance: balance,
    pnl: balance - STARTING_BALANCE,
    returnPct: ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100,
    roundsPlayed: results.length,
    winRate: results.length > 0 ? results.filter((r) => r.correct).length / results.length : 0,
    durationSec: TOTAL_GAME_SECONDS - secondsLeft,
    scenarios: results.map((r) => r.scenario.id),
    duelId: duel.duelId,
    seed: duel.seed,
  })

  function _replay() {
    resetSave()
    handleReplay()
  }

  if (scenarios.length === 0 || !current) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">Loading…</div>
    )
  }

  if (phase === "finished") {
    const totalPnl = balance - STARTING_BALANCE
    const winRate =
      results.length > 0 ? (results.filter((r) => r.correct).length / results.length) * 100 : 0
    const winning = totalPnl >= 0
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
                {results.length} tape{results.length !== 1 ? "s" : ""} read
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-gray-800/50 p-4">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Final balance</p>
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
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Win rate</p>
              <p className="text-xl font-bold text-gray-100">{winRate.toFixed(0)}%</p>
            </div>
          </div>

          {saved?.isPersonalBest && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-bold text-amber-300">New personal best!</p>
                <p className="text-xs text-amber-200/70">Highest return on Read the Tape so far.</p>
              </div>
            </div>
          )}

          {saved?.duel && <DuelResultCard duel={saved.duel} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={_replay}
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
              text={buildShareText(
                balance,
                totalPnl,
                results.length,
                results.filter((r) => r.correct).length,
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
            gameId="read-tape"
            seed={duel.seed}
            yourReturnPct={((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100}
            onClose={() => setShowChallenge(false)}
          />
        )}
      </div>
    )
  }

  const visibleEvents = allEvents.slice(0, streamedCount)
  const prePoints: PricePt[] = visibleEvents.map((e) => ({ t: e.t, p: e.price }))
  const showReveal = phase === "revealed" && lastResult
  const isLive = phase === "streaming"
  const streamProgress = totalMs > 0 ? Math.min(1, streamElapsed / totalMs) : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Confetti trigger={confettiTick} count={streak >= 3 ? 90 : 50} />
      <ScreenFlash trigger={flashTick} color={flashColor} />
      <BigBangText trigger={bigBangTick} value={bigBangValue} positive={bigBangPositive} />
      <StreakBanner streak={streak} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Activity size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100">Read the Tape</h1>
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
        {/* Left: chart + news */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-200">{current.asset}</p>
              <p className="text-xs text-gray-500">
                {current.ticker} • {current.date}
              </p>
            </div>
            {phase === "streaming" && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <LivePriceChart
            startPrice={current.preTickerPrice}
            prePoints={prePoints}
            postPoints={showReveal ? postPoints : []}
            totalDurationMs={totalMs}
            revealed={!!showReveal}
            unit={current.unit === "$" ? "$" : ""}
            isLive={isLive}
          />

          {/* Stream progress bar */}
          {phase === "streaming" && (
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-[width] duration-100"
                style={{ width: `${streamProgress * 100}%` }}
              />
            </div>
          )}

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper size={16} className="text-amber-400" />
              <p className="text-xs uppercase tracking-wider font-bold text-amber-400">
                Breaking news
              </p>
            </div>
            <p className="text-lg font-bold text-gray-50 mb-2 leading-snug">{current.headline}</p>
            <p className="text-sm text-gray-300 leading-relaxed">{current.story}</p>
          </div>
        </div>

        {/* Right: tape + bet panel */}
        <div className="space-y-4">
          <TapeStream events={visibleEvents} unit={current.unit === "$" ? "$" : ""} />

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            {phase === "ready" ? (
              <>
                <p className="text-sm font-semibold text-gray-100 mb-1">Ready?</p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Watch the order flow for ~30 seconds. Then call which way price goes in the {current.resolutionWindow}.
                </p>
                <button
                  onClick={startStream}
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-3 transition-colors"
                >
                  Start the tape →
                </button>
              </>
            ) : phase === "streaming" ? (
              <>
                <p className="text-sm font-semibold text-gray-100 mb-1">Reading…</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Watch the prints. Who's the aggressor? Are sellers absorbing buyers? Is price actually moving with the flow?
                </p>
                <div className="mt-4 text-center text-2xl font-mono font-black text-amber-400 tabular-nums">
                  {fmtTime(Math.max(0, Math.ceil((totalMs - streamElapsed) / 1000)))}
                </div>
              </>
            ) : phase === "choosing" ? (
              <>
                <p className="text-sm font-semibold text-gray-100 mb-1">Make the call</p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Where does {current.ticker} go in the {current.resolutionWindow}?
                </p>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">Stake</span>
                    <span className="text-gray-200 font-mono font-semibold">
                      {fmtMoney(betAmount)} <span className="text-gray-500">({betPct}%)</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={betPct}
                    onChange={(e) => setBetPct(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleBet("up")}
                    disabled={balance <= 0}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-3 transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <ArrowUp size={20} />
                    <span className="text-sm">UP</span>
                  </button>
                  <button
                    onClick={() => handleBet("down")}
                    disabled={balance <= 0}
                    className="rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold py-3 transition-colors flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <ArrowDown size={20} />
                    <span className="text-sm">DOWN</span>
                  </button>
                </div>
              </>
            ) : showReveal ? (
              <>
                <div
                  className={`rounded-xl p-4 mb-4 border ${
                    lastResult.correct
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-rose-500/10 border-rose-500/30"
                  }`}
                >
                  <p
                    className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                      lastResult.correct ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {lastResult.correct ? "✓ You read it right" : "✗ Misread"}
                  </p>
                  <p className="text-sm text-gray-200 mb-2">
                    {current.ticker} moved{" "}
                    <span className="font-bold">
                      {lastResult.pct >= 0 ? "+" : ""}
                      {lastResult.pct.toFixed(1)}%
                    </span>{" "}
                    in the {current.resolutionWindow}
                  </p>
                  <p
                    className={`text-3xl font-mono font-bold ${
                      lastResult.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {lastResult.pnl >= 0 ? "+" : ""}
                    {fmtMoney(lastResult.pnl)}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-800/40 px-3 py-2 mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
                    Key driver
                  </p>
                  <p className="text-sm font-semibold text-amber-300">{current.keyDriver}</p>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-3 transition-colors"
                >
                  {idx + 1 >= scenarios.length ? "See results →" : "Next round →"}
                </button>
              </>
            ) : null}
          </div>
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
            {!lastResult?.correct && (
              <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-start gap-2">
                <Lightbulb size={14} className="text-amber-400 mt-1 flex-shrink-0" />
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  <span className="font-semibold">What you missed:</span> watch which side is the
                  AGGRESSOR (lifting offer / hitting bid), not just which side has more prints.
                  Re-read the tape with that lens.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
