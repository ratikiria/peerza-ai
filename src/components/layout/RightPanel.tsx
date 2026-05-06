"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { TrendingUp, TrendingDown, User, Zap, Pencil, X, Plus, Check, Search, Loader2, GripVertical, Flame, ArrowUp, ArrowDown, Minus, Star, LayoutGrid, RotateCcw, EyeOff } from "lucide-react"
import FollowButton from "@/components/users/FollowButton"
import MarketHoursWidget from "@/components/market/MarketHoursWidget"
import FxWidget from "@/components/layout/FxWidget"
import WidgetHelp from "@/components/ui/WidgetHelp"
import SidebarAdCard from "@/components/ads/SidebarAdCard"
import type { AdCardData } from "@/components/ads/AdCard"
import { yahooToStooq } from "@/lib/market"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Price {
  id?: string
  symbol: string; name: string; price: number; change: number; up: boolean
  currency?: string; usdPrice?: number
}
interface Mover {
  symbol: string; name: string; change: number; up: boolean
}
interface SuggestedUser {
  id: string; name: string; username: string; image?: string | null
  isPremium: boolean; isFollowing: boolean
}

// ─── Watchlist types & defaults ───────────────────────────────────────────────

interface WatchlistAsset {
  id: string           // unique key
  symbol: string       // display symbol
  name: string         // display name
  source: "crypto" | "stock"
  cgId?: string        // CoinGecko ID for crypto
  stooqSymbol?: string // Stooq symbol for stocks/indices/commodities
}

const DEFAULT_WATCHLIST: WatchlistAsset[] = [
  { id: "bitcoin",  symbol: "BTC",    name: "Bitcoin",   source: "crypto", cgId: "bitcoin"   },
  { id: "xauusd",   symbol: "GOLD",   name: "Gold",      source: "stock",  stooqSymbol: "xauusd" },
  { id: "nvda.us",  symbol: "NVDA",   name: "NVIDIA",    source: "stock",  stooqSymbol: "nvda.us" },
  { id: "dx.f",     symbol: "DXY",    name: "US Dollar", source: "stock",  stooqSymbol: "dx.f"   },
  { id: "^spx",     symbol: "S&P500", name: "S&P 500",   source: "stock",  stooqSymbol: "^spx"   },
]

const STORAGE_KEY = "finsocial-watchlist-v2"
const MAX_ASSETS  = 10

function loadWatchlist(): WatchlistAsset[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_WATCHLIST
}

function saveWatchlist(list: WatchlistAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function watchlistToParams(list: WatchlistAsset[]): string {
  const crypto = list.filter((a) => a.source === "crypto").map((a) => a.cgId!).join(",")
  const stooq  = list.filter((a) => a.source === "stock").map((a) => a.stooqSymbol!).join(",")
  const params = new URLSearchParams()
  if (crypto) params.set("crypto", crypto)
  if (stooq)  params.set("stooq",  stooq)
  return params.toString()
}

// ─── Watchlist editor ─────────────────────────────────────────────────────────

interface SearchResult {
  id: string; symbol: string; name: string; source: "crypto" | "yahoo"
  type?: string; cgId?: string; yahooSymbol?: string
}

function WatchlistEditor({
  watchlist, onChange, onClose,
}: {
  watchlist: WatchlistAsset[]
  onChange: (list: WatchlistAsset[]) => void
  onClose: () => void
}) {
  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [dragId, setDragId]       = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`)
        if (res.ok) setResults(await res.json())
      } catch {}
      setSearching(false)
    }, 350)
  }, [query])

  function add(r: SearchResult) {
    if (watchlist.length >= MAX_ASSETS) return
    if (watchlist.some((a) => a.id === r.id)) return
    let asset: WatchlistAsset
    if (r.source === "crypto") {
      asset = { id: r.id, symbol: r.symbol, name: r.name, source: "crypto", cgId: r.id }
    } else {
      const stooq = yahooToStooq(r.id)
      asset = { id: stooq, symbol: r.symbol, name: r.name, source: "stock", stooqSymbol: stooq }
    }
    onChange([...watchlist, asset])
  }

  function remove(id: string) {
    onChange(watchlist.filter((a) => a.id !== id))
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────
  function handleDragStart(id: string) { setDragId(id) }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const list = [...watchlist]
    const from = list.findIndex((a) => a.id === dragId)
    const to   = list.findIndex((a) => a.id === targetId)
    list.splice(from, 1)
    list.splice(to, 0, watchlist[from])
    onChange(list)
    setDragId(null); setDragOverId(null)
  }
  function handleDragEnd() { setDragId(null); setDragOverId(null) }

  const typeColor = (t?: string) => {
    if (!t) return "#10b981"
    if (t === "Crypto")  return "#f59e0b"
    if (t === "INDEX")   return "#3b82f6"
    if (t === "ETF")     return "#8b5cf6"
    if (t === "FUTURE")  return "#f97316"
    return "#10b981"
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Counter header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Your assets
        </p>
        <span
          className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
          style={
            watchlist.length >= MAX_ASSETS
              ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b" }
              : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
          }
        >
          {watchlist.length} / {MAX_ASSETS}
        </span>
      </div>

      {/* Current assets — draggable */}
      <div className="space-y-1">
        {watchlist.map((asset) => {
          const isDragging  = dragId === asset.id
          const isDragOver  = dragOverId === asset.id && dragId !== asset.id
          return (
            <div
              key={asset.id}
              draggable
              onDragStart={() => handleDragStart(asset.id)}
              onDragOver={(e) => handleDragOver(e, asset.id)}
              onDrop={(e) => handleDrop(e, asset.id)}
              onDragEnd={handleDragEnd}
              className="flex items-center justify-between px-2 py-1.5 rounded-xl transition-all cursor-grab active:cursor-grabbing"
              style={{
                background: isDragOver ? "rgba(16,185,129,0.12)" : "var(--bg-base)",
                border: `1px solid ${isDragOver ? "rgba(16,185,129,0.4)" : "transparent"}`,
                opacity: isDragging ? 0.4 : 1,
                transform: isDragOver ? "scale(1.01)" : "scale(1)",
              }}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={12} style={{ color: "var(--text-secondary)", flexShrink: 0, opacity: 0.5 }} />
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  {asset.symbol.slice(0, 4)}
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none" style={{ color: "var(--text-primary)" }}>{asset.symbol}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{asset.name}</p>
                </div>
              </div>
              <button
                onClick={() => remove(asset.id)}
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-colors flex-shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
        {watchlist.length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>
            No assets — search below to add some
          </p>
        )}
      </div>

      {/* Limit notice */}
      {watchlist.length >= MAX_ASSETS && (
        <p className="text-[10px] text-amber-400 text-center">
          Max {MAX_ASSETS} assets — remove one to add another
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search BTC, AAPL, ^GSPC…"
          className="w-full text-xs pl-7 pr-3 py-2 rounded-xl outline-none transition-all"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          onFocus={(e) => (e.target.style.borderColor = "#10b981")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          autoFocus
        />
        {searching && <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-emerald-400" />}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => {
            const stooqId = r.source === "crypto" ? r.id : yahooToStooq(r.id)
            const already = watchlist.some((a) => a.id === stooqId)
            return (
              <div
                key={r.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-xl transition-all"
                style={{
                  background: already ? "rgba(16,185,129,0.12)" : "var(--bg-base)",
                  border: `1px solid ${already ? "rgba(16,185,129,0.35)" : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{
                      background: already ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.12)",
                      color: already ? "#10b981" : typeColor(r.type ?? r.source),
                    }}
                  >
                    {r.symbol.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p
                        className="text-xs font-semibold leading-none"
                        style={{ color: already ? "#10b981" : "var(--text-primary)" }}
                      >
                        {r.symbol}
                      </p>
                      {r.type && (
                        <span
                          className="text-[8px] px-1 rounded"
                          style={{ background: "var(--bg-elevated)", color: typeColor(r.type) }}
                        >
                          {r.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{r.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => already ? remove(stooqId) : add(r)}
                  disabled={!already && watchlist.length >= MAX_ASSETS}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{
                    background: already ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.15)",
                    color: "#10b981",
                  }}
                  title={already ? "Remove" : "Add"}
                >
                  {already ? <Check size={10} /> : <Plus size={10} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Done */}
      <button
        onClick={onClose}
        className="w-full text-xs font-bold py-2 rounded-xl transition-all hover:opacity-90"
        style={{ background: "#10b981", color: "#0f1117" }}
      >
        Done
      </button>
    </div>
  )
}

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return p.toFixed(2)
}

// ─── Fear & Greed gauge ───────────────────────────────────────────────────────

type FgType = "crypto" | "stocks"

function fgColor(v: number) {
  if (v <= 20) return "#ef4444"
  if (v <= 40) return "#f97316"
  if (v <= 60) return "#eab308"
  if (v <= 80) return "#84cc16"
  return "#10b981"
}

function FearGreedGauge({ value }: { value: number }) {
  const cx = 100, cy = 92, r = 72, nr = 52

  const getP = (v: number, radius = r) => {
    const a = Math.PI * (1 - v / 100)
    return { x: cx + radius * Math.cos(a), y: cy - radius * Math.sin(a) }
  }
  const arc = (v1: number, v2: number, color: string) => {
    const p1 = getP(v1); const p2 = getP(v2)
    return (
      <path d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
        fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />
    )
  }
  const needle = getP(value, nr)
  const color  = fgColor(value)

  return (
    <svg viewBox="0 0 200 97" className="w-full max-w-[200px] mx-auto">
      {arc(0,  20, "rgba(239,68,68,0.18)")}
      {arc(20, 40, "rgba(249,115,22,0.18)")}
      {arc(40, 60, "rgba(234,179,8,0.18)")}
      {arc(60, 80, "rgba(132,204,22,0.18)")}
      {arc(80, 100,"rgba(16,185,129,0.18)")}
      {value > 0 && arc(0, value, color)}
      {/* Needle — shorter, ends well above center label */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
        stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {/* Pivot dot */}
      <circle cx={cx} cy={cy} r="4.5" fill="white" />
      <circle cx={cx} cy={cy} r="2"   fill={color} />
    </svg>
  )
}

// ─── Fancy type toggle ────────────────────────────────────────────────────────

function FgTypeToggle({ value, onChange }: { value: FgType; onChange: (t: FgType) => void }) {
  return (
    <div
      className="relative flex rounded-xl p-1 mb-3"
      style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
    >
      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out"
        style={{
          left: value === "crypto" ? "4px" : "calc(50%)",
          background: value === "crypto"
            ? "linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.1))"
            : "linear-gradient(135deg,rgba(59,130,246,0.25),rgba(59,130,246,0.1))",
          border: `1px solid ${value === "crypto" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`,
        }}
      />
      <button
        onClick={() => onChange("crypto")}
        className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200"
        style={{ color: value === "crypto" ? "#10b981" : "var(--text-secondary)" }}
      >
        <span className="text-sm">₿</span> Crypto
      </button>
      <button
        onClick={() => onChange("stocks")}
        className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200"
        style={{ color: value === "stocks" ? "#3b82f6" : "var(--text-secondary)" }}
      >
        <span className="text-sm">📊</span> Stocks
      </button>
    </div>
  )
}

interface TrendingTicker {
  ticker: string
  count: number
  bullish: number
  bearish: number
  neutral: number
  avgConviction: number | null
  prevCount: number
  trend: "up" | "down" | "flat"
}
type TrendingWindow = "24h" | "7d" | "30d"
const TRENDING_WINDOWS: { key: TrendingWindow; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d",  label: "7d"  },
  { key: "30d", label: "30d" },
]

// ─── Widget layout (drag-to-reorder + persisted order) ────────────────────────

type WidgetId = "fear-greed" | "prices" | "movers" | "market-hours" | "most-analyzed" | "people" | "fx" | "sponsored"

const DEFAULT_LAYOUT: WidgetId[] = ["fear-greed", "prices", "fx", "sponsored", "movers", "market-hours", "most-analyzed", "people"]
const WIDGET_LABELS: Record<WidgetId, string> = {
  "fear-greed":   "Fear & Greed",
  "prices":       "Market Prices",
  "fx":           "Currencies",
  "movers":       "Top Movers",
  "market-hours": "Market Hours",
  "most-analyzed": "Most Analyzed",
  "people":       "People to Follow",
  "sponsored":    "Sponsored",
}
const LAYOUT_KEY = "peerza-rightpanel-layout-v1"
const HIDDEN_KEY = "peerza-rightpanel-hidden-v1"

function loadLayout(): WidgetId[] {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (!saved) return DEFAULT_LAYOUT
    const parsed = JSON.parse(saved) as string[]
    // Drop unknown ids; for any defaults missing from the saved order, insert
    // each at its index from DEFAULT_LAYOUT so newly-added widgets land in
    // their intended spot instead of being appended to the bottom.
    const valid = parsed.filter((id): id is WidgetId => DEFAULT_LAYOUT.includes(id as WidgetId))
    const result: WidgetId[] = [...valid]
    for (const id of DEFAULT_LAYOUT) {
      if (result.includes(id)) continue
      const idx = DEFAULT_LAYOUT.indexOf(id)
      result.splice(Math.min(idx, result.length), 0, id)
    }
    return result
  } catch {
    return DEFAULT_LAYOUT
  }
}

function saveLayout(order: WidgetId[]) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(order)) } catch {}
}

function loadHidden(): WidgetId[] {
  try {
    const saved = localStorage.getItem(HIDDEN_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved) as string[]
    return parsed.filter((id): id is WidgetId => DEFAULT_LAYOUT.includes(id as WidgetId))
  } catch {
    return []
  }
}

function saveHidden(hidden: WidgetId[]) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)) } catch {}
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RightPanel({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations("Widgets")
  const router                    = useRouter()
  const [prices, setPrices]       = useState<Price[]>([])
  const [pricesLoading, setPL]    = useState(true)
  const [lastUpdated, setLU]      = useState<Date | null>(null)
  const [watchlist, setWatchlistRaw] = useState<WatchlistAsset[]>(DEFAULT_WATCHLIST)
  const [editingWatchlist, setEditingWatchlist] = useState(false)
  const [fg, setFg]               = useState<{ value: number; label: string; type: string } | null>(null)
  const [fgLoading, setFgL]       = useState(true)
  const [fgType, setFgTypeRaw]    = useState<FgType>("crypto")
  const [movers, setMovers]       = useState<{ gainers: Mover[]; losers: Mover[] }>({ gainers: [], losers: [] })
  const [moversType, setMoversTypeRaw] = useState<"crypto" | "stocks" | "forex">("crypto")
  const [moversLoading, setMoversLoading] = useState(true)
  const [suggested, setSuggested] = useState<SuggestedUser[]>([])
  const [trendingTickers, setTrendingTickers] = useState<TrendingTicker[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [trendingWindow, setTrendingWindow]   = useState<TrendingWindow>("7d")
  const [sidebarAd, setSidebarAd]             = useState<AdCardData | null>(null)

  // Layout: order of widgets + edit-mode toggle + which ones are hidden
  const [layout, setLayoutRaw] = useState<WidgetId[]>(DEFAULT_LAYOUT)
  const [hidden, setHiddenRaw] = useState<WidgetId[]>([])
  const [editingLayout, setEditingLayout] = useState(false)
  const [dragId, setDragId] = useState<WidgetId | null>(null)
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null)

  function setLayout(next: WidgetId[]) {
    setLayoutRaw(next)
    saveLayout(next)
  }

  function setHidden(next: WidgetId[]) {
    setHiddenRaw(next)
    saveHidden(next)
  }

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT)
    setHidden([])
  }

  function hideWidget(id: WidgetId) {
    if (hidden.includes(id)) return
    setHidden([...hidden, id])
  }
  function showWidget(id: WidgetId) {
    setHidden(hidden.filter((h) => h !== id))
  }

  function onDragStart(id: WidgetId) { setDragId(id) }
  function onDragOverWidget(e: React.DragEvent, id: WidgetId) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }
  function onDropWidget(e: React.DragEvent, targetId: WidgetId) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const next = [...layout]
    const from = next.indexOf(dragId)
    const to = next.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); setDragOverId(null); return }
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    setLayout(next)
    setDragId(null); setDragOverId(null)
  }
  function onDragEndWidget() { setDragId(null); setDragOverId(null) }

  // Restore watchlist + preferences from localStorage
  useEffect(() => {
    setWatchlistRaw(loadWatchlist())
    const saved = localStorage.getItem("fg-type")
    if (saved === "stocks" || saved === "crypto") setFgTypeRaw(saved)
    setLayoutRaw(loadLayout())
    setHiddenRaw(loadHidden())
  }, [])

  function setFgType(t: FgType) {
    setFgTypeRaw(t)
    localStorage.setItem("fg-type", t)
  }

  function setWatchlist(list: WatchlistAsset[]) {
    setWatchlistRaw(list)
    saveWatchlist(list)
  }

  const fetchPrices = useCallback(async (list: WatchlistAsset[]) => {
    try {
      const params = watchlistToParams(list)
      const res = await fetch(`/api/market/prices${params ? `?${params}` : ""}`)
      if (res.ok) {
        const fresh: Price[] = await res.json()
        const expectedIds = new Set(list.map((a) => a.id))
        // Merge: take fresh values where present, fall back to previous prices
        // for the ones that didn't come back this poll. Drop any entry that's
        // no longer in the watchlist.
        setPrices((prev) => {
          const freshMap = new Map(fresh.map((p) => [p.id ?? (p as { symbol: string }).symbol, p]))
          const merged: Price[] = []
          for (const a of list) {
            const updated = freshMap.get(a.id)
            if (updated) {
              merged.push(updated)
              continue
            }
            const stale = prev.find((p) => p.id === a.id || p.symbol === a.symbol)
            if (stale) merged.push(stale)
          }
          return merged
        })
        setLU(new Date())
      }
    } catch {}
    setPL(false)
  }, [])

  const fetchFg = useCallback(async (type: FgType) => {
    setFgL(true)
    try {
      const res = await fetch(`/api/market/fear-greed?type=${type}`)
      if (res.ok) setFg(await res.json())
    } catch {}
    setFgL(false)
  }, [])

  // Re-fetch whenever type changes
  useEffect(() => { fetchFg(fgType) }, [fgType, fetchFg])

  const fetchTrending = useCallback(async (w: TrendingWindow) => {
    try {
      const res = await fetch(`/api/trending/tickers?window=${w}`)
      if (res.ok) {
        const d = await res.json()
        setTrendingTickers(d.tickers ?? [])
      }
    } catch {}
    setTrendingLoading(false)
  }, [])

  useEffect(() => {
    setTrendingLoading(true)
    fetchTrending(trendingWindow)
    const iv = setInterval(() => fetchTrending(trendingWindow), 60_000)
    return () => clearInterval(iv)
  }, [trendingWindow, fetchTrending])

  useEffect(() => {
    fetchPrices(watchlist)
    const iv = setInterval(() => fetchPrices(watchlist), 30_000)
    return () => clearInterval(iv)
  }, [watchlist, fetchPrices])

  // Restore movers type preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("peerza-movers-type-v1")
      if (saved === "crypto" || saved === "stocks" || saved === "forex") setMoversTypeRaw(saved)
    } catch {}
  }, [])

  function setMoversType(t: "crypto" | "stocks" | "forex") {
    setMoversTypeRaw(t)
    try { localStorage.setItem("peerza-movers-type-v1", t) } catch {}
  }

  useEffect(() => {
    setMoversLoading(true)
    setMovers({ gainers: [], losers: [] })
    const url = `/api/market/movers?type=${moversType}`
    fetch(url).then(r => r.ok ? r.json() : null).then((d) => {
      if (d) setMovers(d)
      setMoversLoading(false)
    }).catch(() => setMoversLoading(false))
    const iv = setInterval(() => {
      fetch(url).then(r => r.ok ? r.json() : null).then((d) => d && setMovers(d)).catch(() => {})
    }, 120_000)
    return () => clearInterval(iv)
  }, [moversType])

  useEffect(() => {
    fetch("/api/users/search?q=")
      .then(r => r.ok ? r.json() : [])
      .then((d: SuggestedUser[]) => setSuggested((d ?? []).filter(u => u.id !== currentUserId).slice(0, 3)))
      .catch(() => {})
  }, [currentUserId])

  // Sidebar sponsored — fetch one ad eligible for SIDEBAR placement
  useEffect(() => {
    fetch("/api/ads/serve?placement=SIDEBAR&limit=1")
      .then((r) => r.ok ? r.json() : { ads: [] })
      .then((d) => {
        const list = Array.isArray(d?.ads) ? d.ads : []
        setSidebarAd(list[0] ?? null)
      })
      .catch(() => {})
  }, [])

  // ── Render each widget by ID ───────────────────────────────────────────────
  const widgetRenderers: Record<WidgetId, () => React.ReactNode> = {
    "fear-greed":   () => renderFearGreed(),
    "prices":       () => renderPrices(),
    "fx":           () => <FxWidget />,
    "movers":       () => renderMovers(),
    "market-hours": () => <MarketHoursWidget />,
    "most-analyzed": () => renderMostAnalyzed(),
    "people":       () => renderPeople(),
    "sponsored":    () => renderSponsored(),
  }

  function renderSponsored() {
    // Render nothing when no eligible ad — saves vertical space
    if (!sidebarAd) return null
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1 gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider min-w-0 flex-1 truncate"
            style={{ color: "var(--text-secondary)" }}>
            {t("sponsored_label")}
          </p>
          <div className="flex-shrink-0">
            <WidgetHelp
              label={t("sponsored_label")}
              text={t("sponsored_text")}
            />
          </div>
        </div>
        <SidebarAdCard ad={sidebarAd} variant="sidebar" />
      </div>
    )
  }

  function renderFearGreed() { return (
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
              <span className="flex-shrink-0">😱</span>
              <span className="truncate">{t("fear_greed_label")}</span>
            </h3>
            <div className="flex-shrink-0">
              <WidgetHelp
                label={t("fear_greed_label")}
                text={t("fear_greed_text")}
              />
            </div>
          </div>

          {/* Toggle */}
          <FgTypeToggle value={fgType} onChange={setFgType} />

          {/* Gauge */}
          {fgLoading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-48 h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-base)" }} />
              <div className="h-6 w-16 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
            </div>
          ) : fg ? (
            <>
              <FearGreedGauge value={fg.value} />
              {/* Value + label — outside SVG, no overlap */}
              <div className="text-center mt-1 mb-2">
                <p className="text-3xl font-black tabular-nums" style={{ color: fgColor(fg.value) }}>
                  {fg.value}
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: fgColor(fg.value) }}>
                  {fg.label}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  {fgType === "crypto" ? "Crypto market sentiment" : "Stock market sentiment"}
                </p>
              </div>

              {/* Legend */}
              <div className="flex justify-between px-1 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                {[["Ext. Fear","#ef4444"],["Fear","#f97316"],["Neutral","#eab308"],["Greed","#84cc16"],["Ext. Greed","#10b981"]].map(([lbl, col]) => (
                  <div key={lbl} className="flex flex-col items-center gap-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                    <span className="text-[8px]" style={{ color: "var(--text-secondary)" }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
  ) }

  function renderPrices() { return (
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
              <Zap size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="truncate">{t("market_prices_label")}</span>
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!editingWatchlist && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
                </>
              )}
              <WidgetHelp
                label={t("market_prices_label")}
                text={t("market_prices_text")}
              />
              <button
                onClick={() => setEditingWatchlist((v) => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                style={{ color: editingWatchlist ? "#10b981" : "var(--text-secondary)" }}
                title={`Customize watchlist (${watchlist.length}/${MAX_ASSETS})`}
              >
                {editingWatchlist ? <Check size={13} /> : <Pencil size={13} />}
              </button>
            </div>
          </div>

          {editingWatchlist ? (
            <WatchlistEditor
              watchlist={watchlist}
              onChange={setWatchlist}
              onClose={() => { setEditingWatchlist(false); setPL(true); fetchPrices(watchlist) }}
            />
          ) : pricesLoading ? (
            <div className="space-y-3">
              {[...Array(watchlist.length || 5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
                    <div className="space-y-1">
                      <div className="h-2.5 w-10 rounded" style={{ background: "var(--bg-elevated)" }} />
                      <div className="h-2 w-14 rounded"   style={{ background: "var(--bg-elevated)" }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2.5 w-14 rounded" style={{ background: "var(--bg-elevated)" }} />
                    <div className="h-2 w-10 rounded"   style={{ background: "var(--bg-elevated)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : prices.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>
              No prices available — check your assets
            </p>
          ) : (
            <div className="space-y-3">
              {prices.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: item.up ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                        color: item.up ? "#10b981" : "#f43f5e",
                      }}
                    >
                      {item.symbol.slice(0, 4)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.symbol}</p>
                      <p className="text-[10px]"           style={{ color: "var(--text-secondary)" }}>{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      ${fmtPrice(item.price)}
                    </p>
                    <p
                      className="text-[10px] font-medium flex items-center justify-end gap-0.5 tabular-nums"
                      style={{ color: item.up ? "#10b981" : "#f43f5e" }}
                    >
                      {item.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!editingWatchlist && lastUpdated && (
            <p className="text-[10px] mt-3" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · 24h change
            </p>
          )}
        </div>
  ) }

  function renderMovers() { return (
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold flex items-baseline gap-1 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
              <span className="flex-shrink-0">🚀</span>
              <span className="truncate">{t("top_movers_label")}</span>
              <span className="text-[10px] font-normal flex-shrink-0" style={{ color: "var(--text-secondary)" }}>24h</span>
            </h3>
            <div className="flex-shrink-0">
              <WidgetHelp
                label={t("top_movers_label")}
                text={t("top_movers_text")}
              />
            </div>
          </div>

          {/* Type toggle */}
          <div className="flex gap-1 mb-3 p-0.5 rounded-lg"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            {(["crypto", "stocks", "forex"] as const).map((kind) => (
              <button key={kind} onClick={() => setMoversType(kind)}
                className="flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all"
                style={moversType === kind
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "transparent", color: "var(--text-secondary)" }}>
                {kind === "crypto" ? "Crypto" : kind === "stocks" ? "Stocks" : "Forex"}
              </button>
            ))}
          </div>

          {moversLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(2)].map((_, col) => (
                <div key={col} className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-7 rounded animate-pulse" style={{ background: "var(--bg-base)" }} />
                  ))}
                </div>
              ))}
            </div>
          ) : (movers.gainers.length === 0 && movers.losers.length === 0) ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>
              No data — try again later.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Gainers</p>
                <div className="space-y-2">
                  {movers.gainers.map((m) => (
                    <div key={m.symbol} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.symbol}</p>
                        <p className="text-[9px] truncate" style={{ color: "var(--text-secondary)" }}>{m.name}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 tabular-nums flex-shrink-0">+{m.change}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-rose-400 mb-2 uppercase tracking-wider">Losers</p>
                <div className="space-y-2">
                  {movers.losers.map((m) => (
                    <div key={m.symbol} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.symbol}</p>
                        <p className="text-[9px] truncate" style={{ color: "var(--text-secondary)" }}>{m.name}</p>
                      </div>
                      <span className="text-[10px] font-bold text-rose-400 tabular-nums flex-shrink-0">{m.change}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
  ) }

  function renderMostAnalyzed() { return (
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 min-w-0 flex-1" style={{ color: "var(--text-primary)" }}>
              <Flame size={14} className="text-orange-400 flex-shrink-0" />
              <span className="truncate">{t("most_analyzed_label")}</span>
            </h3>
            <div className="flex-shrink-0">
              <WidgetHelp
                label={t("most_analyzed_label")}
                text={t("most_analyzed_text")}
              />
            </div>
          </div>

          {/* Window toggle */}
          <div className="flex gap-1 mb-3 p-0.5 rounded-lg"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            {TRENDING_WINDOWS.map((w) => (
              <button key={w.key} onClick={() => setTrendingWindow(w.key)}
                className="flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all"
                style={trendingWindow === w.key
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "transparent", color: "var(--text-secondary)" }}>
                {w.label}
              </button>
            ))}
          </div>

          {trendingLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: "var(--bg-base)" }} />
              ))}
            </div>
          ) : trendingTickers.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-secondary)" }}>
              No analyses in the last {trendingWindow}.<br />
              <span className="opacity-60">Be the first — share your take.</span>
            </p>
          ) : (
            <div className="space-y-1.5">
              {trendingTickers.map((t, i) => {
                const total = t.bullish + t.bearish + t.neutral || 1
                const bullPct = (t.bullish / total) * 100
                const bearPct = (t.bearish / total) * 100
                const neuPct  = (t.neutral / total) * 100
                const sentimentLabel =
                  t.bullish > t.bearish && t.bullish > t.neutral ? `${Math.round(bullPct)}% bullish`
                  : t.bearish > t.bullish && t.bearish > t.neutral ? `${Math.round(bearPct)}% bearish`
                  : `${Math.round(neuPct)}% neutral`
                const sentimentColor =
                  t.bullish > t.bearish && t.bullish > t.neutral ? "#10b981"
                  : t.bearish > t.bullish && t.bearish > t.neutral ? "#ef4444"
                  : "#eab308"
                const TrendIcon = t.trend === "up" ? ArrowUp : t.trend === "down" ? ArrowDown : Minus
                const trendColor = t.trend === "up" ? "#10b981" : t.trend === "down" ? "#ef4444" : "var(--text-secondary)"
                return (
                  <button key={t.ticker}
                    onClick={() => router.push(`/feed?ticker=${encodeURIComponent(t.ticker)}`)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)] text-left"
                    title={t.avgConviction != null ? `Avg conviction ${t.avgConviction}/5` : undefined}>
                    <span className="text-[10px] font-bold w-4 text-center flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          ${t.ticker}
                        </span>
                        <TrendIcon size={10} style={{ color: trendColor }} />
                        {t.avgConviction != null && t.avgConviction >= 4 && (
                          <Star size={9} fill="#eab308" stroke="#eab308" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden flex" style={{ background: "var(--bg-base)" }}>
                          {bullPct > 0 && <div style={{ width: `${bullPct}%`, background: "#10b981" }} />}
                          {neuPct  > 0 && <div style={{ width: `${neuPct}%`,  background: "#eab308" }} />}
                          {bearPct > 0 && <div style={{ width: `${bearPct}%`, background: "#ef4444" }} />}
                        </div>
                        <span className="text-[9px] font-medium tabular-nums flex-shrink-0" style={{ color: sentimentColor }}>
                          {sentimentLabel}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums flex-shrink-0"
                      style={{ color: "var(--text-secondary)" }}>
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
  ) }

  function renderPeople() {
    if (suggested.length === 0) return null
    return (
          <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="text-sm font-semibold min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }}>{t("people_to_follow_label")}</h3>
              <div className="flex-shrink-0">
                <WidgetHelp
                  label={t("people_to_follow_label")}
                  text={t("people_to_follow_text")}
                />
              </div>
            </div>
            <div className="space-y-3">
              {suggested.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Link href={`/profile/${user.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: "rgba(16,185,129,0.15)" }}>
                      {user.image
                        ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                        : <User size={14} className="text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
                    </div>
                  </Link>
                  <FollowButton targetUserId={user.id} initialIsFollowing={user.isFollowing} />
                </div>
              ))}
            </div>
          </div>
    )
  }

  return (
    <aside
      className="w-72 flex-shrink-0 hidden xl:block sticky overflow-y-auto"
      style={{ top: "64px", height: "calc(100vh - 64px)", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      <div className="space-y-4 py-4 pb-8">
        {/* Layout customization toolbar */}
        <div className="flex items-center justify-end gap-1 px-1">
          {editingLayout && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}
              title="Reset to default order"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
          <button
            onClick={() => setEditingLayout((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-base)]"
            style={{
              color: editingLayout ? "#10b981" : "var(--text-secondary)",
              background: editingLayout ? "rgba(16,185,129,0.12)" : "transparent",
              border: editingLayout ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
            }}
            title={editingLayout ? "Done — lock layout" : "Customize layout"}
          >
            {editingLayout ? <Check size={11} /> : <LayoutGrid size={11} />}
            {editingLayout ? "Done" : "Customize"}
          </button>
        </div>

        {/* Hidden widgets — chips to re-enable, only in customize mode */}
        {editingLayout && hidden.length > 0 && (
          <div className="rounded-xl px-3 py-2.5 space-y-1.5"
            style={{ background: "var(--bg-card)", border: "1px dashed var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Hidden — tap to add back
            </p>
            <div className="flex flex-wrap gap-1.5">
              {hidden.map((id) => (
                <button key={id} onClick={() => showWidget(id)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-colors"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}>
                  <Plus size={9} /> {WIDGET_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Widgets — rendered in user-defined order, skipping hidden ones */}
        {layout.map((id) => {
          if (hidden.includes(id)) return null
          const node = widgetRenderers[id]()
          if (!node) return null
          const isDragging = dragId === id
          const isDragOver = dragOverId === id && dragId !== id
          return (
            <div
              key={id}
              draggable={editingLayout}
              onDragStart={() => onDragStart(id)}
              onDragOver={(e) => onDragOverWidget(e, id)}
              onDrop={(e) => onDropWidget(e, id)}
              onDragEnd={onDragEndWidget}
              className="relative transition-all"
              style={{
                opacity: isDragging ? 0.4 : 1,
                outline: isDragOver ? "2px solid rgba(16,185,129,0.6)" : "none",
                outlineOffset: isDragOver ? "2px" : "0",
                borderRadius: "1rem",
                cursor: editingLayout ? (isDragging ? "grabbing" : "grab") : "default",
              }}
            >
              {editingLayout && (
                <>
                  <div
                    className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center pointer-events-none"
                    style={{ background: "rgba(16,185,129,0.18)", color: "#10b981" }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={12} />
                  </div>
                  <button
                    onClick={() => hideWidget(id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                    title={`Hide ${WIDGET_LABELS[id]}`}
                    aria-label={`Hide ${WIDGET_LABELS[id]}`}
                  >
                    <EyeOff size={12} />
                  </button>
                </>
              )}
              {node}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
