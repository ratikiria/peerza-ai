"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface WaveformPlayerProps {
  src: string
  bars?: number
  variant?: "me" | "them" | "preview"
  className?: string
}

const BAR_COUNT_DEFAULT = 40

export default function WaveformPlayer({
  src,
  bars = BAR_COUNT_DEFAULT,
  variant = "them",
  className,
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [peaks, setPeaks] = useState<number[]>(() => Array(bars).fill(0.15))
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function decode() {
      try {
        const res = await fetch(src)
        const buf = await res.arrayBuffer()
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new Ctx()
        const audio = await ctx.decodeAudioData(buf.slice(0))
        const channel = audio.getChannelData(0)
        const blockSize = Math.max(1, Math.floor(channel.length / bars))
        const out: number[] = []
        let max = 0
        for (let i = 0; i < bars; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            const v = channel[i * blockSize + j] || 0
            sum += v * v
          }
          const rms = Math.sqrt(sum / blockSize)
          out.push(rms)
          if (rms > max) max = rms
        }
        const normalized = out.map((v) => (max > 0 ? Math.max(0.08, v / max) : 0.15))
        if (!cancelled) {
          setPeaks(normalized)
          setDuration(audio.duration)
        }
        ctx.close()
      } catch {
        // keep flat fallback
      }
    }
    decode()
    return () => {
      cancelled = true
    }
  }, [src, bars])

  function toggle() {
    const a = audioRef.current
    if (!a || !src || errored) return
    if (a.paused) {
      a.volume = 1
      a.muted = false
      const p = a.play()
      if (p && typeof p.then === "function") {
        p.then(() => setPlaying(true)).catch((err) => {
          console.warn("[WaveformPlayer] play() failed:", err)
          setPlaying(false)
          setErrored(true)
        })
      } else {
        setPlaying(true)
      }
    } else {
      a.pause()
      setPlaying(false)
    }
  }

  function onTime() {
    const a = audioRef.current
    if (!a) return
    setProgress(a.duration ? a.currentTime / a.duration : 0)
  }

  function onLoaded() {
    const a = audioRef.current
    if (a && isFinite(a.duration)) setDuration(a.duration)
  }

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const r = Math.floor(s % 60)
    return `${m}:${String(r).padStart(2, "0")}`
  }

  const playedColor = variant === "me" ? "bg-gray-950" : "bg-emerald-400"
  const unplayedColor = variant === "me" ? "bg-gray-950/30" : "bg-gray-500"
  const btnColor =
    variant === "me"
      ? "text-gray-950 hover:bg-gray-950/10"
      : "text-emerald-400 hover:bg-emerald-400/10"
  const timeColor = variant === "me" ? "text-gray-950/70" : "text-gray-400"

  if (errored) {
    return (
      <div className={cn("flex items-center gap-2 min-w-[200px]", className)}>
        <span className={cn("text-xs italic", timeColor)}>Audio unavailable</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-[200px]", className)}>
      <button
        onClick={toggle}
        className={cn("rounded-full p-1.5 transition-colors", btnColor)}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="flex items-center gap-[2px] flex-1 h-8">
        {peaks.map((p, i) => {
          const played = i / peaks.length < progress
          return (
            <span
              key={i}
              className={cn("w-[3px] rounded-full transition-colors", played ? playedColor : unplayedColor)}
              style={{ height: `${Math.max(10, p * 100)}%` }}
            />
          )
        })}
      </div>
      <span className={cn("text-[11px] font-mono tabular-nums", timeColor)}>
        {playing && progress > 0 ? fmt(duration * progress) : fmt(duration)}
      </span>
      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          onTimeUpdate={onTime}
          onLoadedMetadata={onLoaded}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
          }}
          onError={(e) => {
            const err = (e.currentTarget as HTMLAudioElement).error
            console.warn("[WaveformPlayer] <audio> error:", err?.code, err?.message)
            setPlaying(false)
            setErrored(true)
          }}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />
      ) : null}
    </div>
  )
}
