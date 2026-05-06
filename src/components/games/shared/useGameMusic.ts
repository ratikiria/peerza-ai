"use client"

import { useEffect, useRef } from "react"

const BPM = 112
const SECS_PER_16TH = 60 / BPM / 4
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD = 0.12

// C minor — bass and lead pools (Hz)
const BASS_NOTES = [65.41, 77.78, 87.31, 98.0] // C2, Eb2, F2, G2
const LEAD_NOTES = [523.25, 622.25, 783.99, 932.33] // C5, Eb5, G5, Bb5

interface Options {
  active: boolean
  muted: boolean
  intensity?: number
  volume?: number
}

const BASE_GAIN = 0.18

export function useGameMusic({ active, muted, intensity = 0.4, volume = 1 }: Options) {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const stepRef = useRef(0)
  const nextTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intensityRef = useRef(intensity)
  const runningRef = useRef(false)

  intensityRef.current = intensity

  function ensureCtx(): { ctx: AudioContext; master: GainNode } | null {
    if (typeof window === "undefined") return null
    if (!ctxRef.current) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new Ctor()
        const master = ctx.createGain()
        master.gain.value = 0.0001
        master.connect(ctx.destination)
        ctxRef.current = ctx
        masterRef.current = master
      } catch {
        return null
      }
    }
    if (ctxRef.current!.state === "suspended") ctxRef.current!.resume().catch(() => {})
    return { ctx: ctxRef.current!, master: masterRef.current! }
  }

  function kick(time: number, master: GainNode, ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(140, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.14)
    gain.gain.setValueAtTime(0.6, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
    osc.connect(gain).connect(master)
    osc.start(time)
    osc.stop(time + 0.22)
  }

  function hat(time: number, master: GainNode, ctx: AudioContext) {
    const len = 0.04
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(len * ctx.sampleRate)), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 7000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.08, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + len)
    src.connect(hp).connect(gain).connect(master)
    src.start(time)
    src.stop(time + len + 0.01)
  }

  function bass(time: number, freq: number, master: GainNode, ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    lp.type = "lowpass"
    lp.frequency.value = 700
    lp.Q.value = 2
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.18, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28)
    osc.connect(lp).connect(gain).connect(master)
    osc.start(time)
    osc.stop(time + 0.3)
  }

  function lead(time: number, freq: number, master: GainNode, ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "triangle"
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.07, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
    osc.connect(gain).connect(master)
    osc.start(time)
    osc.stop(time + 0.42)
  }

  function pad(time: number, freq: number, master: GainNode, ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    osc.type = "sine"
    osc.frequency.value = freq
    lp.type = "lowpass"
    lp.frequency.value = 1200
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(0.04, time + 0.4)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.6)
    osc.connect(lp).connect(gain).connect(master)
    osc.start(time)
    osc.stop(time + 1.7)
  }

  function scheduler() {
    if (!runningRef.current) return
    if (!ctxRef.current || !masterRef.current) return
    const ctx = ctxRef.current
    const master = masterRef.current

    while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
      const step = stepRef.current
      const t = nextTimeRef.current
      const I = intensityRef.current

      const bar = Math.floor(step / 16) % 4
      const chord = BASS_NOTES[bar]
      const sub = step % 16

      // Kick on every beat
      if (sub % 4 === 0) kick(t, master, ctx)

      // Snare-ish hat on 2 and 4
      if (sub === 4 || sub === 12) hat(t, master, ctx)

      // Off-beat hats, density rises with intensity
      if (sub % 2 === 1 && Math.random() < 0.25 + I * 0.6) hat(t, master, ctx)

      // Bass on beats 1 and 3
      if (sub === 0 || sub === 8) bass(t, chord, master, ctx)

      // Pad once per bar
      if (sub === 0) pad(t, chord * 4, master, ctx)

      // Lead arp peppered in second half, scaled by intensity
      if (sub >= 8 && sub % 2 === 0 && Math.random() < 0.25 + I * 0.55) {
        const noteIdx = Math.floor(Math.random() * LEAD_NOTES.length)
        lead(t, LEAD_NOTES[noteIdx], master, ctx)
      }

      nextTimeRef.current += SECS_PER_16TH
      stepRef.current = (step + 1) % 64
    }
    timerRef.current = setTimeout(scheduler, LOOKAHEAD_MS)
  }

  useEffect(() => {
    const shouldRun = active && !muted && volume > 0
    if (shouldRun) {
      const r = ensureCtx()
      if (!r) return
      const target = BASE_GAIN * volume
      if (!runningRef.current) {
        runningRef.current = true
        stepRef.current = 0
        nextTimeRef.current = r.ctx.currentTime + 0.1
        r.master.gain.cancelScheduledValues(r.ctx.currentTime)
        r.master.gain.setValueAtTime(0.0001, r.ctx.currentTime)
        r.master.gain.linearRampToValueAtTime(target, r.ctx.currentTime + 0.6)
        scheduler()
      } else {
        // Already playing — smoothly retarget gain to new volume
        try {
          const now = r.ctx.currentTime
          r.master.gain.cancelScheduledValues(now)
          r.master.gain.setValueAtTime(r.master.gain.value, now)
          r.master.gain.linearRampToValueAtTime(target, now + 0.15)
        } catch {}
      }
    } else {
      runningRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (masterRef.current && ctxRef.current) {
        try {
          const now = ctxRef.current.currentTime
          masterRef.current.gain.cancelScheduledValues(now)
          masterRef.current.gain.setValueAtTime(masterRef.current.gain.value, now)
          masterRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.4)
        } catch {}
      }
    }
    return () => {
      // Don't tear down on volume change — only on full unmount (handled below)
    }
  }, [active, muted, volume])

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (ctxRef.current) ctxRef.current.close().catch(() => {})
    }
  }, [])
}
