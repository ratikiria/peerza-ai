"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface GameResultPayload {
  gameId: "guess-direction" | "build-portfolio" | "read-tape"
  startingBalance: number
  finalBalance: number
  pnl: number
  returnPct: number
  roundsPlayed: number
  winRate: number // 0..1
  durationSec: number
  scenarios: string[]
  // Duel context — when set, server attaches this run as the challengee's score
  duelId?: string | null
  seed?: string | null
}

interface SaveResponse {
  id: string
  isPersonalBest: boolean
  duel?: {
    id: string
    challengerPct: number
    challengeePct: number
    youWon: boolean
    tied: boolean
  } | null
}

/**
 * Saves a single game result once when `ready` becomes true.
 * Calling reset() lets the same instance save again (used after Play again).
 */
export function useGameSave(ready: boolean, payload: GameResultPayload) {
  const [saved, setSaved] = useState<SaveResponse | null>(null)
  const sentRef = useRef(false)
  const payloadRef = useRef(payload)
  payloadRef.current = payload

  useEffect(() => {
    if (!ready || sentRef.current) return
    sentRef.current = true
    let cancelled = false
    fetch("/api/games/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadRef.current),
    })
      .then((r) => (r.ok ? (r.json() as Promise<SaveResponse>) : null))
      .then((d) => {
        if (!cancelled && d) setSaved(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ready])

  const reset = useCallback(() => {
    sentRef.current = false
    setSaved(null)
  }, [])

  return { saved, reset }
}
