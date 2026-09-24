"use client"

import { useSyncExternalStore } from "react"

// One shared ticking clock for countdowns. The server snapshot is 0 so
// server-rendered markup never bakes in a stale time; the client re-renders
// with the real time right after hydration.
const TICK_MS = 30_000
let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => { now = Date.now(); listeners.forEach((l) => l()) }, TICK_MS)
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && timer) { clearInterval(timer); timer = null }
  }
}

/** Current time in ms, refreshed every 30s. Returns 0 during server render. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0)
}
