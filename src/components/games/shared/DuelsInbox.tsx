"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Swords, Inbox, Send, Trophy, Clock, ArrowRight } from "lucide-react"

type GameId = "guess-direction" | "build-portfolio" | "read-tape"

interface Duel {
  id: string
  gameId: GameId
  seed: string
  challengerId: string
  challengeeId: string
  challengerPct: number
  challengeePct: number | null
  challengeeAt: string | null
  expiresAt: string
  createdAt: string
  challenger: { id: string; name: string; username: string; image: string | null }
  challengee: { id: string; name: string; username: string; image: string | null }
}

interface SessionShape {
  user: { id: string }
}

const GAME_LABEL: Record<GameId, string> = {
  "guess-direction": "Guess the Direction",
  "build-portfolio": "Build the Portfolio",
  "read-tape": "Read the Tape",
}

const GAME_PATH: Record<GameId, string> = {
  "guess-direction": "/games/guess-direction",
  "build-portfolio": "/games/build-portfolio",
  "read-tape": "/games/read-tape",
}

type Tab = "incoming" | "sent"

export default function DuelsInbox() {
  const [tab, setTab] = useState<Tab>("incoming")
  const [duels, setDuels] = useState<Duel[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: SessionShape | null) => setMe(s?.user?.id ?? null))
      .catch(() => setMe(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/games/duels?box=${tab}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Duel[]) => setDuels(d))
      .catch(() => setDuels([]))
      .finally(() => setLoading(false))
  }, [tab])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
          <Swords size={22} className="text-indigo-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-50">Duels</h1>
          <p className="text-sm text-gray-500">Head-to-head game challenges with friends.</p>
        </div>
        <Link
          href="/games"
          className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
        >
          Back to Games
        </Link>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-900 border border-gray-800 p-1 mb-5 w-max">
        <button
          onClick={() => setTab("incoming")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${
            tab === "incoming" ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Inbox size={14} /> Incoming
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition ${
            tab === "sent" ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Send size={14} /> Sent
        </button>
      </div>

      {loading && (
        <div className="text-center text-sm text-gray-500 py-12">Loading…</div>
      )}

      {!loading && duels.length === 0 && (
        <div className="text-center py-16 rounded-2xl border border-gray-800 bg-gray-900/40">
          <Swords size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-sm text-gray-400 mb-1">
            {tab === "incoming" ? "No challenges waiting." : "You haven't sent any duels yet."}
          </p>
          <p className="text-xs text-gray-600">
            {tab === "incoming"
              ? "Friends can challenge you from any game's result screen."
              : "Finish a game and tap Challenge a friend to start one."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {duels.map((d) => (
          <DuelRow key={d.id} duel={d} me={me} />
        ))}
      </div>
    </div>
  )
}

function DuelRow({ duel, me }: { duel: Duel; me: string | null }) {
  const isChallenger = me === duel.challengerId
  const opponent = isChallenger ? duel.challengee : duel.challenger
  const completed = duel.challengeePct !== null
  const expired = !completed && new Date(duel.expiresAt) < new Date()

  let verdict: { label: string; tone: "emerald" | "rose" | "amber" | "gray" } = {
    label: "Pending",
    tone: "gray",
  }
  if (completed) {
    const youPct = isChallenger ? duel.challengerPct : duel.challengeePct!
    const themPct = isChallenger ? duel.challengeePct! : duel.challengerPct
    if (youPct > themPct) verdict = { label: "You won", tone: "emerald" }
    else if (youPct < themPct) verdict = { label: "You lost", tone: "rose" }
    else verdict = { label: "Tied", tone: "amber" }
  } else if (expired) {
    verdict = { label: "Expired", tone: "gray" }
  } else if (!isChallenger) {
    verdict = { label: "Your turn", tone: "amber" }
  }

  const toneClass =
    verdict.tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : verdict.tone === "rose"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : verdict.tone === "amber"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-gray-800 text-gray-400 border-gray-700"

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {opponent.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opponent.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-300">
              {opponent.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">
            {isChallenger ? "vs " : ""}
            {opponent.name}{" "}
            <span className="text-xs font-normal text-gray-500">@{opponent.username}</span>
          </p>
          <p className="text-xs text-gray-500 truncate">
            {GAME_LABEL[duel.gameId]} •{" "}
            {completed ? (
              <>
                <Trophy size={10} className="inline" /> Final
              </>
            ) : (
              <>
                <Clock size={10} className="inline" /> Pending
              </>
            )}
          </p>
        </div>

        <span
          className={`text-[11px] uppercase tracking-wider font-bold rounded-full border px-2.5 py-1 ${toneClass}`}
        >
          {verdict.label}
        </span>

        {!completed && !expired && !isChallenger && (
          <Link
            href={`${GAME_PATH[duel.gameId]}?duel=${duel.id}&seed=${encodeURIComponent(duel.seed)}`}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 text-xs font-semibold"
          >
            Play <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {completed && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-gray-950/40 px-3 py-2">
            <p className="text-[10px] uppercase text-gray-500">You</p>
            <p className="font-mono font-bold text-gray-100">
              {(isChallenger ? duel.challengerPct : duel.challengeePct!) >= 0 ? "+" : ""}
              {(isChallenger ? duel.challengerPct : duel.challengeePct!).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-gray-950/40 px-3 py-2">
            <p className="text-[10px] uppercase text-gray-500">{opponent.name}</p>
            <p className="font-mono font-bold text-gray-100">
              {(isChallenger ? duel.challengeePct! : duel.challengerPct) >= 0 ? "+" : ""}
              {(isChallenger ? duel.challengeePct! : duel.challengerPct).toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
