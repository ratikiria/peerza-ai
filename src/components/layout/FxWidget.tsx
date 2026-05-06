"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { Coins, Pencil, Check, X, Plus, GripVertical, Search } from "lucide-react"
import {
  CURRENCIES,
  CURRENCY_BY_CODE,
  flagEmoji,
  defaultLocaleCurrency,
} from "@/lib/currencies"
import WidgetHelp from "@/components/ui/WidgetHelp"

const BASE_KEY = "peerza-fx-base-v1"
const LIST_KEY = "peerza-fx-list-v1"
const MAX_TRACKED = 10

const DEFAULT_OTHERS = ["USD", "GBP", "EUR"]

function loadBase(): string {
  try {
    const v = localStorage.getItem(BASE_KEY)
    if (v && CURRENCY_BY_CODE[v]) return v
  } catch {}
  return defaultLocaleCurrency()
}

function loadList(base: string): string[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      return parsed.filter((c) => CURRENCY_BY_CODE[c] && c !== base).slice(0, MAX_TRACKED)
    }
  } catch {}
  return DEFAULT_OTHERS.filter((c) => c !== base)
}

function fmtRate(r: number): string {
  if (r >= 100)  return r.toLocaleString("en-US", { maximumFractionDigits: 1 })
  if (r >= 1)    return r.toFixed(4)
  if (r >= 0.01) return r.toFixed(4)
  return r.toFixed(6)
}

export default function FxWidget() {
  const t = useTranslations("Widgets")
  const [base, setBaseRaw] = useState<string>("USD")
  const [list, setListRaw] = useState<string[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Edit-mode local state
  const [query, setQuery] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Hydrate from localStorage
  useEffect(() => {
    const b = loadBase()
    setBaseRaw(b)
    setListRaw(loadList(b))
  }, [])

  function setBase(next: string) {
    setBaseRaw(next)
    try { localStorage.setItem(BASE_KEY, next) } catch {}
    // Strip the new base from the tracked list if present
    setList(list.filter((c) => c !== next))
  }
  function setList(next: string[]) {
    setListRaw(next)
    try { localStorage.setItem(LIST_KEY, JSON.stringify(next)) } catch {}
  }

  const fetchRates = useCallback(async (b: string, l: string[]) => {
    if (l.length === 0) {
      setRates({}); setLoading(false); setUpdatedAt(new Date().toISOString())
      return
    }
    try {
      const res = await fetch(`/api/market/fx?base=${b}&symbols=${l.join(",")}`)
      if (res.ok) {
        const data = await res.json() as { rates?: Record<string, number>; date?: string }
        setRates(data.rates ?? {})
        setUpdatedAt(data.date ?? new Date().toISOString())
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!base) return
    setLoading(true)
    fetchRates(base, list)
    const iv = setInterval(() => fetchRates(base, list), 5 * 60 * 1000) // 5 min
    return () => clearInterval(iv)
  }, [base, list, fetchRates])

  function add(code: string) {
    if (list.includes(code) || code === base || list.length >= MAX_TRACKED) return
    setList([...list, code])
  }
  function remove(code: string) {
    setList(list.filter((c) => c !== code))
  }

  function onDragStart(id: string) { setDragId(id) }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }
  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const next = [...list]
    const from = next.indexOf(dragId)
    const to = next.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); setDragOverId(null); return }
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    setList(next)
    setDragId(null); setDragOverId(null)
  }
  function onDragEnd() { setDragId(null); setDragOverId(null) }

  // Search results = catalog filtered by query, excluding base + already-tracked
  const searchResults = query.trim().length > 0
    ? CURRENCIES.filter((c) =>
        c.code !== base &&
        !list.includes(c.code) &&
        (c.code.toLowerCase().includes(query.trim().toLowerCase()) ||
         c.name.toLowerCase().includes(query.trim().toLowerCase()))
      ).slice(0, 8)
    : []

  const baseMeta = CURRENCY_BY_CODE[base]

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
          <Coins size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t("currencies_label")}</span>
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
        <WidgetHelp
          label={t("currencies_label")}
          text={t("currencies_text")}
        />
        <button
          onClick={() => setEditing((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-base)]"
          style={{ color: editing ? "#10b981" : "var(--text-secondary)" }}
          title={editing ? "Done" : "Customize currencies"}
        >
          {editing ? <Check size={13} /> : <Pencil size={13} />}
        </button>
        </div>
      </div>

      {/* Base currency display / selector */}
      {baseMeta && (
        <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <span className="text-lg" aria-hidden>{flagEmoji(baseMeta.country)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#10b981" }}>Base</p>
            <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {baseMeta.code} · {baseMeta.name}
            </p>
          </div>
          {editing && (
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-lg outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Tracked currencies list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: list.length || 3 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-base)" }} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: "var(--text-secondary)" }}>
          {editing ? "Search below to add a currency" : "No currencies — tap the pencil to add"}
        </p>
      ) : (
        <div className="space-y-1">
          {list.map((code) => {
            const meta = CURRENCY_BY_CODE[code]
            if (!meta) return null
            const rate = rates[code]
            const isDragging = dragId === code
            const isDragOver = dragOverId === code && dragId !== code
            return (
              <div
                key={code}
                draggable={editing}
                onDragStart={() => onDragStart(code)}
                onDragOver={(e) => onDragOver(e, code)}
                onDrop={(e) => onDrop(e, code)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
                style={{
                  background: isDragOver ? "rgba(16,185,129,0.12)" : "transparent",
                  border: `1px solid ${isDragOver ? "rgba(16,185,129,0.4)" : "transparent"}`,
                  opacity: isDragging ? 0.4 : 1,
                  cursor: editing ? (isDragging ? "grabbing" : "grab") : "default",
                }}
              >
                {editing && (
                  <GripVertical size={12} style={{ color: "var(--text-secondary)", opacity: 0.6, flexShrink: 0 }} />
                )}
                <span className="text-base flex-shrink-0" aria-hidden>{flagEmoji(meta.country)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                    {meta.code}
                  </p>
                  <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {meta.name}
                  </p>
                </div>
                {!editing && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {rate ? fmtRate(rate) : "—"}
                    </p>
                    <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                      per 1 {base}
                    </p>
                  </div>
                )}
                {editing && (
                  <button onClick={() => remove(code)}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 flex-shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                    title={`Remove ${meta.code}`}
                    aria-label={`Remove ${meta.code}`}>
                    <X size={11} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Search-to-add (edit mode only) */}
      {editing && (
        <div className="mt-3 space-y-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={list.length >= MAX_TRACKED ? `Max ${MAX_TRACKED} currencies` : "Search EUR, Yen, Lira…"}
              disabled={list.length >= MAX_TRACKED}
              className="w-full text-xs pl-7 pr-3 py-2 rounded-xl outline-none disabled:opacity-50"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((c) => (
                <button key={c.code} onClick={() => { add(c.code); setQuery("") }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors hover:bg-[var(--bg-base)]"
                  style={{ background: "transparent" }}>
                  <span className="text-base flex-shrink-0" aria-hidden>{flagEmoji(c.country)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                      {c.code}
                    </p>
                    <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {c.name}
                    </p>
                  </div>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                    <Plus size={11} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!editing && updatedAt && (
        <p className="text-[10px] mt-3" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
          Updated {updatedAt.length > 10 ? new Date(updatedAt).toLocaleDateString() : updatedAt} · ECB rates
        </p>
      )}
    </div>
  )
}
