"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Info, Loader2, TrendingUp, TrendingDown, X, ExternalLink } from "lucide-react"
import LanguagePicker, { getStoredLang, setStoredLang } from "./LanguagePicker"
import BullMascot from "@/components/mascots/BullMascot"
import BearMascot from "@/components/mascots/BearMascot"
import { CATEGORY_META, findEntryByEventName, type DictionaryEntry, type DictionaryLang } from "@/lib/dictionary"

interface Props {
  eventName: string
}

export default function DictionaryPopover({ eventName }: Props) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<DictionaryLang>("en")
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Restore lang on mount
  useEffect(() => {
    setLang(getStoredLang())
  }, [])

  // Lazy-load entries when popover first opens
  useEffect(() => {
    if (!open || entries.length > 0) return
    setLoading(true)
    fetch(`/api/dictionary?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, lang, entries.length])

  // Re-fetch on language change
  useEffect(() => {
    if (entries.length === 0) return
    setLoading(true)
    fetch(`/api/dictionary?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return
      if (buttonRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  function changeLang(next: DictionaryLang) {
    setLang(next)
    setStoredLang(next)
  }

  const entry = entries.length > 0 ? findEntryByEventName(eventName, entries) : null

  return (
    <span className="relative inline-block">
      <button
        type="button"
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title="What does this mean?"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] transition-colors hover:bg-emerald-500/20 align-middle ml-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        <Info size={11} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 left-0 top-full mt-1 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wide flex-1" style={{ color: "var(--text-secondary)" }}>
              Dictionary
            </span>
            <LanguagePicker value={lang} onChange={changeLang} size="sm" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <X size={11} />
            </button>
          </div>

          {/* Body */}
          <div className="px-3 py-3 space-y-3 max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-emerald-400" />
              </div>
            ) : !entry ? (
              <div className="py-4 text-center">
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  No dictionary entry yet for &ldquo;{eventName}&rdquo;.
                </p>
                <Link
                  href={`/ai-tutor?q=${encodeURIComponent(`Aria, what is ${eventName} and how does it move markets?`)}`}
                  className="inline-block text-[11px] font-bold text-emerald-400 hover:underline"
                >
                  Ask Aria instead →
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {entry.name}
                    {entry.abbreviation && (
                      <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}>
                        {entry.abbreviation}
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {CATEGORY_META[entry.category].emoji} {CATEGORY_META[entry.category].label} · {entry.frequency}
                  </p>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {entry.definition}
                </p>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                    Why it matters
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {entry.whyItMatters}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <div className="rounded-lg p-2 text-[11px] relative overflow-hidden"
                    style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.35)" }}>
                    <div className="absolute -top-0.5 -right-1 opacity-45 pointer-events-none">
                      <BullMascot size={44} withTrail={false} />
                    </div>
                    <div className="flex items-center gap-1 mb-0.5 relative">
                      <TrendingUp size={9} className="text-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-400">If higher</span>
                    </div>
                    <p className="relative pr-9" style={{ color: "var(--text-primary)" }}>{entry.marketReaction.higher}</p>
                  </div>
                  <div className="rounded-lg p-2 text-[11px] relative overflow-hidden"
                    style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.35)" }}>
                    <div className="absolute -top-0.5 -right-1 opacity-45 pointer-events-none">
                      <BearMascot size={44} withTrail={false} />
                    </div>
                    <div className="flex items-center gap-1 mb-0.5 relative">
                      <TrendingDown size={9} className="text-rose-400" />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-rose-400">If lower</span>
                    </div>
                    <p className="relative pr-9" style={{ color: "var(--text-primary)" }}>{entry.marketReaction.lower}</p>
                  </div>
                </div>

                <Link
                  href={`/dictionary?id=${entry.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline"
                >
                  Open full entry <ExternalLink size={9} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
