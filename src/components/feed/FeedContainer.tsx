"use client"

import { useEffect, useState, useRef, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { X, Flame, Sparkles, Users, BrainCircuit, ArrowRight, Compass, MessageSquarePlus } from "lucide-react"
import CreatePost from "./CreatePost"
import PostCard from "./PostCard"
import StoriesBar from "./StoriesBar"
import AdCard, { type AdCardData } from "@/components/ads/AdCard"

interface Post {
  id: string
  content: string
  imageUrl?: string | null
  videoUrl?: string | null
  videoMime?: string | null
  analysis?: any | null
  topics?: string[]
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    image?: string | null
    isPremium: boolean
  }
  likes: { userId: string; reaction: string }[]
  _count: { comments: number; likes: number }
}

interface FeedContainerProps {
  user: { id: string; name: string; username: string; image?: string | null; isPremium: boolean }
  currentUserId: string
}

const TOPICS = [
  { key: "crypto",  label: "Crypto",  tint: "#f59e0b" },
  { key: "stocks",  label: "Stocks",  tint: "#60a5fa" },
  { key: "forex",   label: "Forex",   tint: "#a78bfa" },
  { key: "options", label: "Options", tint: "#10b981" },
] as const

type TopicKey = typeof TOPICS[number]["key"]

const TOPIC_STORAGE = "peerza-feed-topics-v1"

const KEYWORDS: Record<TopicKey, string[]> = {
  crypto:  ["btc", "eth", "bitcoin", "ethereum", "crypto", "defi", "nft", "sol", "solana", "bnb", "xrp"],
  stocks:  ["stock", "tsla", "aapl", "nasdaq", "shares", "earnings", "dividend", "sp500", "s&p"],
  forex:   ["forex", "eur", "usd", "gbp", "fx", "currency", "pip"],
  options: ["options", "calls", "puts", "expiry", "strike", "hedge", "theta", "delta"],
}

// Client-side fallback for posts without explicit topics (legacy posts)
function clientMatches(post: Post, selected: TopicKey[]): boolean {
  if (selected.length === 0 || selected.length === TOPICS.length) return true
  if (post.topics && post.topics.length > 0) {
    return selected.some((t) => post.topics!.includes(t))
  }
  // Legacy fallback: keyword search in content
  const text = post.content.toLowerCase()
  return selected.some((t) => KEYWORDS[t].some((kw) => text.includes(kw)))
}

export default function FeedContainer(props: FeedContainerProps) {
  return (
    <Suspense fallback={null}>
      <FeedContainerInner {...props} />
    </Suspense>
  )
}

function FeedContainerInner({ user, currentUserId }: FeedContainerProps) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const tickerFilter = searchParams.get("ticker")?.trim().toUpperCase() || null

  const [posts, setPosts]         = useState<Post[]>([])
  const [nextCursor, setNext]     = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLM]      = useState(false)
  const [selected, setSelected]   = useState<TopicKey[]>([])
  const [hydrated, setHydrated]   = useState(false)
  const [ads, setAds]             = useState<AdCardData[]>([])
  const sentinelRef               = useRef<HTMLDivElement>(null)
  const isFetching                = useRef(false)

  // Hydrate topic selection from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOPIC_STORAGE)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          const valid = arr.filter((t): t is TopicKey =>
            TOPICS.some((tt) => tt.key === t)
          )
          setSelected(valid)
        }
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Persist whenever selection changes
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(TOPIC_STORAGE, JSON.stringify(selected)) } catch {}
  }, [selected, hydrated])

  const topicsParam = selected.length > 0 && selected.length < TOPICS.length ? selected.join(",") : ""

  const loadPosts = useCallback(async (cursor?: string) => {
    if (isFetching.current) return
    isFetching.current = true
    if (cursor) setLM(true)

    const params = new URLSearchParams()
    if (cursor) params.set("cursor", cursor)
    if (tickerFilter) params.set("ticker", tickerFilter)
    if (topicsParam) params.set("topics", topicsParam)
    const qs = params.toString()
    const url = qs ? `/api/posts?${qs}` : "/api/posts"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setPosts((prev) => (cursor ? [...prev, ...data.posts] : data.posts))
      setNext(data.nextCursor)
    }
    setLoading(false)
    setLM(false)
    isFetching.current = false
  }, [tickerFilter, topicsParam])

  useEffect(() => {
    if (!hydrated) return
    setLoading(true)
    setPosts([])
    setNext(null)
    loadPosts()
  }, [loadPosts, hydrated])

  // Load ads when topic selection or ticker filter changes
  useEffect(() => {
    if (!hydrated || tickerFilter) return
    const params = new URLSearchParams()
    if (topicsParam) params.set("topics", topicsParam)
    params.set("limit", "3")
    params.set("placement", "FEED")
    fetch(`/api/ads/serve?${params.toString()}`)
      .then((r) => r.ok ? r.json() : { ads: [] })
      .then((d) => setAds(Array.isArray(d?.ads) ? d.ads : []))
      .catch(() => {})
  }, [topicsParam, tickerFilter, hydrated])

  function clearTickerFilter() {
    router.push(pathname)
  }

  // Infinite scroll — fires when sentinel enters viewport
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isFetching.current) {
          loadPosts(nextCursor)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [nextCursor, loadPosts])

  const handlePostCreated = (newPost: Post) =>
    setPosts((prev) => [newPost, ...prev])

  const handlePostDeleted = (postId: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== postId))

  const visible = posts.filter((p) => clientMatches(p, selected))

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stories bar skeleton — row of circular bubbles */}
        <div className="rounded-2xl p-4 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-14 h-14 rounded-full" style={{ background: "var(--bg-elevated)" }} />
                <div className="h-2 w-10 rounded" style={{ background: "var(--bg-elevated)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Composer skeleton — avatar + input row */}
        <div className="rounded-2xl p-4 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full" style={{ background: "var(--bg-elevated)" }} />
            <div className="flex-1 h-9 rounded-xl" style={{ background: "var(--bg-elevated)" }} />
          </div>
        </div>

        {/* Topic chips skeleton */}
        <div className="flex gap-2">
          {[14, 18, 16, 16, 18].map((w, i) => (
            <div key={i} className={`h-8 w-${w} rounded-xl animate-pulse`} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", width: `${w * 4}px` }} />
          ))}
        </div>

        {/* Post card skeletons — header + body + actions */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {/* Header: avatar + name + time */}
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: "var(--bg-elevated)" }} />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3 w-32 rounded" style={{ background: "var(--bg-elevated)" }} />
                <div className="h-2.5 w-20 rounded" style={{ background: "var(--bg-elevated)", opacity: 0.6 }} />
              </div>
            </div>
            {/* Body lines */}
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full rounded" style={{ background: "var(--bg-elevated)" }} />
              <div className="h-3 w-11/12 rounded" style={{ background: "var(--bg-elevated)" }} />
              <div className="h-3 w-3/4 rounded" style={{ background: "var(--bg-elevated)" }} />
            </div>
            {/* Action bar: 4 small pills */}
            <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              {[16, 14, 14, 12].map((w, j) => (
                <div key={j} className="h-6 rounded-lg" style={{ background: "var(--bg-elevated)", width: `${w * 4}px`, opacity: 0.6 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stories */}
      {!tickerFilter && <StoriesBar currentUser={user} />}

      {/* Create post */}
      <CreatePost user={user} onCreated={handlePostCreated} />

      {/* Ticker filter chip OR category filter tabs */}
      {tickerFilter ? (
        <div className="flex items-center justify-between rounded-xl px-3 py-2"
          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <div className="flex items-center gap-2 text-xs">
            <Flame size={13} className="text-orange-400" />
            <span style={{ color: "var(--text-secondary)" }}>Showing analyses for</span>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>${tickerFilter}</span>
          </div>
          <button onClick={clearTickerFilter}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors hover:bg-orange-500/10"
            style={{ color: "#fb923c" }}>
            <X size={11} /> Clear
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSelected([])}
            className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            style={selected.length === 0
              ? { background: "#10b981", color: "#0f1117" }
              : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            All
          </button>
          {TOPICS.map(({ key, label, tint }) => {
            const active = selected.includes(key)
            return (
              <button
                key={key}
                onClick={() => setSelected((prev) =>
                  prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
                )}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                style={active
                  ? { background: tint + "22", color: tint, border: `1px solid ${tint}66` }
                  : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? tint : "var(--text-secondary)" }} />
                {label}
              </button>
            )
          })}
          {selected.length > 0 && (
            <button
              onClick={() => setSelected([])}
              className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Posts */}
      {visible.length === 0 ? (
        <EmptyFeedState
          variant={tickerFilter ? "ticker" : selected.length > 0 ? "topic" : "welcome"}
          tickerFilter={tickerFilter}
          selectedCount={selected.length}
          userName={user.name}
          onClearTopics={() => setSelected([])}
        />
      ) : (
        <>
          {(() => {
            // Interleave: 1 ad after every AD_INTERVAL posts (3 for short feeds, then ~10)
            // Ticker-filtered feeds don't get ads.
            const out: React.ReactNode[] = []
            const adInterval = visible.length < 8 ? 3 : 10
            let adIdx = 0
            visible.forEach((post, i) => {
              out.push(
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  currentUser={user}
                  onDeleted={() => handlePostDeleted(post.id)}
                />
              )
              const isInterval = (i + 1) % adInterval === 0
              if (!tickerFilter && isInterval && ads[adIdx]) {
                out.push(<AdCard key={`ad-${ads[adIdx].id}`} ad={ads[adIdx]} />)
                adIdx += 1
              }
            })
            return out
          })()}

          {/* Infinite scroll sentinel */}
          {(selected.length === 0 || tickerFilter) && (
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Loading more posts…
                </div>
              )}
              {!nextCursor && posts.length > 0 && (
                <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
                  You're all caught up ✓
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyFeedStateProps {
  variant: "welcome" | "topic" | "ticker"
  tickerFilter: string | null
  selectedCount: number
  userName: string
  onClearTopics: () => void
}

function EmptyFeedState({ variant, tickerFilter, selectedCount, userName, onClearTopics }: EmptyFeedStateProps) {
  if (variant === "ticker") {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}
        >
          <Flame size={22} className="text-orange-400" />
        </div>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
          No analyses for ${tickerFilter} yet
        </h3>
        <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
          Be the first to share your take on this ticker.
        </p>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
        >
          <MessageSquarePlus size={13} /> Post the first analysis
        </button>
      </div>
    )
  }

  if (variant === "topic") {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <Compass size={22} className="text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
          Quiet on these {selectedCount === 1 ? "topic" : "topics"}
        </h3>
        <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
          Try different topics, or be the first to post here.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClearTopics}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/5 w-full sm:w-auto justify-center"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            Show all topics
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20 w-full sm:w-auto justify-center"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
          >
            <MessageSquarePlus size={13} /> Post one yourself
          </button>
        </div>
      </div>
    )
  }

  // welcome — first-time user with empty feed
  const firstName = userName.split(" ")[0] || "there"
  return (
    <div
      className="rounded-2xl p-10 text-center relative overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Subtle gradient orb behind the icon */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%)" }}
      />

      <div className="relative">
        <div
          className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
        >
          <Sparkles size={26} className="text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Welcome, {firstName} 👋
        </h3>
        <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Your feed is quiet right now. Follow some traders, ask the AI tutor a question, or share your first post — the community is here to help at every level.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto">
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-emerald-500/30 w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
          >
            <Users size={13} /> Find people <ArrowRight size={11} />
          </Link>
          <Link
            href="/ai-tutor"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/5 w-full sm:w-auto"
            style={{ borderColor: "rgba(99,102,241,0.4)", color: "#a5b4fc", background: "rgba(99,102,241,0.08)" }}
          >
            <BrainCircuit size={13} /> Ask AI tutor
          </Link>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all hover:bg-white/5 w-full sm:w-auto"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <MessageSquarePlus size={13} /> Post first
          </button>
        </div>
      </div>
    </div>
  )
}
