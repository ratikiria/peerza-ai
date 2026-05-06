"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, BookOpen, Loader2 } from "lucide-react"
import LanguagePicker, { getStoredLang, setStoredLang } from "./LanguagePicker"
import DictionaryEntryCard from "./DictionaryEntryCard"
import { CATEGORY_META, type DictionaryCategory, type DictionaryEntry, type DictionaryLang } from "@/lib/dictionary"

const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" }

export default function DictionaryClient() {
  const [lang, setLang] = useState<DictionaryLang>("en")
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<DictionaryCategory | "all">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Restore language preference on mount
  useEffect(() => {
    setLang(getStoredLang())
  }, [])

  function changeLang(next: DictionaryLang) {
    setLang(next)
    setStoredLang(next)
  }

  // Load entries when language changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/dictionary?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setEntries(data.entries ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lang])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (activeCategory !== "all" && e.category !== activeCategory) return false
      if (q) {
        const hay = `${e.name} ${e.abbreviation ?? ""} ${e.definition}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [entries, search, activeCategory])

  // Counts per category for the filter pills
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) map.set(e.category, (map.get(e.category) ?? 0) + 1)
    return map
  }, [entries])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-2"
              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.4)" }}>
              <BookOpen size={11} />
              Dictionary
            </div>
            <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Economic indicators, explained</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {entries.length} indicators · what they measure, why traders care, how markets typically react.
            </p>
          </div>
          <LanguagePicker value={lang} onChange={changeLang} />
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators (e.g. NFP, CPI, FOMC)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      </section>

      {/* Category pills */}
      <section className="flex gap-2 flex-wrap">
        <CategoryPill
          label="All"
          emoji="📚"
          count={entries.length}
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          color="#10b981"
        />
        {(Object.keys(CATEGORY_META) as DictionaryCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat]
          const count = categoryCounts.get(cat) ?? 0
          if (count === 0) return null
          return (
            <CategoryPill
              key={cat}
              label={meta.label}
              emoji={meta.emoji}
              count={count}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              color={meta.color}
            />
          )
        })}
      </section>

      {/* Entry list */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-emerald-400" />
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl py-12 text-center text-sm" style={{ ...cardStyle, color: "var(--text-secondary)" }}>
          No entries match your filters.
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <div key={entry.id} className={isExpanded ? "md:col-span-2" : ""}>
                <DictionaryEntryCard
                  entry={entry}
                  expanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : entry.id)}
                  showCloseChip={isExpanded}
                />
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

function CategoryPill({
  label, emoji, count, active, onClick, color,
}: {
  label: string
  emoji: string
  count: number
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
      style={
        active
          ? { background: `${color}22`, border: `1px solid ${color}66`, color }
          : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
      }
    >
      <span>{emoji}</span> {label}
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{ background: active ? `${color}33` : "var(--bg-base)" }}>
        {count}
      </span>
    </button>
  )
}
