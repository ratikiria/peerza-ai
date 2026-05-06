"use client"

import { Globe, ChevronDown, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import FlagImage from "@/components/calendar/FlagImage"
import { DICTIONARY_LANGUAGES, type DictionaryLang } from "@/lib/dictionary"

const STORAGE_KEY = "peerza-dict-lang-v1"

export function getStoredLang(): DictionaryLang {
  if (typeof window === "undefined") return "en"
  const stored = window.localStorage.getItem(STORAGE_KEY) as DictionaryLang | null
  return DICTIONARY_LANGUAGES.find((l) => l.code === stored) ? (stored as DictionaryLang) : "en"
}

export function setStoredLang(lang: DictionaryLang) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, lang)
}

interface Props {
  value: DictionaryLang
  onChange: (lang: DictionaryLang) => void
  size?: "sm" | "md"
}

export default function LanguagePicker({ value, onChange, size = "md" }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const current = DICTIONARY_LANGUAGES.find((l) => l.code === value) ?? DICTIONARY_LANGUAGES[0]
  const small = size === "sm"

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-xl font-semibold transition-colors hover:opacity-90 ${small ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"}`}
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        <Globe size={small ? 12 : 14} className="text-emerald-400" />
        <FlagImage code={current.flag} size={small ? 11 : 13} />
        <span>{current.native}</span>
        <ChevronDown size={small ? 11 : 13} style={{ color: "var(--text-secondary)" }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 rounded-xl shadow-2xl z-50 py-1 min-w-[180px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {DICTIONARY_LANGUAGES.map((lang) => {
            const active = lang.code === value
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => { onChange(lang.code); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-base)]"
                style={{ color: active ? "#10b981" : "var(--text-primary)" }}
              >
                <FlagImage code={lang.flag} size={13} />
                <span className="flex-1 text-left">{lang.native}</span>
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{lang.label}</span>
                {active && <Check size={13} className="text-emerald-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
