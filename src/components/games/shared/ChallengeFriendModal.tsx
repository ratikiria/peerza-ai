"use client"

import { useEffect, useRef, useState } from "react"
import { X, Search, Send, CheckCircle2, Swords } from "lucide-react"

type GameId = "guess-direction" | "build-portfolio" | "read-tape"

interface UserHit {
  id: string
  name: string
  username: string
  image: string | null
  isFollowing?: boolean
}

interface Props {
  gameId: GameId
  seed: string
  yourReturnPct: number
  onClose: () => void
}

const GAME_LABEL: Record<GameId, string> = {
  "guess-direction": "Guess the Direction",
  "build-portfolio": "Build the Portfolio",
  "read-tape": "Read the Tape",
}

export default function ChallengeFriendModal({ gameId, seed, yourReturnPct, onClose }: Props) {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<UserHit[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length === 0) {
      setHits([])
      return
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true)
      fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: UserHit[]) => setHits(data))
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function send(userId: string) {
    setSending(userId)
    setErr(null)
    try {
      const r = await fetch("/api/games/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          seed,
          challengeeId: userId,
          challengerPct: yourReturnPct,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send")
      }
      setSent(userId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setSending(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-gray-900 sm:rounded-2xl rounded-t-2xl border border-gray-800 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Swords size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100">Challenge a friend</h2>
              <p className="text-xs text-gray-500">
                {GAME_LABEL[gameId]} • Your score: {yourReturnPct >= 0 ? "+" : ""}
                {yourReturnPct.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or @username"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 outline-none text-sm text-gray-100 placeholder-gray-500"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            They&apos;ll get the same scenarios in the same order — pure skill comparison.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[120px]">
          {q.trim().length === 0 && (
            <div className="text-center text-xs text-gray-500 py-8">
              Start typing to find a friend.
            </div>
          )}
          {q.trim().length > 0 && hits.length === 0 && !searching && (
            <div className="text-center text-xs text-gray-500 py-8">No users found.</div>
          )}
          {searching && hits.length === 0 && (
            <div className="text-center text-xs text-gray-500 py-8">Searching…</div>
          )}
          {hits.map((u) => {
            const isSent = sent === u.id
            const isSending = sending === u.id
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/60"
              >
                <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                </div>
                {isSent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 px-2.5 py-1.5">
                    <CheckCircle2 size={14} /> Sent
                  </span>
                ) : (
                  <button
                    disabled={isSending}
                    onClick={() => send(u.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 px-3 py-1.5 rounded-lg"
                  >
                    <Send size={12} /> {isSending ? "…" : "Send"}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {err && (
          <div className="px-5 py-2 text-xs text-rose-400 border-t border-rose-900/40 bg-rose-950/30">
            {err}
          </div>
        )}
      </div>
    </div>
  )
}
