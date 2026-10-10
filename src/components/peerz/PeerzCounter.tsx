"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ink } from "@/lib/ink"
import { compactPeerz, formatPeerz } from "@/lib/peerz"
import PeerzCoin from "@/components/peerz/PeerzCoin"

const POLL_MS = 60_000
const ROLL_MS = 800

interface Toast { id: number; text: string }

// Burst directions for the little coins that pop out of the chip.
const BURST = [[-34, -26], [-12, -38], [14, -36], [36, -22], [-40, 6], [40, 8], [-20, 30], [22, 30]]

/** Navbar Peerz balance: checks in on load, rolls up and bursts when it grows. */
export default function PeerzCounter() {
  const [shown, setShown] = useState<number | null>(null)
  const [burst, setBurst] = useState(0)
  const [toast, setToast] = useState<Toast | null>(null)
  const balanceRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rollTo = useCallback((from: number, to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ROLL_MS)
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const showToast = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  // Apply a fresh balance from the server; celebrate if it went up.
  const apply = useCallback((next: number, message?: string) => {
    const prev = balanceRef.current
    balanceRef.current = next
    if (prev == null || next <= prev) {
      setShown(next)
      return
    }
    rollTo(prev, next)
    setBurst((b) => b + 1)
    showToast(message ?? `+${formatPeerz(next - prev)} Peerz`)
  }, [rollTo, showToast])

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const res = await fetch("/api/peerz/me").catch(() => null)
      if (!res?.ok || cancelled) return
      const data = await res.json()
      apply(data.balance)
    }

    async function boot() {
      const res = await fetch("/api/peerz/checkin", { method: "POST" }).catch(() => null)
      if (res?.ok && !cancelled) {
        const data = await res.json()
        if (data.awarded > 0) {
          // Start from the pre-check-in balance so the reward visibly lands.
          balanceRef.current = data.balance - data.awarded
          setShown(balanceRef.current)
          apply(data.balance, `+${data.awarded} Peerz · day ${data.streak} check-in`)
        } else {
          apply(data.balance)
        }
      }
      await refresh() // also hands out a Genesis number on first visit
    }

    boot()
    const iv = setInterval(refresh, POLL_MS)
    const onFocus = () => { refresh() }
    window.addEventListener("focus", onFocus)
    // The store fires this after a redemption so the chip updates at once.
    window.addEventListener("peerz:refresh", onFocus)
    return () => {
      cancelled = true
      clearInterval(iv)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("peerz:refresh", onFocus)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [apply])

  if (shown == null) return null

  return (
    <>
      <Link
        href="/peerz"
        title={`${formatPeerz(shown)} Peerz`}
        aria-label={`Peerz balance: ${formatPeerz(shown)}. Open wallet`}
        key={burst}
        className={`relative flex-shrink-0 h-9 flex items-center gap-1.5 pl-1.5 pr-2.5 rounded-full transition-colors hover:brightness-110 ${burst ? "pz-peerz-bump" : ""}`}
        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)" }}
      >
        <PeerzCoin size={20} />
        <span className="font-mono font-bold text-[13px] tabular-nums" style={{ color: ink("#fde68a") }}>
          <span className="sm:hidden">{compactPeerz(shown)}</span>
          <span className="hidden sm:inline">{formatPeerz(shown)}</span>
        </span>
        {burst > 0 && BURST.map(([x, y], i) => (
          <span
            key={i}
            className="pz-coin-burst"
            style={{ ["--bx" as string]: `${x}px`, ["--by" as string]: `${y}px`, animationDelay: `${i * 30}ms` }}
          >
            <PeerzCoin size={12} />
          </span>
        ))}
      </Link>

      <div aria-live="polite" className="fixed right-4 z-[70] pointer-events-none" style={{ top: "calc(var(--nav-h) + 12px)" }}>
        {toast && (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-semibold pz-peerz-toast"
            style={{ background: "var(--bg-card)", border: "1px solid rgba(251,191,36,0.45)", color: "var(--text-primary)" }}
          >
            <PeerzCoin size={22} />
            {toast.text}
          </div>
        )}
      </div>
    </>
  )
}
