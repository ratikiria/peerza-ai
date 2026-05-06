"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { X, Eye, User, Heart, ChevronLeft, ChevronRight, Send, Smile } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

const REACTION_EMOJIS = ["❤️", "😂", "😮", "🔥", "👏", "🚀"] as const

// One story page in the viewer. Shape is shared between "own" and "other"
// modes; fields specific to one mode are optional.
export interface ViewerStory {
  id: string
  mediaUrl: string
  caption?: string | null
  createdAt: string
  expiresAt: string
  // Other mode (viewing someone else's story)
  viewed?: boolean
  myReaction?: string | null
  // Own mode (viewing my own story — engagement received)
  viewCount?: number
  reactionCount?: number
  replyCount?: number
  views?:     { viewedAt: string; viewer: { id: string; name: string; username: string; image?: string | null } }[]
  reactions?: { emoji: string; createdAt: string; user: { id: string; name: string; username: string; image?: string | null } }[]
  replies?:   { id: string; text: string; createdAt: string; from: { id: string; name: string; username: string; image?: string | null } }[]
}

interface StoryViewerModalProps {
  mode: "own" | "other"
  stories: ViewerStory[]
  startIndex?: number
  author?: { id: string; name: string; username: string; image?: string | null }
  onClose: () => void
}

export default function StoryViewerModal({ mode, stories, startIndex = 0, author, onClose }: StoryViewerModalProps) {
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, stories.length - 1)))
  // Local copy of the stories array so we can patch myReaction in-place when
  // the user reacts without a full refetch.
  const [items, setItems] = useState<ViewerStory[]>(stories)
  const [showViewers, setShowViewers] = useState(false)
  const [showEngagement, setShowEngagement] = useState<"views" | "reactions" | "replies">("views")
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [sentTick, setSentTick] = useState(0)
  // When the user reacts, show a flying-emoji burst over the story image plus
  // a brief "Sent ✓" line under the reaction bar so it's obvious the tap worked.
  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(null)
  const [reactionSentTick, setReactionSentTick] = useState(0)

  const current = items[index]
  const isOther = mode === "other"

  useEffect(() => {
    setItems(stories)
  }, [stories])

  // Mark each story as viewed when it becomes the active one (other mode only).
  useEffect(() => {
    if (!isOther || !current) return
    fetch(`/api/stories/${current.id}/view`, { method: "POST" }).catch(() => {})
  }, [isOther, current?.id])

  // Keyboard nav: ←/→ to step, Esc to close.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose()
      if (e.key === "ArrowLeft") return goPrev()
      if (e.key === "ArrowRight") return goNext()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length])

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1)
  }
  function goNext() {
    if (index < items.length - 1) setIndex((i) => i + 1)
    else onClose()
  }

  async function react(emoji: string) {
    if (!current || !isOther) return
    // Optimistic update — flip the bubble before the network round-trip.
    const previous = current.myReaction ?? null
    setItems((prev) => prev.map((s, i) => i === index ? { ...s, myReaction: emoji } : s))
    // Trigger the visual feedback immediately so it doesn't lag behind the
    // network call. The flying-emoji burst + "Sent ✓" indicator are the only
    // way users know the tap registered.
    setBurst({ emoji, key: Date.now() })
    setReactionSentTick((t) => t + 1)
    try {
      const res = await fetch(`/api/stories/${current.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error("react failed")
    } catch {
      // Roll back on failure
      setItems((prev) => prev.map((s, i) => i === index ? { ...s, myReaction: previous } : s))
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!current || !isOther) return
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/stories/${current.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        setReplyText("")
        setSentTick((t) => t + 1)
      }
    } finally {
      setSending(false)
    }
  }

  if (!current) return null

  const headerAuthor = author ?? null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#000", width: "min(390px, 92vw)" }}
      >
        {/* Segmented progress bar — one segment per story */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: i < index ? "100%" : i === index ? "100%" : "0%",
                  background: i <= index ? "#fff" : "transparent",
                  transition: "width 0.2s",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author bar (other mode) */}
        {isOther && headerAuthor && (
          <div className="absolute top-5 left-0 right-0 px-4 py-3 flex items-center gap-3 z-10"
            style={{ background: "linear-gradient(rgba(0,0,0,0.5), transparent)" }}>
            <Link href={`/profile/${headerAuthor.username}`} onClick={onClose} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.2)", border: "2px solid #10b981" }}>
                {headerAuthor.image ? (
                  <img src={headerAuthor.image} alt={headerAuthor.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={12} className="text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{headerAuthor.name}</p>
                <p className="text-[10px] text-white/70">{formatRelativeTime(current.createdAt)}</p>
              </div>
            </Link>
          </div>
        )}

        {/* Close — always visible top-right */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X size={15} />
        </button>

        {/* Tap zones — left third = previous, right two-thirds = next.
            Sit above the image but below the action UI. */}
        <button
          aria-label="Previous"
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 z-[5] w-1/3 flex items-center justify-start pl-2 text-white/0 hover:text-white/40 transition-colors"
          style={{ background: "transparent" }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="Next"
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 z-[5] w-2/3 flex items-center justify-end pr-2 text-white/0 hover:text-white/40 transition-colors"
          style={{ background: "transparent" }}
        >
          <ChevronRight size={18} />
        </button>

        {/* Story image — locked to 9:16 portrait so every story renders at the
            same size regardless of source aspect ratio. Facebook/Instagram
            pattern: foreground image is `object-contain` (full image visible,
            never cropped), and the empty space behind it is filled with the
            same image scaled-up + blurred — so landscape/square photos look
            designed instead of letterboxed-on-black. */}
        <div
          key={current.id}
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "9 / 16", background: "#000" }}
        >
          {/* Blurred fill — same image, cover-cropped + blurred + slightly
              dimmed so the foreground stays the focal point. */}
          <img
            src={current.mediaUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
          />
          {/* Foreground — preserves the user's full image without cropping. */}
          <img
            src={current.mediaUrl}
            alt="Story"
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Flying-emoji burst — positioned relative to the IMAGE FRAME
              (not the outer card) so it always animates from inside the
              image area regardless of caption/footer height. The `key`
              from state forces React to re-mount the element so the CSS
              animation replays on every tap. */}
          {burst && (
            <span
              key={burst.key}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-[15] text-6xl"
              style={{ bottom: "20%", animation: "story-react-burst 900ms ease-out forwards" }}
              onAnimationEnd={() => setBurst(null)}
            >
              {burst.emoji}
            </span>
          )}
        </div>

        {/* Caption */}
        {current.caption && (
          <div className="absolute left-0 right-0 px-4 py-3 pointer-events-none"
            style={{
              bottom: isOther ? 110 : 56,
              background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
            }}>
            <p className="text-sm text-white text-center">{current.caption}</p>
          </div>
        )}

        {/* Bottom panel — reactions + reply for "other"; engagement for "own" */}
        {isOther ? (
          <div
            className="relative px-3 pt-2 pb-3 space-y-2"
            style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", zIndex: 10 }}
          >
            {/* Reaction bar */}
            <div className="flex items-center justify-between gap-1">
              {REACTION_EMOJIS.map((emoji) => {
                const active = current.myReaction === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(emoji)}
                    className="flex-1 py-1.5 rounded-full text-lg transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: active ? "rgba(16,185,129,0.22)" : "transparent",
                      border: active ? "1px solid rgba(16,185,129,0.55)" : "1px solid transparent",
                      boxShadow: active ? "0 0 0 2px rgba(16,185,129,0.25)" : "none",
                    }}
                    aria-pressed={active}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>

            {/* Inline confirmation — fades in on each react and stays until the
                next tap. Visible cue that "yes, the reaction was sent." */}
            {reactionSentTick > 0 && (
              <p
                key={reactionSentTick}
                className="text-[11px] text-center font-medium"
                style={{ color: "#10b981", animation: "story-react-confirm 1800ms ease-out forwards" }}
              >
                ✓ Reaction sent to {author?.name?.split(" ")[0] ?? "them"}
              </p>
            )}

            {/* Reply input */}
            <form onSubmit={sendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={sentTick > 0 && !replyText ? "Reply sent ✓" : "Reply…"}
                maxLength={500}
                className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: "#10b981", color: "#0f1117" }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        ) : (
          <div className="relative" style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", zIndex: 10 }}>
            <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
              <TabButton
                active={showEngagement === "views"}
                icon={<Eye size={13} />}
                label={`${current.viewCount ?? 0} ${(current.viewCount ?? 0) === 1 ? "view" : "views"}`}
                onClick={() => setShowEngagement("views")}
              />
              <TabButton
                active={showEngagement === "reactions"}
                icon={<Heart size={13} />}
                label={`${current.reactionCount ?? 0}`}
                onClick={() => setShowEngagement("reactions")}
              />
              <TabButton
                active={showEngagement === "replies"}
                icon={<Smile size={13} />}
                label={`${current.replyCount ?? 0}`}
                onClick={() => setShowEngagement("replies")}
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {showEngagement === "views" && (
                (current.views?.length ?? 0) === 0
                  ? <Empty text="No views yet" />
                  : current.views!.map((v) => (
                    <PersonRow
                      key={v.viewer.id}
                      user={v.viewer}
                      meta={formatRelativeTime(v.viewedAt)}
                      onClose={onClose}
                    />
                  ))
              )}
              {showEngagement === "reactions" && (
                (current.reactions?.length ?? 0) === 0
                  ? <Empty text="No reactions yet" />
                  : current.reactions!.map((r, i) => (
                    <PersonRow
                      key={`${r.user.id}-${i}`}
                      user={r.user}
                      meta={formatRelativeTime(r.createdAt)}
                      trailing={<span className="text-base">{r.emoji}</span>}
                      onClose={onClose}
                    />
                  ))
              )}
              {showEngagement === "replies" && (
                (current.replies?.length ?? 0) === 0
                  ? <Empty text="No replies yet" />
                  : current.replies!.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[var(--bg-base)] transition-colors">
                      <Avatar user={r.from} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${r.from.username}`} onClick={onClose}
                          className="text-xs font-semibold hover:text-emerald-400 transition-colors block truncate"
                          style={{ color: "var(--text-primary)" }}>
                          {r.from.name}
                        </Link>
                        <p className="text-xs mt-0.5 break-words" style={{ color: "var(--text-primary)" }}>{r.text}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(r.createdAt)}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="px-4 py-2 text-[10px] text-right"
              style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
              {formatRelativeTime(current.createdAt)} · expires {formatRelativeTime(current.expiresAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, icon, label, onClick }: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
      style={{
        color: active ? "#10b981" : "var(--text-secondary)",
        background: active ? "rgba(16,185,129,0.08)" : "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Avatar({ user }: { user: { name: string; image?: string | null } }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{ background: "rgba(16,185,129,0.15)" }}>
      {user.image ? (
        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <User size={13} className="text-emerald-400" />
      )}
    </div>
  )
}

function PersonRow({ user, meta, trailing, onClose }: {
  user: { id: string; name: string; username: string; image?: string | null }
  meta: string
  trailing?: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-base)] transition-colors">
      <Avatar user={user} />
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`} onClick={onClose}
          className="text-xs font-semibold hover:text-emerald-400 transition-colors block truncate"
          style={{ color: "var(--text-primary)" }}>
          {user.name}
        </Link>
        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
      </div>
      {trailing}
      <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>{meta}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{text}</p>
    </div>
  )
}
