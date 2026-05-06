"use client"

import { useEffect, useMemo, useState } from "react"
import { newSeed } from "./seededRng"

export interface DuelContext {
  // Stable seed for this play session — read from ?seed= or generated client-side
  seed: string
  // If non-null, this play is fulfilling a duel sent by another user
  duelId: string | null
}

// Reads seed/duelId from the URL on mount and keeps them stable for the
// lifetime of the game session. Generates a fresh seed if none was provided
// so the challenger's run is reproducible if they later send a challenge.
export function useDuelContext(): DuelContext {
  const [ctx, setCtx] = useState<DuelContext | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const seedParam = params.get("seed")
    const duelParam = params.get("duel")
    setCtx({
      seed: seedParam || newSeed(),
      duelId: duelParam || null,
    })
  }, [])

  return useMemo(
    () => ctx ?? { seed: "", duelId: null },
    [ctx]
  )
}
