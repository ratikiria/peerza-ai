"use client"

import { useEffect, useRef, useState } from "react"
import {
  X, Repeat2, Send, Copy, Search, User, Check, Loader2,
  TrendingUp, TrendingDown, Minus, Briefcase, Zap, Shuffle,
} from "lucide-react"

// ── Payload types ──────────────────────────────────────────────────────────────

interface SharedAuthor {
  id: string; name: string; username: string; image?: string | null
}

interface PostPreview {
  id: string
  content: string
  imageUrl?: string | null
  author: SharedAuthor
  analysis?: { ticker?: string; direction?: string } | null
}

interface ChallengePreview {
  id: string
  name: string
  style?: "INVESTMENT" | "TRADING" | "MIXED"
  status?: "UPCOMING" | "ACTIVE" | "ENDED"
  participantCount?: number
  totalValue?: number       // current portfolio value, optional
  returnPct?: number        // current return % vs starting capital, optional
}

export type SharePayload =
  | { kind: "post";      post: PostPreview }
  | { kind: "challenge"; challenge: ChallengePreview }

interface ShareModalProps {
  open: boolean
  onClose: () => void
  payload: SharePayload
  onShared?: () => void
}

// ── Recipient picker types ─────────────────────────────────────────────────────

interface UserResult {
  id: string; name: string; username: string; image?: string | null; isPremium?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

type Tab = "repost" | "send" | "link"

export default function ShareModal({ open, onClose, payload, onShared }: ShareModalProps) {
  const [tab, setTab]                 = useState<Tab>("repost")
  const [comment, setComment]         = useState("")
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)

  // Send tab state
  const [search, setSearch]           = useState("")
  const [results, setResults]         = useState<UserResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [recipient, setRecipient]     = useState<UserResult | null>(null)
  const [dmText, setDmText]           = useState("")

  // Copy link state
  const [copied, setCopied]           = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setTab("repost"); setComment(""); setDone(null); setError(null)
    setSearch(""); setResults([]); setRecipient(null); setDmText(""); setCopied(false)
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Debounced user search
  useEffect(() => {
    if (tab !== "send") return
    const q = search.trim()
    if (q.length < 1) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (res.ok) setResults(await res.json())
      } catch {}
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [search, tab])

  if (!open) return null

  const link = payload.kind === "post"
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/posts/${payload.post.id}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/investments/${payload.challenge.id}`

  // Token used inside DM content so ChatWindow can render an inline preview card
  const dmToken = payload.kind === "post"
    ? `[post:${payload.post.id}]`
    : `[challenge:${payload.challenge.id}]`

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function submitRepost() {
    setSubmitting(true); setError(null)
    try {
      const body: any = {
        content: comment.trim(),
        ...(payload.kind === "post" ? { originalPostId: payload.post.id } : {}),
      }
      if (payload.kind === "challenge") {
        // No DB-level repost relation for challenges; embed the token + a default body.
        body.content = `${dmToken}${comment.trim() ? "\n" + comment.trim() : ""}`
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDone(payload.kind === "post" ? "Reposted to your feed" : "Shared to your feed")
        onShared?.()
        setTimeout(onClose, 900)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Failed to share")
      }
    } catch { setError("Network error") }
    setSubmitting(false)
  }

  async function submitDM() {
    if (!recipient) return
    setSubmitting(true); setError(null)
    try {
      // Resolve (or create) the conversation, then send into it.
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: recipient.id }),
      })
      if (!convRes.ok) {
        const d = await convRes.json().catch(() => ({}))
        setError(d.error ?? "Failed to start conversation")
        setSubmitting(false)
        return
      }
      const conv = await convRes.json()
      const messageContent = `${dmToken}${dmText.trim() ? "\n" + dmText.trim() : ""}`
      const res = await fetch(`/api/conversations/${conv.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent, type: "TEXT" }),
      })
      if (res.ok) {
        setDone(`Sent to @${recipient.username}`)
        setTimeout(onClose, 900)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Failed to send")
      }
    } catch { setError("Network error") }
    setSubmitting(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const repostLabel = payload.kind === "post" ? "Repost" : "Share to feed"
  const repostCta   = payload.kind === "post" ? "Repost" : "Post"

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Share {payload.kind === "post" ? "post" : "challenge"}
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Preview */}
        <div className="px-4 pt-3">
          {payload.kind === "post" ? (
            <PostPreviewCard post={payload.post} />
          ) : (
            <ChallengePreviewCard challenge={payload.challenge} />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 mt-3">
          <TabButton active={tab === "repost"} onClick={() => setTab("repost")} icon={<Repeat2 size={13} />} label={repostLabel} />
          <TabButton active={tab === "send"}   onClick={() => setTab("send")}   icon={<Send size={13} />}    label="Send to…" />
          <TabButton active={tab === "link"}   onClick={() => setTab("link")}   icon={<Copy size={13} />}    label="Copy link" />
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-3">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-emerald-400">
              <Check size={16} /> {done}
            </div>
          ) : tab === "repost" ? (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={payload.kind === "post" ? "Add your take (optional)…" : "Say something about it (optional)…"}
                rows={3}
                maxLength={500}
                className="w-full bg-transparent rounded-xl text-sm leading-relaxed px-3 py-2 outline-none resize-none"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                disabled={submitting}
                onClick={submitRepost}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
                style={{ background: "#10b981", color: "#0f1117" }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Repeat2 size={14} />}
                {repostCta}
              </button>
            </>
          ) : tab === "send" ? (
            <>
              {!recipient ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                    <Search size={14} style={{ color: "var(--text-secondary)" }} />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or @username"
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "var(--text-primary)" }}
                    />
                    {searching && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                  </div>
                  <div className="max-h-64 overflow-y-auto -mx-1">
                    {search.length === 0 ? (
                      <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
                        Type a name or @username to find anyone
                      </p>
                    ) : results.length === 0 && !searching ? (
                      <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
                        No matches
                      </p>
                    ) : (
                      results.map((u) => (
                        <button key={u.id} onClick={() => setRecipient(u)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-base)] text-left">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                            style={{ background: "rgba(16,185,129,0.15)" }}>
                            {u.image
                              ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                              : <User size={14} className="text-emerald-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                              {u.name}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
                              @{u.username}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Selected recipient chip */}
                  <div className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.2)" }}>
                        {recipient.image
                          ? <img src={recipient.image} alt={recipient.name} className="w-full h-full object-cover" />
                          : <User size={12} className="text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{recipient.name}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>@{recipient.username}</p>
                      </div>
                    </div>
                    <button onClick={() => setRecipient(null)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-md hover:bg-emerald-500/10"
                      style={{ color: "#10b981" }}>
                      Change
                    </button>
                  </div>
                  <textarea
                    value={dmText}
                    onChange={(e) => setDmText(e.target.value)}
                    placeholder="Add a message (optional)…"
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-xl text-sm leading-relaxed px-3 py-2 outline-none resize-none"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  <button
                    disabled={submitting}
                    onClick={submitDM}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
                    style={{ background: "#10b981", color: "#0f1117" }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl px-3 py-2.5 text-xs font-mono break-all"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {link}
              </div>
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all"
                style={{ background: copied ? "rgba(16,185,129,0.15)" : "#10b981", color: copied ? "#10b981" : "#0f1117" }}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy link</>}
              </button>
            </>
          )}

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Tab button helper ──────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
      style={active
        ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }
        : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
      {icon} {label}
    </button>
  )
}

// ── Preview cards ──────────────────────────────────────────────────────────────

function PostPreviewCard({ post }: { post: PostPreview }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: "rgba(16,185,129,0.15)" }}>
          {post.author.image
            ? <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
            : <User size={11} className="text-emerald-400" />}
        </div>
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{post.author.name}</span>
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>@{post.author.username}</span>
      </div>
      <p className="text-xs line-clamp-3 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{post.content}</p>
      {post.analysis?.ticker && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>${post.analysis.ticker}</span>
          {post.analysis.direction === "bullish" ? <TrendingUp size={10} className="text-emerald-400" />
            : post.analysis.direction === "bearish" ? <TrendingDown size={10} className="text-rose-400" />
            : <Minus size={10} className="text-yellow-400" />}
        </div>
      )}
    </div>
  )
}

function ChallengePreviewCard({ challenge }: { challenge: ChallengePreview }) {
  const StyleIcon = challenge.style === "TRADING" ? Zap : challenge.style === "INVESTMENT" ? Briefcase : Shuffle
  const styleColor = challenge.style === "TRADING" ? "#fb923c" : challenge.style === "INVESTMENT" ? "#60a5fa" : "#10b981"
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: styleColor + "22", color: styleColor }}>
          <StyleIcon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{challenge.name}</p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {challenge.style ?? "Challenge"} · {challenge.status ?? ""}
            {challenge.participantCount != null ? ` · ${challenge.participantCount} participants` : ""}
          </p>
        </div>
      </div>
      {challenge.returnPct != null && (
        <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          {challenge.totalValue != null && (
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
              Value <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                ${challenge.totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </span>
          )}
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Return <span className="font-semibold tabular-nums"
              style={{ color: challenge.returnPct >= 0 ? "#10b981" : "#ef4444" }}>
              {challenge.returnPct >= 0 ? "+" : ""}{challenge.returnPct.toFixed(2)}%
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
