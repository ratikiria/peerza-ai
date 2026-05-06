"use client"

import { useEffect, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"

interface NewsItem {
  uuid: string
  title: string
  publisher: string
  link: string
  publishedAt: number
  thumbnail: string | null
}

function timeAgo(ms: number): string {
  if (!ms) return ""
  const diff = Math.max(0, Date.now() - ms)
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(ms).toLocaleDateString()
}

interface Props {
  ticker: string
}

export default function WorkspaceNews({ ticker }: Props) {
  const [items, setItems]     = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!ticker) return
    setLoading(true)
    try {
      const r = await fetch(`/api/market/news?q=${encodeURIComponent(ticker)}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.news ?? [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker])

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-card)" }}>
      <header
        className="px-3 py-3 flex items-center justify-between gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            News
          </p>
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
            ${ticker} <span className="text-[10px] font-normal" style={{ color: "var(--text-secondary)" }}>headlines</span>
          </p>
        </div>
        <button
          onClick={load}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)] transition-colors"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Refresh news"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading && items.length === 0 ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-3 animate-pulse"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            >
              <div className="h-2.5 w-3/4 rounded mb-2" style={{ background: "var(--bg-elevated)" }} />
              <div className="h-2 w-full rounded mb-1"  style={{ background: "var(--bg-elevated)" }} />
              <div className="h-2 w-2/3 rounded"        style={{ background: "var(--bg-elevated)" }} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs mb-1" style={{ color: "var(--text-primary)" }}>
              No recent news for ${ticker}.
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Yahoo Finance returned nothing — try a more common ticker.
            </p>
          </div>
        ) : (
          items.map((n) => <NewsRow key={n.uuid} n={n} />)
        )}
      </div>
    </div>
  )
}

function NewsRow({ n }: { n: NewsItem }) {
  return (
    <a
      href={n.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-2.5 transition-colors hover:bg-[var(--bg-base)]"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex gap-2">
        {n.thumbnail && (
          <img
            src={n.thumbnail}
            alt=""
            className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold leading-snug"
            style={{
              color: "var(--text-primary)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {n.title}
          </p>
          <div
            className="flex items-center gap-1 mt-1.5 text-[9px]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="truncate">{n.publisher}</span>
            <span>·</span>
            <span className="flex-shrink-0">{timeAgo(n.publishedAt)}</span>
            <ExternalLink size={9} className="ml-auto flex-shrink-0" />
          </div>
        </div>
      </div>
    </a>
  )
}
