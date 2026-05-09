"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { ImageIcon, Film, Smile, BarChart2, BarChart3, Send, User, X, TrendingUp, TrendingDown, Minus, Loader2, Star } from "lucide-react"
import GifPicker, { PICKER_W, PICKER_H } from "@/components/posts/GifPicker"
import PollComposerDialog from "@/components/polls/PollComposerDialog"
import { yahooToStooq, flagForYahoo } from "@/lib/market"

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default as any })),
  { ssr: false }
)

const TIMEFRAMES = ["1H", "4H", "1D", "1W", "1M"] as const

const CATALYSTS = [
  { key: "technical",   label: "Technical",   emoji: "📈" },
  { key: "fundamental", label: "Fundamental", emoji: "🏛️" },
  { key: "news",        label: "News",        emoji: "📰" },
  { key: "macro",       label: "Macro",       emoji: "🌐" },
  { key: "sentiment",   label: "Sentiment",   emoji: "💬" },
] as const

const POSITIONS = [
  { key: "holding",   label: "Holding",      emoji: "💼", color: "#10b981" },
  { key: "watching",  label: "Watching",     emoji: "👀", color: "#60a5fa" },
  { key: "entered",   label: "Just entered", emoji: "➡️", color: "#a78bfa" },
  { key: "exited",    label: "Just exited",  emoji: "⬅️", color: "#fb923c" },
  { key: "paper",     label: "Paper",        emoji: "📝", color: "#9ca3af" },
] as const

interface AssetResult {
  id: string; symbol: string; name: string
  source: "crypto" | "yahoo"; type?: string
  cgId?: string; yahooSymbol?: string
}

type TopicKey = "crypto" | "stocks" | "forex" | "options"
type AssetTopic = "crypto" | "stocks" | "forex"

function inferTopic(asset: AssetResult): AssetTopic {
  if (asset.source === "crypto") return "crypto"
  const t = (asset.type ?? "").toLowerCase()
  if (t === "currency" || t === "forex") return "forex"
  return "stocks"
}

function topicLabel(t: TopicKey): string {
  return t === "crypto" ? "Crypto" : t === "stocks" ? "Stocks" : t === "forex" ? "Forex" : "Options"
}


function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 })
  if (p >= 1)    return p.toFixed(2)
  return p.toFixed(6)
}

interface AnalysisData {
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  timeframe: string
  entry: string
  target: string
  conviction: number
  catalyst: string
  position: string
  logoUrl?: string | null
}

interface PostAuthor {
  id: string; name: string; username: string; image?: string | null; isPremium: boolean
}
interface CreatedPost {
  id: string; content: string; imageUrl?: string | null; analysis?: any
  createdAt: string; author: PostAuthor
  likes: { userId: string; reaction: string }[]; _count: { comments: number; likes: number }
}
interface CreatePostProps {
  user: PostAuthor
  onCreated?: (post: CreatedPost) => void
}

async function resizePostImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 20 * 1024 * 1024) { reject(new Error("Max 20MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.88))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const BLANK_ANALYSIS: AnalysisData = {
  ticker: "", direction: "bullish", timeframe: "1D",
  entry: "", target: "",
  conviction: 3, catalyst: "", position: "",
}

interface LivePrice {
  price: number
  change: number
  up: boolean
  currency?: string
  usdPrice?: number
}

// Rotating composer prompts. One is picked per mount (so the same user sees
// the same prompt for the duration of their session). Keeps the composer
// feeling alive without distracting mid-typing changes.
const COMPOSER_PROMPTS = [
  "What's happening in the markets?",
  "Share a chart, a take, or a question…",
  "What're you watching today?",
  "Ask the community anything…",
  "Got a thesis? Share it.",
  "What did the market teach you today?",
  "Spotted something worth talking about?",
  "Post your trade idea — bull or bear?",
]

export default function CreatePost({ user, onCreated }: CreatePostProps) {
  const [content, setContent]           = useState("")
  const [imageData, setImageData]       = useState<string | null>(null)
  const [videoData, setVideoData]       = useState<{ dataUrl: string; mime: string } | null>(null)
  const [showGif, setShowGif]           = useState(false)
  const [showEmoji, setShowEmoji]       = useState(false)
  const [showPollDialog, setShowPollDialog] = useState(false)
  const [poll, setPoll]                 = useState<{ pollId: string; question: string } | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis]         = useState<AnalysisData>(BLANK_ANALYSIS)
  const [topics, setTopics]             = useState<string[]>([])
  const [loading, setLoading]           = useState(false)
  const [focused, setFocused]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [emojiData, setEmojiData]       = useState<any>(null)
  const [pickerPos, setPickerPos]       = useState<{ top: number; left: number } | null>(null)
  // Pick a placeholder prompt once per mount so it doesn't change while typing.
  const [placeholder] = useState(() => COMPOSER_PROMPTS[Math.floor(Math.random() * COMPOSER_PROMPTS.length)])

  // Ticker search
  const [tickerQuery, setTickerQuery]   = useState("")
  const [tickerResults, setTickerResults] = useState<AssetResult[]>([])
  const [tickerLoading, setTickerLoading] = useState(false)
  const [showTickerDrop, setShowTickerDrop] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetResult | null>(null)
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null)
  const tickerDropRef = useRef<HTMLDivElement>(null)
  const tickerInputRef = useRef<HTMLInputElement>(null)

  const fileRef     = useRef<HTMLInputElement>(null)
  const videoRef    = useRef<HTMLInputElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const gifBtnRef   = useRef<HTMLButtonElement>(null)
  const emojiRef    = useRef<HTMLDivElement>(null)
  const gifRef      = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { import("@emoji-mart/data").then((m) => setEmojiData(m.default)) }, [])

  // Debounced ticker search
  useEffect(() => {
    const q = tickerQuery.trim()
    if (q.length < 1) { setTickerResults([]); setShowTickerDrop(false); return }
    setTickerLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
        if (res.ok) { setTickerResults(await res.json()); setShowTickerDrop(true) }
      } catch {}
      setTickerLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [tickerQuery])

  // Close ticker dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!tickerDropRef.current?.contains(e.target as Node) &&
          !tickerInputRef.current?.contains(e.target as Node)) {
        setShowTickerDrop(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const fetchLivePrice = useCallback(async (asset: AssetResult): Promise<LivePrice | null> => {
    const params = asset.source === "crypto"
      ? `crypto=${asset.cgId ?? asset.id}`
      : `stooq=${yahooToStooq(asset.yahooSymbol ?? asset.id)}`
    try {
      const res = await fetch(`/api/market/prices?${params}`)
      if (!res.ok) return null
      const data: { price: number; change: number; up: boolean; currency?: string; usdPrice?: number }[] = await res.json()
      if (!data[0]?.price) return null
      return {
        price: data[0].price, change: data[0].change ?? 0, up: !!data[0].up,
        currency: data[0].currency, usdPrice: data[0].usdPrice,
      }
    } catch {
      return null
    }
  }, [])

  const selectAsset = useCallback(async (asset: AssetResult) => {
    setAnalysis((a) => ({ ...a, ticker: asset.symbol, logoUrl: null }))
    setTickerQuery(asset.symbol)
    setShowTickerDrop(false)
    setSelectedAsset(asset)
    setLivePrice(null)
    setPriceLoading(true)
    // Auto-tag: replace any conflicting asset-class topics with the inferred one,
    // but keep "options" if the user already selected it.
    const inferred = inferTopic(asset)
    setTopics((prev) => {
      const keepOptions = prev.includes("options")
      return keepOptions ? [inferred, "options"] : [inferred]
    })
    // Fetch logo in parallel with live price (don't block price load)
    const logoSrc = asset.source === "crypto"
      ? `/api/market/logo?source=crypto&id=${encodeURIComponent(asset.cgId ?? asset.id)}`
      : `/api/market/logo?source=yahoo&id=${encodeURIComponent(asset.yahooSymbol ?? asset.id)}`
    fetch(logoSrc)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.url) setAnalysis((a) => ({ ...a, logoUrl: d.url })) })
      .catch(() => {})
    const lp = await fetchLivePrice(asset)
    if (lp) {
      setLivePrice(lp)
      setAnalysis((a) => (a.entry ? a : { ...a, entry: fmtPrice(lp.price) }))
    }
    setPriceLoading(false)
  }, [fetchLivePrice])

  // Refresh live price every 15s while an asset is selected
  useEffect(() => {
    if (!selectedAsset) return
    const tick = async () => {
      const lp = await fetchLivePrice(selectedAsset)
      if (lp) setLivePrice(lp)
    }
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [selectedAsset, fetchLivePrice])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!emojiBtnRef.current?.contains(t) && !emojiRef.current?.contains(t)) setShowEmoji(false)
      if (!gifBtnRef.current?.contains(t) && !gifRef.current?.contains(t)) setShowGif(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  function calcPos(ref: React.RefObject<HTMLButtonElement | null>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return null
    const top = rect.top - PICKER_H - 10
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PICKER_W - 8))
    return { top: top < 8 ? rect.bottom + 8 : top, left }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImageData(await resizePostImage(file)); setError(null) }
    catch (err: any) { setError(err.message) }
    e.target.value = ""
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setError("Video must be under 20 MB")
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setVideoData({ dataUrl, mime: file.type })
    }
    reader.readAsDataURL(file)
  }

  const hasAnalysis = showAnalysis && analysis.ticker.trim().length > 0
  const canSubmit   = (content.trim().length > 0 || !!poll) && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true); setError(null)
    try {
      const body: Record<string, any> = { content: content.trim() }
      if (imageData) body.imageUrl = imageData
      if (videoData) { body.videoUrl = videoData.dataUrl; body.videoMime = videoData.mime }
      if (poll) body.pollId = poll.pollId
      if (topics.length > 0) body.topics = topics
      if (hasAnalysis) {
        // Auto-snapshot entry from live price if user didn't fill it.
        const entryFinal = analysis.entry?.trim() || (livePrice ? fmtPrice(livePrice.price) : "")
        // Snapshot priceKey + priceSource so the server can look up current price
        // later for outcome tracking. Only set when picked from search.
        const priceKey = selectedAsset
          ? (selectedAsset.source === "crypto"
              ? (selectedAsset.cgId ?? selectedAsset.id)
              : yahooToStooq(selectedAsset.yahooSymbol ?? selectedAsset.id))
          : null
        const priceSource = selectedAsset
          ? (selectedAsset.source === "crypto" ? "crypto" : "stooq")
          : null
        body.analysis = {
          ticker:    analysis.ticker.trim().toUpperCase(),
          direction: analysis.direction,
          timeframe: analysis.timeframe,
          ...(entryFinal       ? { entry:    entryFinal      } : {}),
          ...(analysis.target  ? { target:   analysis.target } : {}),
          conviction: analysis.conviction,
          ...(analysis.catalyst ? { catalyst:    analysis.catalyst } : {}),
          ...(analysis.position ? { position:    analysis.position } : {}),
          ...(analysis.logoUrl  ? { logoUrl:     analysis.logoUrl  } : {}),
          ...(priceKey          ? { priceKey,    priceSource       } : {}),
        }
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        onCreated?.({ ...data, likes: [] })
        setContent(""); setImageData(null); setVideoData(null)
        setPoll(null)
        setShowAnalysis(false); setAnalysis(BLANK_ANALYSIS)
        setTickerQuery(""); setTickerResults([])
        setSelectedAsset(null); setLivePrice(null)
        setTopics([])
        setFocused(false)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Failed to post")
      }
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  return (
    <>
      <div
        className="rounded-2xl p-4 transition-all"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: focused ? "0 0 0 2px rgba(16,185,129,0.15)" : "none",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              {user.image
                ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                : <User size={18} className="text-emerald-400" />}
            </div>

            {/* Text input */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                rows={focused || content ? 3 : 1}
                maxLength={1000}
                className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Image preview */}
          {imageData && (
            <div className="relative mt-3">
              <img src={imageData} alt="Preview" className="rounded-xl w-full max-h-64 object-cover" />
              <button type="button" onClick={() => setImageData(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Video preview */}
          {videoData && (
            <div className="relative mt-3">
              <video src={videoData.dataUrl} controls playsInline
                className="rounded-xl w-full max-h-64 object-cover" />
              <button type="button" onClick={() => setVideoData(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors">
                <X size={13} />
              </button>
            </div>
          )}

          {/* ── Analysis form ── */}
          {showAnalysis && (
            <div className="mt-3 rounded-xl p-3 space-y-3" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  <BarChart2 size={13} className="text-emerald-400" /> Trade Idea
                </span>
                <button type="button" onClick={() => { setShowAnalysis(false); setAnalysis(BLANK_ANALYSIS); setTickerQuery(""); setTickerResults([]); setSelectedAsset(null); setLivePrice(null) }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ color: "var(--text-secondary)" }}>
                  <X size={12} />
                </button>
              </div>

              {/* Ticker search + Direction */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <input
                      ref={tickerInputRef}
                      value={tickerQuery}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase()
                        setTickerQuery(v)
                        setAnalysis((a) => ({ ...a, ticker: v }))
                        if (selectedAsset && v !== selectedAsset.symbol) {
                          setSelectedAsset(null)
                          setLivePrice(null)
                        }
                      }}
                      onFocus={() => tickerQuery.length > 0 && setShowTickerDrop(true)}
                      placeholder="Search asset…"
                      maxLength={20}
                      className="w-32 text-sm font-bold bg-transparent outline-none uppercase"
                      style={{ color: "var(--text-primary)" }}
                    />
                    {tickerLoading && <Loader2 size={12} className="text-emerald-400 animate-spin flex-shrink-0" />}
                    {priceLoading && <Loader2 size={12} className="text-yellow-400 animate-spin flex-shrink-0" />}
                  </div>

                  {/* Dropdown */}
                  {showTickerDrop && tickerResults.length > 0 && (
                    <div ref={tickerDropRef}
                      className="absolute top-full left-0 mt-1 w-64 rounded-xl shadow-2xl overflow-hidden z-50"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      {tickerResults.map((r) => {
                        const flag = r.source === "crypto" ? "🪙" : flagForYahoo(r.yahooSymbol ?? r.id, r.type)
                        return (
                          <button key={r.id} type="button"
                            onClick={() => selectAsset(r)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-base)] transition-colors">
                            <span className="text-base flex-shrink-0" aria-hidden="true">{flag}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.symbol}</p>
                              <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{r.name}</p>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                              style={{ background: r.source === "crypto" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                                       color: r.source === "crypto" ? "#10b981" : "#60a5fa" }}>
                              {r.type ?? r.source}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setAnalysis((a) => ({ ...a, direction: "bullish" }))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={analysis.direction === "bullish"
                      ? { background: "#10b98122", color: "#10b981", border: "1px solid #10b98155" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    <TrendingUp size={12} /> Bullish
                  </button>
                  <button type="button" onClick={() => setAnalysis((a) => ({ ...a, direction: "bearish" }))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={analysis.direction === "bearish"
                      ? { background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    <TrendingDown size={12} /> Bearish
                  </button>
                  <button type="button" onClick={() => setAnalysis((a) => ({ ...a, direction: "neutral" }))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={analysis.direction === "neutral"
                      ? { background: "#eab30822", color: "#eab308", border: "1px solid #eab30855" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    <Minus size={12} /> Neutral
                  </button>
                </div>
              </div>

              {/* Live price badge */}
              {(selectedAsset || priceLoading) && (
                <div className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                      Live
                    </span>
                    {analysis.logoUrl && (
                      <img
                        src={analysis.logoUrl}
                        alt=""
                        className="w-5 h-5 rounded object-contain flex-shrink-0"
                        style={{ background: "white", padding: 1 }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                      />
                    )}
                    <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {selectedAsset?.symbol ?? analysis.ticker}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {livePrice ? (() => {
                      const cur = (livePrice.currency ?? "USD").toUpperCase()
                      const isUsd = cur === "USD"
                      const showUsd = !isUsd && livePrice.usdPrice != null
                      return (
                        <>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                {isUsd ? "$" : ""}{fmtPrice(livePrice.price)}
                              </span>
                              {!isUsd && (
                                <span className="text-[9px] font-semibold px-1 py-0.5 rounded"
                                  style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}>
                                  {livePrice.currency}
                                </span>
                              )}
                            </div>
                            {showUsd && (
                              <p className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                ≈ ${fmtPrice(livePrice.usdPrice!)} USD
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-semibold tabular-nums"
                            style={{ color: livePrice.up ? "#10b981" : "#ef4444" }}>
                            {livePrice.up ? "▲" : "▼"} {Math.abs(livePrice.change).toFixed(2)}%
                          </span>
                        </>
                      )
                    })() : (
                      <Loader2 size={12} className="text-emerald-400 animate-spin" />
                    )}
                  </div>
                </div>
              )}

              {/* Timeframe */}
              <div className="flex gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button key={tf} type="button"
                    onClick={() => setAnalysis((a) => ({ ...a, timeframe: tf }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={analysis.timeframe === tf
                      ? { background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }
                      : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {tf}
                  </button>
                ))}
              </div>

              {/* Price levels — placeholders derived from live price + direction */}
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const lp = livePrice?.price ?? null
                  const dir = analysis.direction
                  const targetMult = dir === "bullish" ? 1.10 : dir === "bearish" ? 0.90 : 1.0
                  const entryPh  = lp != null ? fmtPrice(lp) : "—"
                  const targetPh = lp != null ? fmtPrice(lp * targetMult) : "—"
                  return [
                    { key: "entry",  label: "Entry",     color: "var(--text-secondary)", placeholder: entryPh },
                    { key: "target", label: "Target 🎯", color: "#10b981",               placeholder: targetPh },
                  ].map(({ key, label, color, placeholder }) => (
                    <div key={key}>
                      <p className="text-[10px] mb-1 font-medium" style={{ color }}>{label}</p>
                      <input
                        value={(analysis as any)[key]}
                        onChange={(e) => setAnalysis((a) => ({ ...a, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  ))
                })()}
              </div>
              {livePrice && (
                <p className="text-[10px] -mt-1" style={{ color: "var(--text-secondary)" }}>
                  Hints based on live ${selectedAsset?.symbol ?? analysis.ticker} price ·{" "}
                  {analysis.direction === "bullish" ? "+10% target"
                    : analysis.direction === "bearish" ? "−10% target"
                    : "flat target"}
                </p>
              )}

              {/* Conviction */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  Conviction
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= analysis.conviction
                    return (
                      <button key={n} type="button"
                        onClick={() => setAnalysis((a) => ({ ...a, conviction: n }))}
                        className="p-0.5 transition-transform hover:scale-110"
                        title={`${n}/5`}>
                        <Star size={16}
                          fill={active ? "#eab308" : "transparent"}
                          stroke={active ? "#eab308" : "var(--text-secondary)"}
                          strokeWidth={2} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Catalyst */}
              <div>
                <p className="text-[10px] mb-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
                  Catalyst <span className="opacity-50">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATALYSTS.map((c) => {
                    const active = analysis.catalyst === c.key
                    return (
                      <button key={c.key} type="button"
                        onClick={() => setAnalysis((a) => ({ ...a, catalyst: active ? "" : c.key }))}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={active
                          ? { background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }
                          : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        <span>{c.emoji}</span> {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Position */}
              <div>
                <p className="text-[10px] mb-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
                  Position <span className="opacity-50">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POSITIONS.map((p) => {
                    const active = analysis.position === p.key
                    return (
                      <button key={p.key} type="button"
                        onClick={() => setAnalysis((a) => ({ ...a, position: active ? "" : p.key }))}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={active
                          ? { background: p.color + "22", color: p.color, border: `1px solid ${p.color}55` }
                          : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                        <span>{p.emoji}</span> {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}

          {/* Topic chips */}
          {(focused || content || imageData || videoData || showAnalysis) && (() => {
            const lockedTopic: AssetTopic | null = selectedAsset ? inferTopic(selectedAsset) : null
            return (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)" }}>Topics</span>
                  {(["crypto", "stocks", "forex", "options"] as const).map((t) => {
                    const active = topics.includes(t)
                    const tint =
                      t === "crypto"  ? "#f59e0b"
                      : t === "stocks" ? "#60a5fa"
                      : t === "forex"  ? "#a78bfa"
                      : "#10b981"
                    const isLocked = lockedTopic !== null && t === lockedTopic
                    const isBlocked = lockedTopic !== null && t !== lockedTopic && t !== "options"
                    const title = isLocked
                      ? `Locked — your $${selectedAsset?.symbol} analysis is in ${topicLabel(t)}`
                      : isBlocked
                      ? `Disabled — your $${selectedAsset?.symbol} analysis is in ${topicLabel(lockedTopic!)}, not ${topicLabel(t)}`
                      : undefined
                    return (
                      <button key={t} type="button"
                        disabled={isLocked || isBlocked}
                        title={title}
                        onClick={() => setTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                        style={
                          isBlocked
                            ? { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: 0.35, cursor: "not-allowed" }
                          : active
                            ? { background: tint + "22", color: tint, border: `1px solid ${tint}66`, cursor: isLocked ? "default" : "pointer" }
                            : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
                        }>
                        {isLocked && <span aria-hidden="true">🔒</span>}
                        {topicLabel(t)}
                      </button>
                    )
                  })}
                </div>
                {lockedTopic && (
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--text-secondary)" }}>
                    Topic auto-set from your <span className="font-semibold" style={{ color: "var(--text-primary)" }}>${selectedAsset?.symbol}</span> analysis. Pick a different ticker to change it.
                  </p>
                )}
              </div>
            )
          })()}

          {/* Poll preview chip */}
          {poll && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <BarChart3 size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-medium truncate flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
                Poll · {poll.question}
              </span>
              <button type="button" onClick={() => setPoll(null)}
                className="text-[var(--text-secondary)] hover:text-rose-400 flex-shrink-0"
                title="Remove poll" aria-label="Remove poll">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Actions bar */}
          {(focused || content || imageData || videoData || poll || showAnalysis) && (
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-0.5">

                {/* Photo */}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                  style={{ color: imageData ? "#10b981" : "var(--text-secondary)" }}
                  title="Upload photo">
                  <ImageIcon size={15} /> <span className="hidden sm:inline">Photo</span>
                </button>

                {/* Video */}
                <button type="button" onClick={() => videoRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                  style={{ color: videoData ? "#10b981" : "var(--text-secondary)" }}
                  title="Upload video (≤20 MB, ~30 sec)">
                  <Film size={15} /> <span className="hidden sm:inline">Video</span>
                </button>

                {/* GIF */}
                <div ref={gifRef}>
                  <button ref={gifBtnRef} type="button"
                    onClick={() => { const next = !showGif; if (next) setPickerPos(calcPos(gifBtnRef)); setShowGif(next); setShowEmoji(false) }}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                    style={{ color: showGif ? "#10b981" : "var(--text-secondary)" }}
                    title="Add GIF">
                    <Film size={15} /> <span className="hidden sm:inline">GIF</span>
                  </button>
                </div>

                {/* Emoji */}
                <div ref={emojiRef}>
                  <button ref={emojiBtnRef} type="button"
                    onClick={() => { const next = !showEmoji; if (next) setPickerPos(calcPos(emojiBtnRef)); setShowEmoji(next); setShowGif(false) }}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                    style={{ color: showEmoji ? "#10b981" : "var(--text-secondary)" }}
                    title="Emoji">
                    <Smile size={15} /> <span className="hidden sm:inline">Emoji</span>
                  </button>
                </div>

                {/* Analysis */}
                <button type="button"
                  onClick={() => setShowAnalysis((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                  style={{ color: showAnalysis ? "#10b981" : "var(--text-secondary)" }}
                  title="Share a trade idea">
                  <BarChart2 size={15} /> <span className="hidden sm:inline">Trade idea</span>
                </button>

                {/* Poll */}
                <button type="button"
                  onClick={() => setShowPollDialog(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                  style={{ color: poll ? "#10b981" : "var(--text-secondary)" }}
                  title="Add a poll">
                  <BarChart3 size={15} /> <span className="hidden sm:inline">Poll</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: content.length > 900 ? "#f59e0b" : "var(--text-secondary)" }}>
                  {content.length}/1000
                </span>
                <button type="submit" disabled={!canSubmit}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#10b981", color: "#0f1117" }}>
                  <Send size={14} />
                  {loading ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          )}
        </form>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
      </div>

      {/* Fixed-position pickers */}
      {showEmoji && emojiData && pickerPos && (
        <div ref={emojiRef} style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
          <div className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: PICKER_W, height: PICKER_H, border: "1px solid var(--border)" }}>
            <EmojiPicker data={emojiData} theme="dark" previewPosition="none" skinTonePosition="none"
              maxFrequentRows={1} perLine={9}
              style={{ width: "100%", height: "100%", border: "none" } as any}
              {...{ onEmojiSelect: (emoji: any) => {
                setContent((c) => c + emoji.native)
                textareaRef.current?.focus()
              } } as any}
            />
          </div>
        </div>
      )}

      {showGif && pickerPos && (
        <div ref={gifRef} style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}>
          <GifPicker
            onSelect={(url) => { setImageData(url); setShowGif(false) }}
            onClose={() => setShowGif(false)}
          />
        </div>
      )}

      {showPollDialog && (
        <PollComposerDialog
          onCreate={(pollId, question) => { setPoll({ pollId, question }); setShowPollDialog(false) }}
          onClose={() => setShowPollDialog(false)}
        />
      )}
    </>
  )
}
