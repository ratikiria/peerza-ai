"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { MessageCircle, Share2, Trash2, User, TrendingUp, TrendingDown, Minus, Star, Repeat2, Briefcase, Zap, Shuffle, Send, Pin, PinOff, Pencil, X, Check } from "lucide-react"
import ShareModal, { type SharePayload } from "@/components/shared/ShareModal"
import ProBadge from "@/components/shared/ProBadge"
import PollCard from "@/components/polls/PollCard"

const CATALYST_META: Record<string, { label: string; emoji: string }> = {
  technical:   { label: "Technical",   emoji: "📈" },
  fundamental: { label: "Fundamental", emoji: "🏛️" },
  news:        { label: "News",        emoji: "📰" },
  macro:       { label: "Macro",       emoji: "🌐" },
  sentiment:   { label: "Sentiment",   emoji: "💬" },
}

const POSITION_META: Record<string, { label: string; emoji: string; color: string }> = {
  holding:  { label: "Holding",      emoji: "💼", color: "#10b981" },
  watching: { label: "Watching",     emoji: "👀", color: "#60a5fa" },
  entered:  { label: "Just entered", emoji: "➡️", color: "#a78bfa" },
  exited:   { label: "Just exited",  emoji: "⬅️", color: "#fb923c" },
  paper:    { label: "Paper",        emoji: "📝", color: "#9ca3af" },
}
import { formatRelativeTime } from "@/lib/utils"
import InlineComments from "@/components/posts/InlineComments"

const REACTIONS = [
  { emoji: "👍", label: "Like"  },
  { emoji: "❤️",  label: "Love"  },
  { emoji: "😂", label: "Haha"  },
  { emoji: "😮", label: "Wow"   },
  { emoji: "😢", label: "Sad"   },
  { emoji: "😡", label: "Angry" },
  { emoji: "🔥", label: "Fire"  },
]

interface PostAnalysis {
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  timeframe: string
  entry?: string
  target?: string
  conviction?: number
  catalyst?: string
  position?: string
}

interface OriginalPost {
  id: string
  content: string
  imageUrl?: string | null
  analysis?: PostAnalysis | null
  createdAt: string
  author: { id: string; name: string; username: string; image?: string | null; isPremium: boolean; isPro?: boolean }
}

interface PostCardProps {
  post: {
    id: string
    content: string
    imageUrl?: string | null
    videoUrl?: string | null
    videoMime?: string | null
    analysis?: PostAnalysis | null
    createdAt: string
    author: { id: string; name: string; username: string; image?: string | null; isPremium: boolean; isPro?: boolean }
    likes: { userId: string; reaction: string }[]
    _count: { comments: number; likes: number }
    originalPost?: OriginalPost | null
    outcomeStatus?: "OPEN" | "TARGET_HIT"
    outcomeAt?: string | null
    outcomeReturnPct?: number | null
    pinned?: boolean
    editedAt?: string | null
    poll?: {
      id: string
      question: string
      options: string[]
      authorId: string
      votes: { userId: string; optionIndex: number }[]
    } | null
  }
  currentUserId: string
  currentUser?: { id: string; name: string; username: string; image?: string | null }
  onDeleted?: () => void
  showPinControl?: boolean
}

const CHALLENGE_TOKEN_RE = /^\[challenge:([a-z0-9]+)\]\s*\n?/i

interface ChallengeMeta {
  id: string; name: string
  style?: "INVESTMENT" | "TRADING" | "MIXED"
  status?: "UPCOMING" | "ACTIVE" | "ENDED"
  participantCount?: number
}

export default function PostCard({ post, currentUserId, currentUser, onDeleted, showPinControl }: PostCardProps) {
  const myLike      = post.likes.find((l) => l.userId === currentUserId)
  const [liked, setLiked]           = useState(!!myLike)
  const [reaction, setReaction]     = useState<string | null>(myLike?.reaction ?? null)
  const [likeCount, setLikeCount]   = useState(post._count.likes)
  const [pinned, setPinned]         = useState(!!post.pinned)
  const [pinning, setPinning]       = useState(false)
  const [commentCount, setCC]       = useState(post._count.comments)
  const [pending, setPending]       = useState(false)
  const [deleted, setDeleted]       = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content)
  const [editedAt, setEditedAt] = useState<string | null>(post.editedAt ?? null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [contentOverride, setContentOverride] = useState<string | null>(null)
  const hoverTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Challenge token detection (for posts shared from a challenge).
  // contentOverride wins after a successful in-place edit so the bubble updates without refetch.
  const liveContent    = contentOverride ?? post.content
  const challengeMatch = liveContent.match(CHALLENGE_TOKEN_RE)
  const challengeId    = challengeMatch?.[1] ?? null
  const displayContent = challengeMatch ? liveContent.replace(CHALLENGE_TOKEN_RE, "") : liveContent
  const [challengeMeta, setChallengeMeta] = useState<ChallengeMeta | null>(null)

  useEffect(() => {
    if (!challengeId) return
    let cancelled = false
    fetch(`/api/challenges/${challengeId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const c = d?.challenge ?? d
        if (cancelled || !c) return
        setChallengeMeta({
          id: c.id, name: c.name, style: c.style, status: c.status,
          participantCount: c._count?.participants,
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [challengeId])

  if (deleted) return null

  const isOwn     = currentUserId === post.author.id
  const commenter = currentUser ?? { id: currentUserId, name: "You", username: "", image: null }

  // Top 3 reaction emojis for display
  const reactionCounts: Record<string, number> = {}
  post.likes.forEach((l) => { reactionCounts[l.reaction] = (reactionCounts[l.reaction] ?? 0) + 1 })
  const topReactions = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e)

  async function doReaction(emoji: string) {
    if (pending) return
    setShowReactions(false)
    setPending(true)

    const wasLiked    = liked
    const wasReaction = reaction

    if (liked && reaction === emoji) {
      setLiked(false); setReaction(null); setLikeCount((v) => v - 1)
    } else {
      setLiked(true); setReaction(emoji)
      setLikeCount((v) => wasLiked ? v : v + 1)
    }

    await fetch(`/api/posts/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: emoji }),
    })
    setPending(false)
  }

  function handleLikeMouseEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setShowReactions(true), 350)
  }
  function handleLikeMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setShowReactions(false), 220)
  }

  function handleShare() { setShareOpen(true) }

  function handleReplyPrivately() {
    if (post.author.id === currentUserId) return
    const label = post.analysis?.ticker
      ? `$${post.analysis.ticker} · ${(displayContent || post.content).slice(0, 30)}`
      : (displayContent || post.content).slice(0, 50) || "Post"
    window.dispatchEvent(new CustomEvent("peerza:reply-privately", {
      detail: {
        partnerId: post.author.id,
        post: { postId: post.id, label },
      },
    }))
  }

  const sharePayload: SharePayload = {
    kind: "post",
    post: {
      id: post.id,
      content: displayContent || post.content,
      imageUrl: post.imageUrl ?? null,
      author: post.author,
      analysis: post.analysis ? { ticker: post.analysis.ticker, direction: post.analysis.direction } : null,
    },
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post?")) return
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
    if (res.ok) { setDeleted(true); onDeleted?.() }
  }

  async function handleSaveEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === (contentOverride ?? post.content) || savingEdit) {
      setEditing(false)
      setEditError(null)
      return
    }
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })
      if (res.ok) {
        const data = await res.json()
        setContentOverride(data.content)
        setEditedAt(data.editedAt)
        setEditing(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setEditError(data?.error || `Save failed (${res.status})`)
      }
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Network error — couldn't reach server")
    } finally { setSavingEdit(false) }
  }

  async function togglePin() {
    if (pinning) return
    setPinning(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/pin`, { method: "POST" })
      if (res.ok) {
        const d = await res.json()
        setPinned(!!d.pinned)
      } else {
        const d = await res.json().catch(() => ({}))
        if (d?.error) alert(d.error)
      }
    } finally { setPinning(false) }
  }

  return (
    <article
      className="rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 hover:border-emerald-500/20"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/profile/${post.author.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(16,185,129,0.15)" }}>
            {post.author.image
              ? <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
              : <User size={18} className="text-emerald-400" />}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${post.author.username}`}
              className="text-sm font-semibold hover:text-emerald-400 transition-colors"
              style={{ color: "var(--text-primary)" }}>
              {post.author.name}
            </Link>
            {post.author.isPro && <ProBadge size="sm" />}
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>@{post.author.username}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {formatRelativeTime(post.createdAt)}
            </span>
            {editedAt && (
              <span className="text-xs italic" style={{ color: "var(--text-secondary)" }} title={`Edited ${formatRelativeTime(editedAt)}`}>
                (edited)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {pinned && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
              <Pin size={10} /> Pinned
            </span>
          )}
          {isOwn && showPinControl && (
            <button onClick={togglePin} disabled={pinning}
              className="transition-colors p-1 rounded-lg hover:bg-emerald-400/10 disabled:opacity-50"
              style={{ color: pinned ? "#10b981" : "var(--text-secondary)" }}
              title={pinned ? "Unpin" : "Pin to profile"}>
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
          {isOwn && !editing && (
            <button onClick={() => { setEditText(liveContent); setEditing(true) }}
              className="hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-emerald-400/10"
              style={{ color: "var(--text-secondary)" }}
              title="Edit">
              <Pencil size={14} />
            </button>
          )}
          {isOwn && (
            <button onClick={handleDelete}
              className="hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-400/10"
              style={{ color: "var(--text-secondary)" }}
              title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Repost badge */}
      {post.originalPost && (
        <div className="px-4 -mt-1 mb-1.5 flex items-center gap-1.5">
          <Repeat2 size={12} className="text-emerald-400" />
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Reposted from{" "}
            <Link href={`/profile/${post.originalPost.author.username}`} className="hover:text-emerald-400">
              @{post.originalPost.author.username}
            </Link>
          </span>
        </div>
      )}

      {/* Content — inline edit mode for owner, otherwise read-only (skip if pure repost with no comment) */}
      {editing ? (
        <div className="px-4 pb-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={Math.min(8, Math.max(2, editText.split("\n").length + 1))}
            maxLength={1000}
            autoFocus
            className="w-full text-sm leading-relaxed rounded-xl px-3 py-2 outline-none resize-none"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {editError && (
            <p className="text-[11px] font-medium px-1" style={{ color: "#ef4444" }}>
              {editError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] mr-auto" style={{ color: editText.length > 900 ? "#f59e0b" : "var(--text-secondary)" }}>
              {editText.length}/1000
            </span>
            <button onClick={() => { setEditing(false); setEditText(liveContent); setEditError(null) }}
              disabled={savingEdit}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}>
              <X size={12} /> Cancel
            </button>
            <button onClick={handleSaveEdit}
              disabled={savingEdit || !editText.trim()}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg disabled:opacity-40"
              style={{ background: "#10b981", color: "#0f1117" }}>
              <Check size={12} /> {savingEdit ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : displayContent.trim() ? (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--text-primary)" }}>
            {displayContent}
          </p>
        </div>
      ) : null}

      {/* Image */}
      {post.imageUrl && (
        <div className="px-4 pb-3">
          <img src={post.imageUrl} alt="Post" className="rounded-xl w-full max-h-96 object-cover" />
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="px-4 pb-3">
          <video
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="rounded-xl w-full max-h-[480px] bg-black"
          />
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <div className="px-4 pb-3">
          <PollCard poll={post.poll} currentUserId={currentUserId} isMe={false} />
        </div>
      )}

      {/* Embedded original post (for reposts) */}
      {post.originalPost && (
        <div className="px-4 pb-3">
          <Link href={`/posts/${post.originalPost.id}`}
            className="block rounded-xl p-3 transition-colors hover:bg-[var(--bg-base)]"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)" }}>
                {post.originalPost.author.image
                  ? <img src={post.originalPost.author.image} alt={post.originalPost.author.name} className="w-full h-full object-cover" />
                  : <User size={11} className="text-emerald-400" />}
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {post.originalPost.author.name}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                @{post.originalPost.author.username}
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {formatRelativeTime(post.originalPost.createdAt)}
              </span>
            </div>
            <p className="text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {post.originalPost.content.replace(CHALLENGE_TOKEN_RE, "").trim()}
            </p>
            {post.originalPost.imageUrl && (
              <img src={post.originalPost.imageUrl} alt="" className="rounded-lg w-full max-h-48 object-cover mt-2" />
            )}
            {post.originalPost.analysis?.ticker && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>
                  ${post.originalPost.analysis.ticker}
                </span>
                {post.originalPost.analysis.direction === "bullish" ? <TrendingUp size={10} className="text-emerald-400" />
                  : post.originalPost.analysis.direction === "bearish" ? <TrendingDown size={10} className="text-rose-400" />
                  : <Minus size={10} className="text-yellow-400" />}
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Embedded challenge card (for posts shared from a challenge) */}
      {challengeMeta && (
        <div className="px-4 pb-3">
          <Link href={`/investments/${challengeMeta.id}`}
            className="block rounded-xl p-3 transition-colors hover:bg-[var(--bg-base)]"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={(() => {
                  const c = challengeMeta.style === "TRADING" ? "#fb923c" : challengeMeta.style === "INVESTMENT" ? "#60a5fa" : "#10b981"
                  return { background: c + "22", color: c }
                })()}>
                {challengeMeta.style === "TRADING" ? <Zap size={15} /> : challengeMeta.style === "INVESTMENT" ? <Briefcase size={15} /> : <Shuffle size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {challengeMeta.name}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {challengeMeta.style ?? "Challenge"} · {challengeMeta.status ?? ""}
                  {challengeMeta.participantCount != null ? ` · ${challengeMeta.participantCount} participants` : ""}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Analysis card */}
      {post.analysis && (() => {
        const a = post.analysis!
        const isBull = a.direction === "bullish"
        const isBear = a.direction === "bearish"
        const accentColor = isBull ? "#10b981" : isBear ? "#ef4444" : "#eab308"
        const DirIcon = isBull ? TrendingUp : isBear ? TrendingDown : Minus
        const targetHit = post.outcomeStatus === "TARGET_HIT"
        const outcomePct = post.outcomeReturnPct ?? null
        return (
          <div className="px-4 pb-3">
            <div className="rounded-xl p-3" style={{ background: "var(--bg-base)", border: `1px solid ${accentColor}33` }}>
              {/* Header row */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {a.logoUrl && (
                    <img
                      src={a.logoUrl}
                      alt=""
                      className="w-7 h-7 rounded-lg object-contain flex-shrink-0"
                      style={{ background: "white", padding: 2 }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                  )}
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    ${a.ticker}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>
                    {a.timeframe}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {targetHit && outcomePct != null && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: "rgba(16,185,129,0.18)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }}
                      title={post.outcomeAt ? `Hit on ${new Date(post.outcomeAt).toLocaleString()}` : "Target reached"}
                    >
                      <span aria-hidden="true">✓</span>
                      Target hit +{outcomePct}%
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: accentColor + "22", color: accentColor }}>
                    <DirIcon size={11} />
                    {isBull ? "Bullish" : isBear ? "Bearish" : "Neutral"}
                  </span>
                </div>
              </div>

              {/* Price levels */}
              {(a.entry || a.target) && (
                <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: `1px solid ${accentColor}22` }}>
                  {a.entry && (
                    <div>
                      <p className="text-[10px] mb-0.5" style={{ color: "var(--text-secondary)" }}>Entry</p>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{a.entry}</p>
                    </div>
                  )}
                  {a.target && (
                    <div>
                      <p className="text-[10px] mb-0.5 text-emerald-400">Target 🎯</p>
                      <p className="text-xs font-semibold text-emerald-400">{a.target}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Conviction + Catalyst + Position */}
              {(a.conviction || a.catalyst || a.position) && (
                <div className="flex items-center flex-wrap gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${accentColor}22` }}>
                  {a.conviction != null && (
                    <div className="flex items-center gap-0.5" title={`Conviction ${a.conviction}/5`}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const filled = n <= (a.conviction ?? 0)
                        return (
                          <Star key={n} size={11}
                            fill={filled ? "#eab308" : "transparent"}
                            stroke={filled ? "#eab308" : "var(--text-secondary)"}
                            strokeWidth={2} />
                        )
                      })}
                    </div>
                  )}
                  {a.catalyst && CATALYST_META[a.catalyst] && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      <span>{CATALYST_META[a.catalyst].emoji}</span>
                      {CATALYST_META[a.catalyst].label}
                    </span>
                  )}
                  {a.position && POSITION_META[a.position] && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        background: POSITION_META[a.position].color + "22",
                        color: POSITION_META[a.position].color,
                        border: `1px solid ${POSITION_META[a.position].color}44`,
                      }}>
                      <span>{POSITION_META[a.position].emoji}</span>
                      {POSITION_META[a.position].label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Reaction summary */}
      {likeCount > 0 && topReactions.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-1.5">
          <div className="flex -space-x-0.5">
            {topReactions.map((e) => (
              <span key={e} className="text-sm leading-none">{e}</span>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{likeCount}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 py-2" style={{ borderTop: "1px solid var(--border)" }}>

        {/* Like + hover reactions */}
        <div
          className="relative"
          onMouseEnter={handleLikeMouseEnter}
          onMouseLeave={handleLikeMouseLeave}
        >
          {/* Reaction bar — wrapped so the bottom padding bridges the gap to the button */}
          {showReactions && (
            <div
              className="absolute left-0 z-20"
              style={{ bottom: "100%", paddingBottom: 6 }}
              onMouseEnter={handleLikeMouseEnter}
              onMouseLeave={handleLikeMouseLeave}
            >
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() => doReaction(r.emoji)}
                    title={r.label}
                    className="text-xl leading-none transition-all hover:scale-125 active:scale-110"
                    style={{ lineHeight: 1, padding: "2px 3px" }}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => doReaction(reaction ?? "👍")}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:bg-rose-500/10 select-none"
            style={{ color: liked ? "#f43f5e" : "var(--text-secondary)" }}
          >
            <span className="text-base leading-none">{liked && reaction ? reaction : "👍"}</span>
            {likeCount > 0 && <span>{likeCount}</span>}
            <span className="hidden sm:inline">{liked && reaction ? REACTIONS.find(r => r.emoji === reaction)?.label ?? "Like" : "Like"}</span>
          </button>
        </div>

        {/* Comment */}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:bg-[var(--bg-base)]"
          style={{ color: showComments ? "#10b981" : "var(--text-secondary)" }}
        >
          <MessageCircle size={15} fill={showComments ? "currentColor" : "none"} />
          {commentCount > 0 && <span>{commentCount}</span>}
          <span className="hidden sm:inline">Comment</span>
        </button>

        {/* Reply privately (only when author is not me) */}
        {post.author.id !== currentUserId && (
          <button
            onClick={handleReplyPrivately}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            title="Reply privately"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Reply</span>
          </button>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:bg-[var(--bg-base)]"
          style={{ color: "var(--text-secondary)" }}
        >
          <Share2 size={15} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Inline comments */}
      {showComments && (
        <InlineComments
          postId={post.id}
          currentUser={commenter}
          onCommentAdded={() => setCC((v) => v + 1)}
        />
      )}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} payload={sharePayload} />
    </article>
  )
}
