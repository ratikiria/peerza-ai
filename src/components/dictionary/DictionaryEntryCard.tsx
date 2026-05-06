"use client"

import { useState } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Volume2, Sparkles, Loader2, Calendar } from "lucide-react"
import FlagImage from "@/components/calendar/FlagImage"
import BullMascot from "@/components/mascots/BullMascot"
import BearMascot from "@/components/mascots/BearMascot"
import { CATEGORY_META, type DictionaryEntry } from "@/lib/dictionary"

interface Props {
  entry: DictionaryEntry
  expanded?: boolean
  onToggle?: () => void
  showCloseChip?: boolean
}

const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" }

export default function DictionaryEntryCard({ entry, expanded = false, onToggle, showCloseChip }: Props) {
  const cat = CATEGORY_META[entry.category]
  const [speaking, setSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  async function readAloud() {
    if (speaking) return
    setVoiceError("")
    // Concatenate the readable text into one TTS call.
    const text = [
      `${entry.name}. ${entry.abbreviation ? entry.abbreviation + ". " : ""}`,
      `${entry.frequency}.`,
      entry.definition,
      `Why it matters: ${entry.whyItMatters}`,
      `If higher than forecast: ${entry.marketReaction.higher}`,
      `If lower than forecast: ${entry.marketReaction.lower}`,
    ].join(" ")
    setSpeaking(true)
    try {
      const res = await fetch("/api/ai-tutor/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1900) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setVoiceError(data.error ?? `Voice failed (${res.status})`)
        setSpeaking(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(url)
      const audio = new Audio(url)
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => { setVoiceError("Audio playback failed"); setSpeaking(false) }
      audio.play().catch(() => { setVoiceError("Browser blocked autoplay"); setSpeaking(false) })
    } catch (e: any) {
      setVoiceError(e?.message ?? "Voice failed")
      setSpeaking(false)
    }
  }

  const ariaQuestion = encodeURIComponent(
    `Aria, can you explain ${entry.name} in more detail with a concrete example? What's a recent print and how did markets react?`,
  )

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="text-left w-full rounded-2xl p-4 transition-colors hover:opacity-90"
        style={cardStyle}
      >
        <div className="flex items-start gap-3">
          {entry.country !== "GLOBAL" ? (
            <FlagImage code={entry.country} size={18} />
          ) : (
            <span className="text-base mt-0.5">🌐</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{entry.name}</h3>
              {entry.abbreviation && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}>
                  {entry.abbreviation}
                </span>
              )}
            </div>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
              {entry.definition}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}55` }}>
                {cat.emoji} {cat.label}
              </span>
              <span className="text-[10px] inline-flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                <Calendar size={9} />
                {entry.frequency}
              </span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {entry.country !== "GLOBAL" ? (
          <FlagImage code={entry.country} size={22} />
        ) : (
          <span className="text-xl mt-0.5">🌐</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{entry.name}</h2>
            {entry.abbreviation && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
                {entry.abbreviation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}55` }}>
              {cat.emoji} {cat.label}
            </span>
            <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <Calendar size={10} />
              {entry.frequency}
            </span>
          </div>
        </div>
        {showCloseChip && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Close
          </button>
        )}
      </div>

      {/* Definition */}
      <Section label="Definition">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{entry.definition}</p>
      </Section>

      {/* Why it matters */}
      <Section label="Why it matters">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{entry.whyItMatters}</p>
      </Section>

      {/* Market reaction — with bull/bear mascots */}
      <Section label="Market reaction">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.35)" }}>
            <div className="absolute -top-1 -right-2 opacity-50 pointer-events-none">
              <BullMascot size={72} withGlow />
            </div>
            <div className="flex items-center gap-1.5 mb-1 relative">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Higher than forecast</span>
            </div>
            <p className="text-[12px] leading-relaxed relative pr-12" style={{ color: "var(--text-primary)" }}>
              {entry.marketReaction.higher}
            </p>
          </div>
          <div className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.35)" }}>
            <div className="absolute -top-1 -right-2 opacity-50 pointer-events-none">
              <BearMascot size={72} withGlow />
            </div>
            <div className="flex items-center gap-1.5 mb-1 relative">
              <TrendingDown size={11} className="text-rose-400" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-rose-400">Lower than forecast</span>
            </div>
            <p className="text-[12px] leading-relaxed relative pr-12" style={{ color: "var(--text-primary)" }}>
              {entry.marketReaction.lower}
            </p>
          </div>
        </div>
      </Section>

      {/* Watched assets */}
      {entry.watchedAssets.length > 0 && (
        <Section label="Watch these instruments">
          <div className="flex flex-wrap gap-1.5">
            {entry.watchedAssets.map((sym) => (
              <span
                key={sym}
                className="text-[11px] font-mono font-bold px-2 py-1 rounded"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {sym}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Action row */}
      <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={readAloud}
            disabled={speaking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}
          >
            {speaking ? <Loader2 size={11} className="animate-spin" /> : <Volume2 size={11} />}
            Read aloud
          </button>
          <Link
            href={`/ai-tutor?q=${ariaQuestion}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }}
          >
            <Sparkles size={11} />
            Ask Aria for more
          </Link>
        </div>
        {voiceError && (
          <p className="text-[11px] px-2 py-1.5 rounded-lg"
            style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.35)", color: "#fb7185" }}>
            🔇 {voiceError}
          </p>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
        {label}
      </p>
      {children}
    </div>
  )
}
