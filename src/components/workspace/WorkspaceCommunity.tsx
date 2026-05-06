"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, MessageCircle, Heart, ExternalLink, RefreshCw, ArrowRight } from "lucide-react"
import ProBadge from "@/components/shared/ProBadge"
import TickerComposer from "./TickerComposer"

type Direction = "bullish" | "bearish" | "neutral"
type Filter = "latest" | "bullish" | "bearish"

interface Author {
  id: string; name: string; username: string
  image?: string | null
  isPremium?: boolean
  isPro?: boolean
}

interface Analysis {
  ticker?: string
  direction?: Direction
  timeframe?: string
  conviction?: number
  catalyst?: string
}

interface Post {
  id: string
  content: string
  createdAt: string
  imageUrl?: string | null
  analysis?: Analysis | null
  author: Author
  _count: { comments: number; likes: number }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d`
  return new Date(iso).toLocaleDateString()
}

function dirIcon(d?: Direction) {
  if (d === "bullish") return <TrendingUp size={10} />
  if (d === "bearish") return <TrendingDown size={10} />
  return <Minus size={10} />
}
function dirColor(d?: Direction) {
  if (d === "bullish") return "#10b981"
  if (d === "bearish") return "#ef4444"
  return "#eab308"
}

interface Props {
  ticker: string
}

export default function WorkspaceCommunity({ ticker }: Props) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>("latest")
  const [composerOpen, setComposerOpen] = useState(false)

  async function load() {
    if (!ticker) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts?ticker=${encodeURIComponent(ticker)}`)
      if (res.ok) {
        const d = await res.json()
        setPosts(d.posts ?? [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    // No interval — let the user hit Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker])

  const filtered = filter === "latest"
    ? posts
    : posts.filter((p) => p.analysis?.direction === filter)

  const bull = posts.filter((p) => p.analysis?.direction === "bullish").length
  const bear = posts.filter((p) => p.analysis?.direction === "bearish").length
  const neu  = posts.filter((p) => p.analysis?.direction === "neutral").length
  const total = bull + bear + neu

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: "var(--bg-card)" }}>
      {/* Header */}
      <header className="px-3 py-3 flex items-center justify-between gap-2"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}>
            Community
          </p>
          <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
            ${ticker} <span className="text-[10px] font-normal" style={{ color: "var(--text-secondary)" }}>on Peerza</span>
          </p>
        </div>
        <button
          onClick={load}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)] transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Refresh"
          aria-label="Refresh community posts"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Sentiment summary */}
      {total > 0 && (
        <div className="px-3 pt-2.5 pb-1.5">
          <div className="flex items-center gap-1.5 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-base)" }}>
            {bull > 0 && <div style={{ width: `${(bull/total)*100}%`, background: "#10b981" }} />}
            {neu  > 0 && <div style={{ width: `${(neu/total)*100}%`,  background: "#eab308" }} />}
            {bear > 0 && <div style={{ width: `${(bear/total)*100}%`, background: "#ef4444" }} />}
          </div>
          <div className="flex justify-between text-[9px] mt-1 tabular-nums"
            style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "#10b981" }}>{bull} bull</span>
            <span style={{ color: "#eab308" }}>{neu} neut</span>
            <span style={{ color: "#ef4444" }}>{bear} bear</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 pb-2">
        {(["latest", "bullish", "bearish"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-[10px] font-semibold px-2 py-1 rounded-md transition-all capitalize"
            style={filter === f
              ? { background: "rgba(16,185,129,0.18)", color: "#10b981" }
              : { background: "transparent", color: "var(--text-secondary)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2"
        style={{ scrollbarWidth: "thin" }}>
        {loading && posts.length === 0 ? (
          <div className="space-y-2 p-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl p-3 animate-pulse"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <div className="h-2.5 w-24 rounded mb-2" style={{ background: "var(--bg-elevated)" }} />
                <div className="h-2 w-full rounded mb-1" style={{ background: "var(--bg-elevated)" }} />
                <div className="h-2 w-2/3 rounded" style={{ background: "var(--bg-elevated)" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-xs mb-1" style={{ color: "var(--text-primary)" }}>
              No {filter === "latest" ? "" : filter} analyses on ${ticker} yet.
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Be the first — share your take.
            </p>
            <Link
              href={`/feed?ticker=${encodeURIComponent(ticker)}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold mt-3 px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
            >
              Open in feed <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        )}
      </div>

      {/* Compose footer — trigger only; raised 88px so it clears the floating chat bubble */}
      <div
        className="px-3 py-2.5"
        style={{ borderTop: "1px solid var(--border)", marginBottom: 88 }}
      >
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all hover:opacity-90"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          Share idea on ${ticker}
        </button>
      </div>

      {/* Compose sheet — also lifted 88px so the Post button doesn't sit under the chat bubble */}
      {composerOpen && (
        <>
          <div
            className="absolute z-20"
            style={{ top: 0, left: 0, right: 0, bottom: 88, background: "rgba(0,0,0,0.45)" }}
            onClick={() => setComposerOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 right-0 z-30 rounded-t-2xl px-3 py-3 overflow-y-auto"
            style={{
              bottom: 88,
              background: "var(--bg-card)",
              borderTop: "1px solid var(--border)",
              boxShadow: "0 -10px 30px rgba(0,0,0,0.4)",
              maxHeight: "calc(85% - 88px)",
              scrollbarWidth: "thin",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Share idea on $${ticker}`}
          >
            <TickerComposer
              ticker={ticker}
              onPosted={load}
              onClose={() => setComposerOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}

function PostRow({ post }: { post: Post }) {
  const a = post.analysis
  const dirCol = dirColor(a?.direction)
  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-xl p-2.5 transition-colors hover:bg-[var(--bg-base)]"
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: "rgba(16,185,129,0.15)" }}
        >
          {post.author.image
            ? <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
            : <span className="text-[10px] font-bold text-emerald-400">
                {post.author.name.slice(0, 1).toUpperCase()}
              </span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {post.author.name}
            </p>
            {post.author.isPro && <ProBadge />}
          </div>
          <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
            @{post.author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <ExternalLink size={10} style={{ color: "var(--text-secondary)", opacity: 0.5 }} />
      </div>

      {/* Sentiment chip */}
      {a?.direction && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${dirCol}22`, color: dirCol }}>
            {dirIcon(a.direction)} {a.direction}
          </span>
          {a.timeframe && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}>
              {a.timeframe}
            </span>
          )}
          {typeof a.conviction === "number" && (
            <span className="text-[9px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {a.conviction}/5
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <p
        className="text-[11px] leading-snug"
        style={{
          color: "var(--text-primary)",
          opacity: 0.92,
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {post.content}
      </p>

      {/* Footer counters */}
      <div className="flex items-center gap-3 mt-2 text-[10px] tabular-nums"
        style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1"><Heart size={10} /> {post._count.likes}</span>
        <span className="flex items-center gap-1"><MessageCircle size={10} /> {post._count.comments}</span>
      </div>
    </Link>
  )
}
