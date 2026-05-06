"use client"

import { useEffect, useState } from "react"
import { Search, Star, X, Users, PanelRightClose, PanelRightOpen } from "lucide-react"
import TradingViewChart from "./TradingViewChart"
import WorkspacePanel from "./WorkspacePanel"
import SymbolStats from "./SymbolStats"
import SidebarAdCard from "@/components/ads/SidebarAdCard"
import type { AdCardData } from "@/components/ads/AdCard"
import { QUICK_PICKS, toTvSymbol, tvToTicker } from "@/lib/tv-symbols"

interface WatchlistAsset {
  id: string
  symbol: string
  name: string
  source: "crypto" | "stock"
  cgId?: string
  stooqSymbol?: string
}

interface Pin {
  label: string
  tv: string
}

const STORAGE_KEY = "finsocial-watchlist-v2"
const PINS_KEY    = "peerza-workspace-pins-v1"
const LAST_KEY    = "peerza-workspace-last-v1"
const COMM_KEY    = "peerza-workspace-community-v1"

function loadWatchlist(): WatchlistAsset[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) return JSON.parse(v)
  } catch {}
  return []
}

function loadPins(): Pin[] {
  try {
    const v = localStorage.getItem(PINS_KEY)
    if (v) return JSON.parse(v)
  } catch {}
  return [
    { label: "BTC",  tv: "BINANCE:BTCUSDT" },
    { label: "NVDA", tv: "NASDAQ:NVDA" },
    { label: "Gold", tv: "OANDA:XAUUSD" },
  ]
}

function loadLast(): string {
  try {
    const v = localStorage.getItem(LAST_KEY)
    if (v) return v
  } catch {}
  return "BINANCE:BTCUSDT"
}

function detectTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark"
  const t = document.documentElement.getAttribute("data-theme")
  return t === "light" ? "light" : "dark"
}

export default function Workspace() {
  const [symbol, setSymbol]   = useState<string>("BINANCE:BTCUSDT")
  const [pins, setPins]       = useState<Pin[]>([])
  const [watchlist, setWatch] = useState<WatchlistAsset[]>([])
  const [theme, setTheme]     = useState<"dark" | "light">("dark")
  const [search, setSearch]   = useState("")
  const [showCommunity, setShowCommunity] = useState(true)
  const [workspaceAd, setWorkspaceAd] = useState<AdCardData | null>(null)

  useEffect(() => {
    setSymbol(loadLast())
    setPins(loadPins())
    setWatch(loadWatchlist())
    setTheme(detectTheme())
    try {
      const v = localStorage.getItem(COMM_KEY)
      if (v === "0") setShowCommunity(false)
    } catch {}

    // React to theme changes (the toggle flips the data-theme attribute on <html>)
    const obs = new MutationObserver(() => setTheme(detectTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })

    // Workspace sponsored — fetch one ad eligible for WORKSPACE placement
    fetch("/api/ads/serve?placement=WORKSPACE&limit=1")
      .then((r) => r.ok ? r.json() : { ads: [] })
      .then((d) => {
        const list = Array.isArray(d?.ads) ? d.ads : []
        setWorkspaceAd(list[0] ?? null)
      })
      .catch(() => {})

    return () => obs.disconnect()
  }, [])

  function pickSymbol(tv: string, label?: string) {
    setSymbol(tv)
    try { localStorage.setItem(LAST_KEY, tv) } catch {}
    if (label && !pins.find((p) => p.tv === tv)) {
      // Auto-add to recent? We keep this minimal — only pin via the star button.
    }
  }

  function pinCurrent(label: string) {
    if (pins.find((p) => p.tv === symbol)) return
    const next = [{ label, tv: symbol }, ...pins].slice(0, 12)
    setPins(next)
    try { localStorage.setItem(PINS_KEY, JSON.stringify(next)) } catch {}
  }

  function unpin(tv: string) {
    const next = pins.filter((p) => p.tv !== tv)
    setPins(next)
    try { localStorage.setItem(PINS_KEY, JSON.stringify(next)) } catch {}
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const raw = search.trim().toUpperCase().replace(/\s+/g, "")
    if (!raw) return
    // If user typed an explicit "EXCHANGE:SYMBOL", use as-is. Else hand it to TV
    // and let its own resolver figure it out.
    const tv = raw.includes(":") ? raw : raw
    pickSymbol(tv)
    setSearch("")
  }

  function toggleCommunity() {
    setShowCommunity((v) => {
      const next = !v
      try { localStorage.setItem(COMM_KEY, next ? "1" : "0") } catch {}
      return next
    })
  }

  const isPinned = !!pins.find((p) => p.tv === symbol)
  const ticker = tvToTicker(symbol)

  return (
    <div
      className="flex flex-col"
      style={{
        height: "calc(100vh - 64px)",
        background: "var(--bg-base)",
      }}
    >
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            Workspace
          </span>
          <span className="text-sm font-bold tabular-nums truncate" style={{ color: "var(--text-primary)" }}>
            {symbol}
          </span>
          <button
            onClick={() => isPinned ? unpin(symbol) : pinCurrent(symbol.split(":").pop() ?? symbol)}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-base)]"
            style={{ color: isPinned ? "#eab308" : "var(--text-secondary)" }}
            title={isPinned ? "Unpin" : "Pin to workspace"}
            aria-label={isPinned ? "Unpin symbol" : "Pin symbol"}
          >
            <Star size={14} fill={isPinned ? "#eab308" : "transparent"} />
          </button>
        </div>

        <form onSubmit={submitSearch} className="flex-1 max-w-md relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-secondary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to symbol — e.g. NASDAQ:AAPL, BINANCE:BTCUSDT, OANDA:EURUSD"
            className="w-full text-xs pl-7 pr-3 py-2 rounded-lg outline-none transition-all"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#10b981")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </form>

        <p className="text-[10px] hidden md:block" style={{ color: "var(--text-secondary)" }}>
          Indicators &amp; drawings live inside the chart toolbar
        </p>

        <button
          onClick={toggleCommunity}
          className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
          style={{
            background: showCommunity ? "rgba(16,185,129,0.15)" : "var(--bg-base)",
            border: "1px solid var(--border)",
            color: showCommunity ? "#10b981" : "var(--text-secondary)",
          }}
          title={showCommunity ? "Hide side panel" : "Show side panel"}
          aria-label={showCommunity ? "Hide side panel" : "Show side panel"}
        >
          {showCommunity ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
          <Users size={12} />
          Side panel
        </button>
      </header>

      {/* Symbol stats strip */}
      <SymbolStats tv={symbol} />

      {/* Body: left rail + chart */}
      <div className="flex-1 flex min-h-0">
        {/* Left rail */}
        <aside
          className="w-56 flex-shrink-0 hidden md:flex flex-col overflow-y-auto"
          style={{
            borderRight: "1px solid var(--border)",
            background: "var(--bg-card)",
            scrollbarWidth: "thin",
          }}
        >
          {pins.length > 0 && (
            <Section title="Pinned">
              {pins.map((p) => (
                <Row
                  key={p.tv}
                  label={p.label}
                  sub={p.tv}
                  active={p.tv === symbol}
                  onClick={() => pickSymbol(p.tv)}
                  onRemove={() => unpin(p.tv)}
                />
              ))}
            </Section>
          )}

          {watchlist.length > 0 && (
            <Section title="Your watchlist">
              {watchlist.map((a) => {
                const tv = toTvSymbol(a)
                return (
                  <Row
                    key={a.id}
                    label={a.symbol}
                    sub={a.name}
                    active={tv === symbol}
                    onClick={() => pickSymbol(tv)}
                  />
                )
              })}
            </Section>
          )}

          {workspaceAd && (
            <div className="px-2 py-3"
              style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider px-1 pb-1.5"
                style={{ color: "var(--text-secondary)" }}>
                Sponsored
              </p>
              <SidebarAdCard ad={workspaceAd} variant="workspace" />
            </div>
          )}

          {QUICK_PICKS.map((g) => (
            <Section key={g.group} title={g.group}>
              {g.items.map((it) => (
                <Row
                  key={it.tv}
                  label={it.label}
                  sub={it.tv.split(":").pop() ?? ""}
                  active={it.tv === symbol}
                  onClick={() => pickSymbol(it.tv, it.label)}
                />
              ))}
            </Section>
          ))}
        </aside>

        {/* Chart */}
        <div className="flex-1 min-w-0 relative">
          <TradingViewChart symbol={symbol} theme={theme} />
        </div>

        {/* Side panel — Community / News tabs */}
        {showCommunity && (
          <aside
            className="w-80 flex-shrink-0 hidden md:flex flex-col"
            style={{ borderLeft: "1px solid var(--border)" }}
          >
            <WorkspacePanel ticker={ticker} />
          </aside>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider px-3 pb-1.5"
        style={{ color: "var(--text-secondary)" }}>
        {title}
      </p>
      <div>{children}</div>
    </div>
  )
}

function Row({
  label, sub, active, onClick, onRemove,
}: {
  label: string; sub: string; active: boolean
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <div
      className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors hover:bg-[var(--bg-base)]"
      style={active ? { background: "rgba(16,185,129,0.12)" } : undefined}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate"
          style={{ color: active ? "#10b981" : "var(--text-primary)" }}>
          {label}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition-all flex-shrink-0"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Remove"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}
