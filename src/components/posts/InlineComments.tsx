"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Send, User, Smile, ImageIcon, Film, X, Heart, MessageCircle, Pencil, Check, Trash2 } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import GifPicker, { PICKER_W, PICKER_H } from "./GifPicker"

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥"] as const

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default as unknown as React.ComponentType<Record<string, unknown>> })),
  { ssr: false }
)

interface Comment {
  id: string
  content?: string | null
  imageUrl?: string | null
  parentId?: string | null
  createdAt: string
  editedAt?: string | null
  author: { id: string; name: string; username: string; image?: string | null; isPremium: boolean }
  likes?: { userId: string; reaction: string }[]
}

interface InlineCommentsProps {
  postId: string
  currentUser: { id: string; name: string; username: string; image?: string | null }
  onCommentAdded: () => void
}

async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) { reject(new Error("Max 8MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const width = Math.round(img.width * ratio)
        const height = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function InlineComments({ postId, currentUser, onCommentAdded }: InlineCommentsProps) {
  const [comments, setComments]       = useState<Comment[]>([])
  const [loading, setLoading]         = useState(true)
  const [text, setText]               = useState("")
  const [imageUrl, setImageUrl]       = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo]   = useState<{ id: string; username: string } | null>(null)
  const [showEmoji, setShowEmoji]     = useState(false)
  const [showGif, setShowGif]         = useState(false)
  const [emojiData, setEmojiData]     = useState<any>(null)
  const [pickerPos, setPickerPos]     = useState<{ top: number; left: number } | null>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)
  const fileRef       = useRef<HTMLInputElement>(null)
  const emojiRef      = useRef<HTMLDivElement>(null)
  const gifRef        = useRef<HTMLDivElement>(null)
  const emojiBtnRef   = useRef<HTMLButtonElement>(null)
  const gifBtnRef     = useRef<HTMLButtonElement>(null)

  // Lazy-load emoji data only when this component mounts — keeps it out of the main bundle
  useEffect(() => {
    import("@emoji-mart/data").then((m) => setEmojiData(m.default))
  }, [])

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setComments(d.map((c: any) => ({
        ...c, createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt).toISOString(),
      }))))
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(() => inputRef.current?.focus(), 60) })
  }, [postId])

  // Close pickers on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      const hitEmoji = emojiBtnRef.current?.contains(target) || emojiRef.current?.contains(target)
      const hitGif   = gifBtnRef.current?.contains(target)   || gifRef.current?.contains(target)
      if (!hitEmoji) setShowEmoji(false)
      if (!hitGif)   setShowGif(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function calcPos(btnRef: React.RefObject<HTMLButtonElement | null>): { top: number; left: number } | null {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return null
    const top  = rect.top - PICKER_H - 10  // above the button
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PICKER_W - 8))
    // If not enough room above, open below instead
    return { top: top < 8 ? rect.bottom + 8 : top, left }
  }

  function openEmoji() {
    const next = !showEmoji
    if (next) setPickerPos(calcPos(emojiBtnRef))
    setShowEmoji(next)
    setShowGif(false)
  }

  function openGif() {
    const next = !showGif
    if (next) setPickerPos(calcPos(gifBtnRef))
    setShowGif(next)
    setShowEmoji(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImageUrl(await resizeImage(file)) } catch (err: any) { alert(err.message) }
    e.target.value = ""
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if ((!text.trim() && !imageUrl) || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(text.trim() ? { content: text.trim() } : {}),
          ...(imageUrl ? { imageUrl } : {}),
          ...(replyingTo ? { parentId: replyingTo.id } : {}),
        }),
      })

      if (res.ok) {
        const comment = await res.json()
        setComments((prev) => [...prev, { ...comment, createdAt: comment.createdAt ?? new Date().toISOString() }])
        setText(""); setImageUrl(null); setReplyingTo(null); onCommentAdded()
      } else {
        const body = await res.json().catch(() => ({}))
        setSubmitError(body.error ?? "Failed to post comment")
      }
    } catch {
      setSubmitError("Network error — please try again")
    } finally {
      setSubmitting(false)
    }
  }

  async function react(commentId: string, emoji: string) {
    // Optimistic toggle: if user has same reaction, remove; otherwise set
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c
      const likes = c.likes ?? []
      const mine = likes.find((l) => l.userId === currentUser.id)
      if (mine && mine.reaction === emoji) {
        return { ...c, likes: likes.filter((l) => l.userId !== currentUser.id) }
      }
      const filtered = likes.filter((l) => l.userId !== currentUser.id)
      return { ...c, likes: [...filtered, { userId: currentUser.id, reaction: emoji }] }
    }))
    try {
      await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji }),
      })
    } catch {}
  }

  function startReply(c: Comment) {
    setReplyingTo({ id: c.id, username: c.author.username })
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const canSubmit = (text.trim().length > 0 || !!imageUrl) && !submitting

  return (
    <>
    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>

      {/* ── Comment input ───────────────────────────────────────── */}
      <div className="flex gap-2 pt-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden mt-1"
          style={{ background: "rgba(16,185,129,0.15)" }}>
          {currentUser.image
            ? <img src={currentUser.image} alt={currentUser.name} className="w-full h-full object-cover" />
            : <User size={14} className="text-emerald-400" />}
        </div>

        {/* Input box */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>

          {/* Reply target chip */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px]"
              style={{ background: "rgba(16,185,129,0.08)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                Replying to <span className="font-semibold" style={{ color: "#10b981" }}>@{replyingTo.username}</span>
              </span>
              <button onClick={() => setReplyingTo(null)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--bg-elevated)]"
                style={{ color: "var(--text-secondary)" }}>
                <X size={10} />
              </button>
            </div>
          )}

          {/* Image / GIF preview */}
          {imageUrl && (
            <div className="relative m-2 inline-block">
              <img src={imageUrl} alt="Attachment" className="max-h-32 rounded-xl object-cover" />
              <button onClick={() => setImageUrl(null)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors">
                <X size={10} />
              </button>
            </div>
          )}

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment…"
            rows={1}
            maxLength={500}
            className="w-full bg-transparent text-sm outline-none resize-none px-3 pt-2.5 pb-1 leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          />

          {/* Error */}
          {submitError && (
            <p className="text-[11px] text-rose-400 px-3 pb-1">{submitError}</p>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 pb-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>

            {/* Emoji */}
            <div ref={emojiRef}>
              <button
                ref={emojiBtnRef}
                type="button"
                onClick={openEmoji}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: showEmoji ? "#10b981" : "var(--text-secondary)" }}
                title="Emoji"
              >
                <Smile size={16} />
              </button>
            </div>

            {/* Photo */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ color: imageUrl ? "#10b981" : "var(--text-secondary)" }}
              title="Attach photo"
            >
              <ImageIcon size={15} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            {/* GIF */}
            <div ref={gifRef}>
              <button
                ref={gifBtnRef}
                type="button"
                onClick={openGif}
                className="h-7 px-2 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ color: showGif ? "#10b981" : "var(--text-secondary)" }}
                title="GIF"
              >
                GIF
              </button>
            </div>

            {/* Send */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
              style={{ color: canSubmit ? "#10b981" : "var(--text-secondary)" }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Comments list ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: "var(--bg-elevated)" }} />
              <div className="flex-1 h-14 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-secondary)" }}>
          No comments yet — be first!
        </p>
      ) : (() => {
        const top = comments.filter((c) => !c.parentId)
        const repliesByParent = new Map<string, Comment[]>()
        for (const c of comments) {
          if (!c.parentId) continue
          const arr = repliesByParent.get(c.parentId) ?? []
          arr.push(c)
          repliesByParent.set(c.parentId, arr)
        }
        return (
          <div className="space-y-2">
            {top.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={currentUser.id}
                onReact={(emoji) => react(comment.id, emoji)}
                onReply={() => startReply(comment)}
                replies={repliesByParent.get(comment.id) ?? []}
                onReactReply={react}
                onReplyToReply={(replyComment) => startReply(replyComment)}
                onDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id))}
              />
            ))}
          </div>
        )
      })()}
    </div>

    {/* ── Fixed-position pickers (escape overflow:hidden containers) ── */}
    {showEmoji && emojiData && pickerPos && (
      <div
        ref={emojiRef}
        style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}
      >
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: PICKER_W, height: PICKER_H, border: "1px solid var(--border)" }}
        >
          <EmojiPicker
            data={emojiData}
            onEmojiSelect={(emoji: any) => {
              setText((t) => t + emoji.native)
              inputRef.current?.focus()
            }}
            theme="dark"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={9}
            style={{ width: "100%", height: "100%", border: "none" } as any}
          />
        </div>
      </div>
    )}

    {showGif && pickerPos && (
      <div
        ref={gifRef}
        style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}
      >
        <GifPicker
          onSelect={(url) => { setImageUrl(url); setShowGif(false) }}
          onClose={() => setShowGif(false)}
        />
      </div>
    )}
    </>
  )
}

// ── CommentItem (rendered as parent + replies) ──────────────────────────────

function CommentItem({
  comment, currentUserId, onReact, onReply, replies, onReactReply, onReplyToReply, onDeleted,
}: {
  comment: Comment
  currentUserId: string
  onReact: (emoji: string) => void
  onReply: () => void
  replies: Comment[]
  onReactReply: (id: string, emoji: string) => void
  onReplyToReply: (c: Comment) => void
  onDeleted?: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <CommentRow comment={comment} currentUserId={currentUserId}
        onReact={onReact} onReply={onReply} onDeleted={onDeleted} />
      {replies.length > 0 && (
        <div className="ml-9 space-y-2 pl-3"
          style={{ borderLeft: "2px solid var(--border)" }}>
          {replies.map((r) => (
            <CommentRow key={r.id} comment={r} currentUserId={currentUserId}
              onReact={(e) => onReactReply(r.id, e)}
              onReply={() => onReplyToReply(r)}
              onDeleted={onDeleted}
              compact />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentRow({
  comment, currentUserId, onReact, onReply, onDeleted, compact = false,
}: {
  comment: Comment
  currentUserId: string
  onReact: (emoji: string) => void
  onReply: () => void
  onDeleted?: (id: string) => void
  compact?: boolean
}) {
  const [showReactions, setShowReactions] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editing, setEditing] = useState(false)
  const [liveContent, setLiveContent] = useState(comment.content ?? "")
  const [liveEditedAt, setLiveEditedAt] = useState<string | null>(comment.editedAt ?? null)
  const [editText, setEditText] = useState(comment.content ?? "")
  const [savingEdit, setSavingEdit] = useState(false)
  const isOwn = comment.author.id === currentUserId

  async function saveEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === liveContent || savingEdit) {
      setEditing(false)
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })
      if (res.ok) {
        const data = await res.json()
        setLiveContent(data.content)
        setLiveEditedAt(data.editedAt)
        setEditing(false)
      }
    } finally { setSavingEdit(false) }
  }

  async function deleteComment() {
    if (!window.confirm("Delete this comment?")) return
    const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" })
    if (res.ok) onDeleted?.(comment.id)
  }

  function showPopup() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowReactions(true)
  }
  function deferHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowReactions(false), 200)
  }

  const likes = comment.likes ?? []
  const myReaction = likes.find((l) => l.userId === currentUserId)?.reaction ?? null
  const reactionCounts: Record<string, number> = {}
  for (const l of likes) reactionCounts[l.reaction] = (reactionCounts[l.reaction] ?? 0) + 1
  const topReactions = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e)

  const avatarSize = compact ? 7 : 8

  return (
    <div className="flex gap-2">
      <Link href={`/profile/${comment.author.username}`} className="flex-shrink-0">
        <div
          className="rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: avatarSize * 4, height: avatarSize * 4,
            background: "rgba(16,185,129,0.15)",
          }}
        >
          {comment.author.image
            ? <img src={comment.author.image} alt={comment.author.name} className="w-full h-full object-cover" />
            : <User size={compact ? 11 : 13} className="text-emerald-400" />}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: "var(--bg-base)" }}>
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Link href={`/profile/${comment.author.username}`}
              className="text-xs font-semibold hover:text-emerald-400 transition-colors"
              style={{ color: "var(--text-primary)" }}>
              {comment.author.name}
            </Link>
            {comment.author.isPremium && (
              <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">PRO</span>
            )}
          </div>
          {editing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={Math.min(6, Math.max(2, editText.split("\n").length + 1))}
                maxLength={2000}
                autoFocus
                className="w-full text-xs rounded-lg px-2 py-1.5 outline-none resize-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="flex items-center justify-end gap-1.5">
                <button onClick={() => { setEditing(false); setEditText(liveContent) }}
                  disabled={savingEdit}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded hover:bg-[var(--bg-card)]"
                  style={{ color: "var(--text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={saveEdit}
                  disabled={savingEdit || !editText.trim()}
                  className="text-[10px] font-bold px-2 py-0.5 rounded disabled:opacity-40"
                  style={{ background: "#10b981", color: "#0f1117" }}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : liveContent && (
            <p className="text-xs leading-relaxed break-words" style={{ color: "var(--text-primary)" }}>{liveContent}</p>
          )}
          {comment.imageUrl && !editing && (
            <img src={comment.imageUrl} alt="Comment attachment"
              className="mt-1.5 max-h-48 rounded-xl object-cover max-w-full" />
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {formatRelativeTime(comment.createdAt)}
          </p>
          {liveEditedAt && (
            <span className="text-[10px] italic" style={{ color: "var(--text-secondary)" }}
              title={`Edited ${formatRelativeTime(liveEditedAt)}`}>
              (edited)
            </span>
          )}

          {/* Like button + emoji popup */}
          <div className="relative inline-flex" onMouseLeave={deferHide}>
            <button
              type="button"
              onMouseEnter={showPopup}
              onClick={() => onReact(myReaction ?? "👍")}
              className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color: myReaction ? "#10b981" : "var(--text-secondary)" }}
            >
              <Heart size={11} fill={myReaction ? "currentColor" : "none"} />
              <span>{myReaction ? "Liked" : "Like"}</span>
              {likes.length > 0 && (
                <span className="flex items-center gap-0.5 ml-1" style={{ color: "var(--text-secondary)" }}>
                  {topReactions.map((e) => <span key={e} className="text-[10px]">{e}</span>)}
                  <span className="text-[10px] tabular-nums">{likes.length}</span>
                </span>
              )}
            </button>

            {showReactions && (
              <div
                onMouseEnter={showPopup}
                onMouseLeave={deferHide}
                className="absolute left-0 z-20"
                style={{ bottom: "100%", paddingBottom: 4 }}
              >
                <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-full shadow-2xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(emoji); setShowReactions(false) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply */}
          <button type="button" onClick={onReply}
            className="flex items-center gap-1 text-[11px] font-semibold transition-colors hover:text-emerald-400"
            style={{ color: "var(--text-secondary)" }}>
            <MessageCircle size={11} />
            Reply
          </button>

          {isOwn && !editing && (
            <>
              <button type="button" onClick={() => { setEditText(liveContent); setEditing(true) }}
                className="flex items-center gap-1 text-[11px] font-semibold transition-colors hover:text-emerald-400"
                style={{ color: "var(--text-secondary)" }}
                title="Edit">
                <Pencil size={11} /> Edit
              </button>
              <button type="button" onClick={deleteComment}
                className="flex items-center gap-1 text-[11px] font-semibold transition-colors hover:text-rose-400"
                style={{ color: "var(--text-secondary)" }}
                title="Delete">
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

