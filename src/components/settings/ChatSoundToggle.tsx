"use client"

import { useEffect, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"

const SOUND_KEY = "peerza-chat-sound-v1"

export default function ChatSoundToggle() {
  const [enabled, setEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(SOUND_KEY)
      setEnabled(v === null ? true : v !== "off")
    } catch {}
    setMounted(true)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off") } catch {}
    if (next) playPreview()
  }

  function playPreview() {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const now = ctx.currentTime
      const tones = [
        { f: 880, t: now,        d: 0.08 },
        { f: 1320, t: now + 0.09, d: 0.12 },
      ]
      for (const { f, t, d } of tones) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = "sine"
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.015)
        g.gain.exponentialRampToValueAtTime(0.0001, t + d)
        o.connect(g).connect(ctx.destination)
        o.start(t)
        o.stop(t + d + 0.02)
      }
      setTimeout(() => ctx.close(), 500)
    } catch {}
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {enabled ? (
          <Volume2 size={16} style={{ color: "#10b981" }} />
        ) : (
          <VolumeX size={16} style={{ color: "var(--text-secondary)" }} />
        )}
        <div className="min-w-0">
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Chat sound</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Play a soft chime when a new message arrives and the dock is closed.
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={!mounted}
        role="switch"
        aria-checked={enabled}
        className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
        style={{
          background: enabled ? "#10b981" : "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            left: enabled ? 20 : 2,
            background: enabled ? "#0f1117" : "var(--text-secondary)",
          }}
        />
      </button>
    </div>
  )
}
