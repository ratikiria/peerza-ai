"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Game sound = SFX + background music (controlled together as a single channel
// since they're both ambient bed). Voice = TTS narration (separate channel so
// players can mute the voice without losing music vibe, or vice versa).
const MUTE_KEY = "peerio:games:muted"
const VOLUME_KEY = "peerio:games:volume"
const VOICE_MUTE_KEY = "peerio:games:voice-muted"
const VOICE_VOLUME_KEY = "peerio:games:voice-volume"
const DEFAULT_VOLUME = 0.7
const DEFAULT_VOICE_VOLUME = 0.85

export function useGameSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voiceVolume, setVoiceVolumeState] = useState(DEFAULT_VOICE_VOLUME)
  const volumeRef = useRef(DEFAULT_VOLUME)
  volumeRef.current = volume

  useEffect(() => {
    try {
      if (localStorage.getItem(MUTE_KEY) === "1") setMuted(true)
      const v = localStorage.getItem(VOLUME_KEY)
      if (v !== null) {
        const parsed = parseFloat(v)
        if (!isNaN(parsed)) setVolumeState(Math.max(0, Math.min(1, parsed)))
      }
      if (localStorage.getItem(VOICE_MUTE_KEY) === "1") setVoiceMuted(true)
      const vv = localStorage.getItem(VOICE_VOLUME_KEY)
      if (vv !== null) {
        const parsed = parseFloat(vv)
        if (!isNaN(parsed)) setVoiceVolumeState(Math.max(0, Math.min(1, parsed)))
      }
    } catch {}
  }, [])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped))
    } catch {}
  }, [])

  const setVoiceVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVoiceVolumeState(clamped)
    try {
      localStorage.setItem(VOICE_VOLUME_KEY, String(clamped))
    } catch {}
  }, [])

  function ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!ctxRef.current) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new Ctor()
      } catch {
        return null
      }
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {})
    return ctxRef.current
  }

  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      baseVolume = 0.15,
      delay = 0
    ) => {
      if (muted) return
      const userVol = volumeRef.current
      if (userVol <= 0) return
      const ctx = ensureCtx()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      const start = ctx.currentTime + delay
      const peak = baseVolume * userVol
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(peak, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      osc.start(start)
      osc.stop(start + duration + 0.05)
    },
    [muted]
  )

  const click = useCallback(() => playTone(720, 0.05, "square", 0.07), [playTone])

  const correct = useCallback(() => {
    // C major arpeggio: C5 E5 G5 C6
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.18, "triangle", 0.12, i * 0.07))
  }, [playTone])

  const wrong = useCallback(() => {
    playTone(220, 0.18, "sawtooth", 0.1)
    playTone(165, 0.28, "sawtooth", 0.08, 0.12)
  }, [playTone])

  const tick = useCallback(() => playTone(1000, 0.04, "square", 0.04), [playTone])

  const streak = useCallback(() => {
    // Sparkly upward sweep
    ;[880, 1100, 1320, 1760].forEach((f, i) => playTone(f, 0.12, "triangle", 0.1, i * 0.05))
  }, [playTone])

  const win = useCallback(() => {
    // Triumphant ascending fanfare
    ;[523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      playTone(f, 0.28, "triangle", 0.14, i * 0.13)
    )
  }, [playTone])

  const lose = useCallback(() => {
    ;[400, 340, 280, 220].forEach((f, i) => playTone(f, 0.3, "triangle", 0.12, i * 0.18))
  }, [playTone])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])

  const toggleVoiceMute = useCallback(() => {
    setVoiceMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(VOICE_MUTE_KEY, next ? "1" : "0")
      } catch {}
      // Stop any speech currently playing when muting
      if (next && typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel() } catch {}
      }
      return next
    })
  }, [])

  return {
    click,
    correct,
    wrong,
    tick,
    streak,
    win,
    lose,
    // Game sound (SFX + music)
    muted,
    toggleMute,
    volume,
    setVolume,
    // Voice (TTS narration)
    voiceMuted,
    toggleVoiceMute,
    voiceVolume,
    setVoiceVolume,
  }
}
