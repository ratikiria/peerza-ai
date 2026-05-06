"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, Volume1, VolumeX, Gamepad2, Mic } from "lucide-react"

interface Props {
  // Game sound (SFX + music)
  muted: boolean
  volume: number
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
  // Voice (TTS narration)
  voiceMuted: boolean
  voiceVolume: number
  onToggleVoiceMute: () => void
  onVoiceVolumeChange: (v: number) => void
}

function ChannelRow({
  label,
  icon,
  muted,
  volume,
  onToggleMute,
  onVolumeChange,
}: {
  label: string
  icon: React.ReactNode
  muted: boolean
  volume: number
  onToggleMute: () => void
  onVolumeChange: (v: number) => void
}) {
  const pct = muted ? 0 : Math.round(volume * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 inline-flex items-center gap-1.5">
          {icon} {label}
        </span>
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
            muted
              ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
              : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
          {muted ? "Muted" : "On"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onVolumeChange(Math.max(0, volume - 0.1))}
          disabled={muted}
          className="rounded-md px-1 py-0.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease"
        >
          <Volume1 size={12} />
        </button>
        <div className="flex-1 relative h-2 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-150"
            style={{ width: `${pct}%`, opacity: muted ? 0.3 : 1 }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            disabled={muted}
            className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label={`${label} volume`}
          />
        </div>
        <button
          onClick={() => onVolumeChange(Math.min(1, volume + 0.1))}
          disabled={muted}
          className="rounded-md px-1 py-0.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase"
        >
          <Volume2 size={12} />
        </button>
        <span className="text-[10px] font-mono font-semibold text-gray-300 tabular-nums w-8 text-right">
          {pct}%
        </span>
      </div>
    </div>
  )
}

export default function SoundControl({
  muted, volume, onToggleMute, onVolumeChange,
  voiceMuted, voiceVolume, onToggleVoiceMute, onVoiceVolumeChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  // Combined indicator icon — shows muted only if BOTH channels are off
  const allMuted = muted && voiceMuted
  const avgVol = (muted ? 0 : volume) * 0.5 + (voiceMuted ? 0 : voiceVolume) * 0.5
  const Icon = allMuted ? VolumeX : avgVol < 0.4 ? Volume1 : Volume2

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-xl px-2.5 py-2 transition-colors ${
          open
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-gray-200"
        }`}
        aria-label="Sound settings"
        title="Sound settings"
      >
        <Icon size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-gray-800 border border-gray-700 shadow-xl shadow-black/40 p-3 z-50 animate-[pz-pop_180ms_ease-out] space-y-4">
          <ChannelRow
            label="Game sound"
            icon={<Gamepad2 size={11} />}
            muted={muted}
            volume={volume}
            onToggleMute={onToggleMute}
            onVolumeChange={onVolumeChange}
          />
          <div className="border-t border-gray-700/60" />
          <ChannelRow
            label="Voice"
            icon={<Mic size={11} />}
            muted={voiceMuted}
            volume={voiceVolume}
            onToggleMute={onToggleVoiceMute}
            onVolumeChange={onVoiceVolumeChange}
          />
        </div>
      )}
    </div>
  )
}
