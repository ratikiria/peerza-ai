"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, User, Briefcase, Zap, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"

export const POST_TOKEN_RE      = /^\[post:([a-z0-9]+)\]\s*\n?/i
export const CHALLENGE_TOKEN_RE = /^\[challenge:([a-z0-9]+)\]\s*\n?/i
export const CALL_TOKEN_RE      = /^\[call:([A-Z0-9.]+):(bullish|bearish|neutral)(?::([^\]]*))?\]\s*\n?/i

interface ChatTextBubbleProps {
  content: string
  isMe: boolean
}

export function ChatTextBubble({ content, isMe }: ChatTextBubbleProps) {
  const postMatch      = content.match(POST_TOKEN_RE)
  const challengeMatch = content.match(CHALLENGE_TOKEN_RE)
  const callMatch      = content.match(CALL_TOKEN_RE)
  const remainingText  =
    postMatch      ? content.replace(POST_TOKEN_RE, "")
    : challengeMatch ? content.replace(CHALLENGE_TOKEN_RE, "")
    : callMatch      ? content.replace(CALL_TOKEN_RE, "")
    : content

  return (
    <div
      className={cn(
        "rounded-2xl text-sm leading-relaxed overflow-hidden",
        isMe ? "bg-emerald-500 text-gray-950 rounded-tr-sm" : "bg-gray-800 text-gray-100 rounded-tl-sm"
      )}
    >
      {remainingText.trim().length > 0 && (
        <div className="px-3 py-2 whitespace-pre-wrap break-words">{remainingText}</div>
      )}
      {postMatch && <SharedPostPreview postId={postMatch[1]} isMe={isMe} hasText={remainingText.trim().length > 0} />}
      {challengeMatch && <SharedChallengePreview challengeId={challengeMatch[1]} isMe={isMe} hasText={remainingText.trim().length > 0} />}
      {callMatch && <SharedCallPreview ticker={callMatch[1]} direction={callMatch[2] as "bullish" | "bearish" | "neutral"} note={callMatch[3] ?? ""} isMe={isMe} hasText={remainingText.trim().length > 0} />}
    </div>
  )
}

// ── Post preview ───────────────────────────────────────────────────────────────

interface PostMeta {
  id: string
  content: string
  imageUrl?: string | null
  author: { name: string; username: string; image?: string | null }
  analysis?: { ticker?: string; direction?: string } | null
}

function SharedPostPreview({ postId, isMe, hasText }: { postId: string; isMe: boolean; hasText: boolean }) {
  const [post, setPost] = useState<PostMeta | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/posts/${postId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d) setPost(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [postId])

  const baseStyle = isMe ? "bg-emerald-600/30 text-gray-950" : "bg-gray-900/60 text-gray-100"
  const cls = cn("block p-2.5 transition-colors hover:opacity-90", baseStyle, hasText ? "mt-0" : "")

  if (!post) {
    return <div className={cls}><div className="h-8 animate-pulse rounded bg-black/10" /></div>
  }
  return (
    <Link href={`/posts/${post.id}`} className={cls}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.2)" }}>
          {post.author.image
            ? <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
            : <User size={9} className={isMe ? "text-emerald-900" : "text-emerald-400"} />}
        </div>
        <span className="text-[11px] font-semibold">{post.author.name}</span>
        <span className="text-[9px] opacity-70">@{post.author.username}</span>
      </div>
      <p className={cn("text-[11px] line-clamp-3 whitespace-pre-wrap", isMe ? "text-gray-900" : "text-gray-300")}>
        {post.content.replace(CHALLENGE_TOKEN_RE, "").replace(CALL_TOKEN_RE, "").trim()}
      </p>
      {post.imageUrl && <img src={post.imageUrl} alt="" className="rounded-md w-full max-h-32 object-cover mt-1.5" />}
      {post.analysis?.ticker && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[9px] font-bold">${post.analysis.ticker}</span>
          {post.analysis.direction === "bullish" ? <TrendingUp size={9} className={isMe ? "text-emerald-900" : "text-emerald-400"} />
            : post.analysis.direction === "bearish" ? <TrendingDown size={9} className={isMe ? "text-rose-900" : "text-rose-400"} />
            : <Minus size={9} className={isMe ? "text-yellow-900" : "text-yellow-400"} />}
        </div>
      )}
    </Link>
  )
}

// ── Challenge preview ──────────────────────────────────────────────────────────

interface ChallengeMeta {
  id: string; name: string
  style?: "INVESTMENT" | "TRADING" | "MIXED"
  status?: "UPCOMING" | "ACTIVE" | "ENDED"
  _count?: { participants?: number }
}

function SharedChallengePreview({ challengeId, isMe, hasText }: { challengeId: string; isMe: boolean; hasText: boolean }) {
  const [data, setData] = useState<ChallengeMeta | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/challenges/${challengeId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d) setData(d.challenge ?? d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [challengeId])

  const baseStyle = isMe ? "bg-emerald-600/30 text-gray-950" : "bg-gray-900/60 text-gray-100"
  const cls = cn("block p-2.5 transition-colors hover:opacity-90", baseStyle, hasText ? "mt-0" : "")

  if (!data) {
    return <div className={cls}><div className="h-8 animate-pulse rounded bg-black/10" /></div>
  }
  const StyleIcon = data.style === "TRADING" ? Zap : data.style === "INVESTMENT" ? Briefcase : Shuffle
  const styleColor = data.style === "TRADING" ? "#fb923c" : data.style === "INVESTMENT" ? "#60a5fa" : "#10b981"
  return (
    <Link href={`/investments/${data.id}`} className={cls}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: styleColor + "33", color: styleColor }}>
          <StyleIcon size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-bold truncate", isMe ? "text-gray-900" : "text-gray-100")}>{data.name}</p>
          <p className={cn("text-[9px]", isMe ? "text-gray-800/70" : "text-gray-400")}>
            {data.style ?? "Challenge"} · {data.status ?? ""}
            {data._count?.participants != null ? ` · ${data._count.participants} participants` : ""}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ── Price-call preview ─────────────────────────────────────────────────────────

function SharedCallPreview({
  ticker, direction, note, isMe, hasText,
}: {
  ticker: string
  direction: "bullish" | "bearish" | "neutral"
  note: string
  isMe: boolean
  hasText: boolean
}) {
  const baseStyle = isMe ? "bg-emerald-600/30 text-gray-950" : "bg-gray-900/60 text-gray-100"
  const cls = cn("block p-2.5", baseStyle, hasText ? "mt-0" : "")
  const dirColor = direction === "bullish" ? "#10b981" : direction === "bearish" ? "#ef4444" : "#eab308"
  const DirIcon = direction === "bullish" ? TrendingUp : direction === "bearish" ? TrendingDown : Minus
  return (
    <div className={cls}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: dirColor + "33", color: dirColor }}>
          <DirIcon size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-bold", isMe ? "text-gray-900" : "text-gray-100")}>
            ${ticker} <span className="font-medium opacity-70">· {direction}</span>
          </p>
          {note && (
            <p className={cn("text-[10px] line-clamp-2", isMe ? "text-gray-800/80" : "text-gray-400")}>
              {note}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
