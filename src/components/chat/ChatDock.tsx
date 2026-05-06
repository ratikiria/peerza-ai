"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  MessageCircle, X, Plus, Search, User, Loader2, Minus, ArrowLeft,
  TrendingUp, TrendingDown, Minus as MinusIcon, Trophy, Phone, Video, Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ChatTextBubble } from "@/components/messages/ChatBubble"
import WaveformPlayer from "@/components/messages/WaveformPlayer"
import PollCard, { type PollData } from "@/components/polls/PollCard"
import { formatRelativeTime } from "@/lib/utils"
import FinanceComposer, { type Attached } from "./FinanceComposer"

const STORAGE_KEY = "peerza-chat-dock-v1"
const SOUND_KEY = "peerza-chat-sound-v1"
const MAX_OPEN_CHATS = 2
const Z_DOCK = 90

// Soft "ding" — two short sine notes via Web Audio. Falls back to no-op on error.
function playChime() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const tones = [
      { f: 880, t: now,        d: 0.08 },
      { f: 1320, t: now + 0.09, d: 0.12 },
    ]
    for (const { f, t, d } of tones) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + d + 0.02)
    }
    setTimeout(() => ctx.close(), 500)
  } catch { /* ignore */ }
}

function chimeEnabled() {
  if (typeof window === "undefined") return true
  try { return (localStorage.getItem(SOUND_KEY) ?? "on") !== "off" }
  catch { return true }
}

interface Conversation {
  conversationId: string
  isGroup: boolean
  name: string | null
  partner: { id: string; name: string; username: string; image?: string | null } | null
  participants: { id: string; name: string; username: string; image?: string | null }[]
  lastMessage: { id: string; content?: string | null; type: string; createdAt: string; senderId: string } | null
  unreadCount: number
  updatedAt: string
}

interface DockState {
  expanded: boolean
  openChats: string[] // conversation IDs
}

function loadState(): DockState {
  if (typeof window === "undefined") return { expanded: false, openChats: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { expanded: false, openChats: [] }
    const parsed = JSON.parse(raw)
    return {
      expanded: !!parsed.expanded,
      openChats: Array.isArray(parsed.openChats) ? parsed.openChats.slice(0, MAX_OPEN_CHATS) : [],
    }
  } catch {
    return { expanded: false, openChats: [] }
  }
}

function saveState(s: DockState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// ── Top-level dock ────────────────────────────────────────────────────────────

export default function ChatDock({ currentUserId }: { currentUserId: string }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [openChats, setOpenChats] = useState<string[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pageVisible, setPageVisible] = useState(true)
  const [preAttach, setPreAttach] = useState<Record<string, Attached>>({})

  // Hydrate from localStorage on mount
  useEffect(() => {
    const s = loadState()
    setExpanded(s.expanded)
    setOpenChats(s.openChats)
    setMounted(true)
  }, [])

  // Persist whenever state changes
  useEffect(() => {
    if (mounted) saveState({ expanded, openChats })
  }, [mounted, expanded, openChats])

  // Track page visibility for polling pause
  useEffect(() => {
    function onVis() { setPageVisible(!document.hidden) }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  // "Reply privately" from PostCard → resolve conversation, open dock with post pre-attached
  useEffect(() => {
    async function onReply(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { partnerId: string; post: { postId: string; label: string } }
        | undefined
      if (!detail?.partnerId) return
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: detail.partnerId }),
      })
      if (!res.ok) return
      const conv = await res.json()
      const attached: Attached = { kind: "post", postId: detail.post.postId, label: detail.post.label }
      setPreAttach((prev) => ({ ...prev, [conv.conversationId]: attached }))
      setOpenChats((prev) => {
        if (prev.includes(conv.conversationId)) return prev
        const next = [...prev, conv.conversationId]
        if (next.length > MAX_OPEN_CHATS) next.shift()
        return next
      })
      setExpanded(false)
    }
    window.addEventListener("peerza:reply-privately", onReply)
    return () => window.removeEventListener("peerza:reply-privately", onReply)
  }, [])

  // Generic "open chat with this partner" event — dispatched by message
  // notifications (toast and bell flyout) so clicking pops the chat in-place
  // instead of navigating away from whatever page the user was on.
  useEffect(() => {
    async function onOpenChat(e: Event) {
      const detail = (e as CustomEvent).detail as { partnerId: string } | undefined
      if (!detail?.partnerId) return
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: detail.partnerId }),
      })
      if (!res.ok) return
      const conv = await res.json()
      setOpenChats((prev) => {
        if (prev.includes(conv.conversationId)) return prev
        const next = [...prev, conv.conversationId]
        if (next.length > MAX_OPEN_CHATS) next.shift()
        return next
      })
      setExpanded(false)
    }
    window.addEventListener("peerza:open-chat", onOpenChat)
    return () => window.removeEventListener("peerza:open-chat", onOpenChat)
  }, [])

  // Open an existing conversation directly by ID (used by inbox when clicking a
  // group, since groups don't have a partner-id full-page route).
  useEffect(() => {
    function onOpenConv(e: Event) {
      const detail = (e as CustomEvent).detail as { conversationId: string } | undefined
      if (!detail?.conversationId) return
      setOpenChats((prev) => {
        if (prev.includes(detail.conversationId)) return prev
        const next = [...prev, detail.conversationId]
        if (next.length > MAX_OPEN_CHATS) next.shift()
        return next
      })
      setExpanded(false)
    }
    window.addEventListener("peerza:open-conversation", onOpenConv)
    return () => window.removeEventListener("peerza:open-conversation", onOpenConv)
  }, [])

  // External trigger to open the panel directly in "new chat" mode.
  const [openInNewMode, setOpenInNewMode] = useState(0) // bump counter to re-trigger
  useEffect(() => {
    function onOpenNew() {
      setExpanded(true)
      setOpenInNewMode((n) => n + 1)
    }
    window.addEventListener("peerza:open-new-chat", onOpenNew)
    return () => window.removeEventListener("peerza:open-new-chat", onOpenNew)
  }, [])

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations")
    if (res.ok) setConversations(await res.json())
  }, [])

  // Poll conversation list when expanded OR a chat is open
  useEffect(() => {
    const shouldPoll = (expanded || openChats.length > 0) && pageVisible
    if (!shouldPoll) return
    loadConversations()
    const id = setInterval(loadConversations, 5000)
    return () => clearInterval(id)
  }, [expanded, openChats.length, pageVisible, loadConversations])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  // Chime when unread rises while dock is collapsed and tab is foregrounded
  const prevUnreadRef = useRef(0)
  const initialUnreadRef = useRef(false)
  useEffect(() => {
    if (!mounted) return
    if (!initialUnreadRef.current) {
      // Skip the first reading so we don't chime on initial load
      prevUnreadRef.current = totalUnread
      initialUnreadRef.current = true
      return
    }
    const prev = prevUnreadRef.current
    prevUnreadRef.current = totalUnread
    if (totalUnread > prev && pageVisible && !expanded && openChats.length === 0 && chimeEnabled()) {
      playChime()
    }
  }, [totalUnread, mounted, pageVisible, expanded, openChats.length])

  // Hide on full-page chat (/messages/[partnerId]) and /call/* and auth pages.
  // Stays visible on the inbox (/messages) so group conversations can be
  // opened in the dock from the inbox list.
  const hidden =
    !mounted ||
    pathname?.startsWith("/messages/") ||
    pathname?.startsWith("/call/") ||
    pathname === "/login" ||
    pathname === "/register"

  if (hidden) return null

  function openConversation(convId: string) {
    setOpenChats((prev) => {
      if (prev.includes(convId)) return prev
      const next = [...prev, convId]
      if (next.length > MAX_OPEN_CHATS) next.shift()
      return next
    })
    setExpanded(false)
  }

  function closeConversation(convId: string) {
    setOpenChats((prev) => prev.filter((id) => id !== convId))
  }

  return (
    <>
      {/* Popped chat windows — stacked LEFT of the pill */}
      {openChats.map((convId, idx) => {
        const conv = conversations.find((c) => c.conversationId === convId)
        // Right offset: pill at 16px, then for each window 340 + 12 gap
        const rightOffset = 16 + 56 + 12 + idx * (340 + 12)
        return (
          <PoppedChatWindow
            key={convId}
            conversationId={convId}
            partner={conv?.partner ?? null}
            isGroup={!!conv?.isGroup}
            groupName={conv?.name ?? null}
            participants={conv?.participants ?? []}
            currentUserId={currentUserId}
            rightOffset={rightOffset}
            pageVisible={pageVisible}
            initialAttached={preAttach[convId] ?? null}
            onClose={() => {
              closeConversation(convId)
              setPreAttach((prev) => { const next = { ...prev }; delete next[convId]; return next })
            }}
            onActivity={loadConversations}
          />
        )
      })}

      {/* Conversations panel (expanded state) */}
      {expanded && (
        <ConversationsPanel
          conversations={conversations}
          currentUserId={currentUserId}
          onSelect={openConversation}
          onClose={() => setExpanded(false)}
          openInNewMode={openInNewMode}
        />
      )}

      {/* Dock pill (always visible when not hidden) */}
      <DockPill
        expanded={expanded}
        unread={totalUnread}
        onClick={() => setExpanded((v) => !v)}
      />
    </>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function DockPill({ expanded, unread, onClick }: { expanded: boolean; unread: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={expanded ? "Close chat" : "Open chat"}
      aria-expanded={expanded}
      className="fixed bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      style={{
        zIndex: Z_DOCK,
        background: expanded ? "var(--bg-elevated)" : "#10b981",
        boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
        color: expanded ? "var(--text-primary)" : "#0f1117",
        border: "1px solid var(--border)",
      }}
    >
      {expanded
        ? <X size={20} />
        : <MessageCircle size={20} fill="currentColor" />}
      {!expanded && unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
          style={{ background: "#ef4444", color: "white", border: "2px solid var(--bg-base)" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  )
}

// ── Conversations panel ────────────────────────────────────────────────────────

function ConversationsPanel({
  conversations,
  currentUserId,
  onSelect,
  onClose,
  openInNewMode,
}: {
  conversations: Conversation[]
  currentUserId: string
  onSelect: (convId: string) => void
  onClose: () => void
  openInNewMode?: number
}) {
  const [mode, setMode] = useState<"list" | "new">("list")
  // When the parent bumps the trigger, switch to "new" mode.
  useEffect(() => {
    if (openInNewMode && openInNewMode > 0) setMode("new")
  }, [openInNewMode])

  return (
    <div
      className="fixed rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      style={{
        bottom: 80, right: 16,
        width: 360, height: 520,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        zIndex: Z_DOCK,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          {mode === "new" && (
            <button onClick={() => setMode("list")}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft size={14} />
            </button>
          )}
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {mode === "list" ? "Messages" : "New chat"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {mode === "list" && (
            <button onClick={() => setMode("new")}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}
              title="New chat">
              <Plus size={14} />
            </button>
          )}
          <Link href="/messages"
            className="text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            onClick={onClose}>
            Inbox
          </Link>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === "list"
          ? <ConversationsList conversations={conversations} currentUserId={currentUserId} onSelect={onSelect} />
          : <NewChatPicker onCreated={(conversationId) => onSelect(conversationId)} />
        }
      </div>
    </div>
  )
}

function ConversationsList({
  conversations,
  currentUserId,
  onSelect,
}: {
  conversations: Conversation[]
  currentUserId: string
  onSelect: (convId: string) => void
}) {
  if (conversations.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <MessageCircle size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          No conversations yet
        </p>
        <p className="text-[11px] opacity-60 mt-1" style={{ color: "var(--text-secondary)" }}>
          Tap + to start a new chat
        </p>
      </div>
    )
  }

  return (
    <div className="py-1">
      {conversations.map((c) => {
        const partner = c.partner
        const isGroup = c.isGroup
        if (!isGroup && !partner) return null
        const displayName = isGroup
          ? (c.name?.trim() || c.participants.map((p) => p.name.split(" ")[0]).slice(0, 3).join(", ") || "Group")
          : partner!.name
        const avatarUser = isGroup ? null : partner
        const last = c.lastMessage
        const isMe = last?.senderId === currentUserId
        const raw = last?.content ?? ""
        const tokenLabel =
          raw.startsWith("[post:")      ? "📎 Shared a post"
          : raw.startsWith("[challenge:") ? "🔥 Shared a challenge"
          : raw.startsWith("[call:")      ? "💰 Price call"
          : null
        const cleanText = raw.replace(/^\[(post|challenge|call):[^\]]+\]\s*\n?/, "").trim()
        const preview =
          last?.type === "VOICE" ? "🎤 Voice message"
          : last?.type === "IMAGE" ? `${isMe ? "You: " : ""}📷 Photo${cleanText ? " · " + cleanText : ""}`
          : last?.type === "VIDEO" ? `${isMe ? "You: " : ""}🎬 Video${cleanText ? " · " + cleanText : ""}`
          : last?.type === "POLL"  ? `${isMe ? "You: " : ""}📊 Poll${cleanText ? " · " + cleanText : ""}`
          : tokenLabel ? `${isMe ? "You: " : ""}${tokenLabel}${cleanText ? " · " + cleanText : ""}`
          : cleanText ? `${isMe ? "You: " : ""}${cleanText}`
          : ""
        return (
          <button key={c.conversationId} onClick={() => onSelect(c.conversationId)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-base)] text-left">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              {isGroup
                ? <Users size={16} className="text-emerald-400" />
                : avatarUser?.image
                  ? <img src={avatarUser.image} alt={avatarUser.name} className="w-full h-full object-cover" />
                  : <User size={16} className="text-emerald-400" />}
              {c.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "#ef4444", color: "white", border: "2px solid var(--bg-card)" }}>
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                  {isGroup && <Users size={10} className="opacity-60 flex-shrink-0" />}
                  {displayName}
                </span>
                {last && (
                  <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(last.createdAt)}
                  </span>
                )}
              </div>
              <p className="text-[11px] truncate mt-0.5"
                style={{ color: c.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>
                {preview}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── New chat picker (mirrors ShareModal recipient picker) ──────────────────────

interface UserResult {
  id: string; name: string; username: string; image?: string | null
}

function NewChatPicker({ onCreated }: { onCreated: (conversationId: string) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserResult[]>([])
  const [groupName, setGroupName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (q.trim().length < 1) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        if (res.ok) setResults(await res.json())
      } catch {}
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  function toggle(u: UserResult) {
    setSelected((prev) => prev.some((s) => s.id === u.id)
      ? prev.filter((s) => s.id !== u.id)
      : [...prev, u]
    )
  }

  const isGroupMode = selected.length >= 2

  async function submit() {
    if (selected.length === 0 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const body = isGroupMode
        ? { partnerIds: selected.map((s) => s.id), name: groupName.trim() || undefined }
        : { partnerId: selected[0].id }
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? "Failed to start chat")
        return
      }
      const conv = await res.json()
      onCreated(conv.conversationId)
    } catch {
      setError("Network error — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-3 space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span key={u.id}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold pl-1 pr-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.25)" }}>
                {u.image
                  ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                  : <User size={9} />}
              </span>
              {u.name.split(" ")[0]}
              <button onClick={() => toggle(u)}
                className="opacity-70 hover:opacity-100"
                aria-label={`Remove ${u.name}`}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
        <Search size={14} style={{ color: "var(--text-secondary)" }} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={selected.length === 0 ? "Search by name or @username" : "Add another person…"}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {searching && <Loader2 size={12} className="animate-spin text-emerald-400" />}
      </div>

      {/* Group name (only when 2+ selected) */}
      {isGroupMode && (
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          maxLength={80}
          placeholder="Group name (optional)"
          className="w-full text-sm px-3 py-2 rounded-xl outline-none"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      )}

      {/* Search results */}
      <div>
        {q.length === 0 && selected.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
            Type to find someone — pick 2+ to start a group
          </p>
        ) : q.length > 0 && results.length === 0 && !searching ? (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
            No matches
          </p>
        ) : q.length > 0 ? (
          results.map((u) => {
            const isPicked = selected.some((s) => s.id === u.id)
            return (
              <button key={u.id} onClick={() => toggle(u)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--bg-base)] text-left">
                <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.15)" }}>
                  {u.image
                    ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                    : <User size={14} className="text-emerald-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>@{u.username}</p>
                </div>
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isPicked ? "#10b981" : "transparent",
                    border: `1.5px solid ${isPicked ? "#10b981" : "var(--text-secondary)"}`,
                    color: "#0f1117",
                  }}>
                  {isPicked && <Plus size={10} style={{ transform: "rotate(45deg)" }} />}
                </span>
              </button>
            )
          })
        ) : null}
      </div>

      {error && <p className="text-[11px] text-rose-400 px-1">{error}</p>}

      {/* Action button */}
      {selected.length > 0 && (
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          {submitting && <Loader2 size={11} className="animate-spin" />}
          {isGroupMode
            ? `Create group with ${selected.length} people`
            : `Open chat with ${selected[0].name.split(" ")[0]}`}
        </button>
      )}
    </div>
  )
}

// ── Context ribbon ────────────────────────────────────────────────────────────

interface UserContext {
  lastCall: {
    ticker: string
    direction: "bullish" | "bearish" | "neutral"
    conviction: number | null
    postId: string
    createdAt: string
  } | null
  activeChallenge: {
    id: string
    name: string
    returnPct: number
    rank: number
    totalParticipants: number
  } | null
}

function ContextRibbon({ partnerId }: { partnerId: string }) {
  const [ctx, setCtx] = useState<UserContext | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/users/${partnerId}/context`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setCtx(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [partnerId])

  if (!ctx || (!ctx.lastCall && !ctx.activeChallenge)) return null

  const dirColor =
    ctx.lastCall?.direction === "bullish" ? "#10b981"
    : ctx.lastCall?.direction === "bearish" ? "#ef4444"
    : "#8a8d9a"
  const DirIcon =
    ctx.lastCall?.direction === "bullish" ? TrendingUp
    : ctx.lastCall?.direction === "bearish" ? TrendingDown
    : MinusIcon

  const retColor = (ctx.activeChallenge?.returnPct ?? 0) >= 0 ? "#10b981" : "#ef4444"

  return (
    <div
      className="flex items-center gap-2 px-3 py-1 flex-shrink-0 text-[10px]"
      style={{
        height: 28,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      {ctx.lastCall && (
        <Link
          href={`/feed?post=${ctx.lastCall.postId}`}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--bg-elevated)] truncate"
          title={`Last call: ${ctx.lastCall.ticker} ${ctx.lastCall.direction}`}
        >
          <DirIcon size={10} style={{ color: dirColor }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {ctx.lastCall.ticker}
          </span>
          <span style={{ color: dirColor }}>{ctx.lastCall.direction}</span>
        </Link>
      )}
      {ctx.lastCall && ctx.activeChallenge && (
        <span style={{ color: "var(--border)" }}>·</span>
      )}
      {ctx.activeChallenge && (
        <Link
          href={`/investments/${ctx.activeChallenge.id}`}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--bg-elevated)] truncate min-w-0"
          title={`${ctx.activeChallenge.name} · #${ctx.activeChallenge.rank} of ${ctx.activeChallenge.totalParticipants}`}
        >
          <Trophy size={10} style={{ color: "#f59e0b" }} />
          <span style={{ color: "var(--text-primary)" }}>
            #{ctx.activeChallenge.rank}
          </span>
          <span style={{ color: retColor, fontWeight: 600 }}>
            {ctx.activeChallenge.returnPct >= 0 ? "+" : ""}
            {ctx.activeChallenge.returnPct.toFixed(2)}%
          </span>
        </Link>
      )}
    </div>
  )
}

// ── Popped chat window ─────────────────────────────────────────────────────────

interface Message {
  id: string
  content?: string | null
  voiceUrl?: string | null
  mediaUrl?: string | null
  mediaMime?: string | null
  poll?: PollData | null
  type: "TEXT" | "VOICE" | "IMAGE" | "VIDEO" | "POLL"
  senderId: string
  createdAt: string
  sender: { id: string; name: string; username: string; image?: string | null }
}

function PoppedChatWindow({
  conversationId,
  partner,
  isGroup,
  groupName,
  participants,
  currentUserId,
  rightOffset,
  pageVisible,
  initialAttached,
  onClose,
  onActivity,
}: {
  conversationId: string
  partner: { id: string; name: string; username: string; image?: string | null } | null
  isGroup: boolean
  groupName: string | null
  participants: { id: string; name: string; username: string; image?: string | null }[]
  currentUserId: string
  rightOffset: number
  pageVisible: boolean
  initialAttached: Attached | null
  onClose: () => void
  onActivity: () => void
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [calling, setCalling] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  async function startCall(kind: "AUDIO" | "VIDEO") {
    if (!partner || calling) return
    setCalling(true)
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: partner.id, kind }),
      })
      if (res.ok) {
        const call = await res.json()
        router.push(`/call/${call.id}`)
      }
    } finally {
      setCalling(false)
    }
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (!res.ok) return
    const data = await res.json()
    // Response shape: { messages, partnerLastReadAt }
    if (Array.isArray(data)) {
      // legacy fallback
      setMessages(data)
      setPartnerLastReadAt(null)
    } else {
      setMessages(data.messages ?? [])
      setPartnerLastReadAt(data.partnerLastReadAt ?? null)
    }
  }, [conversationId])

  useEffect(() => {
    if (!pageVisible || minimized) return
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [load, pageVisible, minimized])

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  function handleMessagesScroll() {
    const el = messagesRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distFromBottom < 80
  }

  const handleSent = useCallback(() => {
    stickToBottomRef.current = true
    load()
    onActivity()
  }, [load, onActivity])

  const headerName = isGroup
    ? (groupName?.trim() || participants.map((p) => p.name.split(" ")[0]).slice(0, 3).join(", ") || "Group")
    : (partner?.name ?? "Conversation")
  const headerSub = isGroup
    ? `${participants.length + 1} members`
    : (partner ? `@${partner.username}` : "")

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed flex items-center gap-2 px-3 py-2 rounded-t-xl shadow-2xl"
        style={{
          bottom: 0,
          right: rightOffset,
          width: 200,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderBottom: "none",
          color: "var(--text-primary)",
          zIndex: Z_DOCK,
        }}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
          style={{ background: "rgba(16,185,129,0.15)" }}>
          {partner?.image
            ? <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
            : <User size={11} className="text-emerald-400" />}
        </div>
        <span className="text-xs font-semibold truncate flex-1 text-left">{headerName}</span>
        <X size={12} style={{ color: "var(--text-secondary)" }}
           onClick={(e) => { e.stopPropagation(); onClose() }} />
      </button>
    )
  }

  return (
    <div
      className="fixed rounded-t-2xl flex flex-col overflow-hidden shadow-2xl"
      style={{
        bottom: 0,
        right: rightOffset,
        width: 340, height: 460,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderBottom: "none",
        zIndex: Z_DOCK,
      }}
      role="region"
      aria-label={`Chat with ${headerName}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        {isGroup ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <Users size={14} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{headerName}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{headerSub}</p>
            </div>
          </div>
        ) : (
          <Link href={partner ? `/profile/${partner.username}` : "#"}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-90">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              {partner?.image
                ? <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
                : <User size={14} className="text-emerald-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{headerName}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{headerSub}</p>
            </div>
          </Link>
        )}
        {!isGroup && (
          <>
            <button onClick={() => startCall("AUDIO")} disabled={!partner || calling}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card)] disabled:opacity-40"
              style={{ color: "var(--text-secondary)" }}
              title="Voice call">
              <Phone size={13} />
            </button>
            <button onClick={() => startCall("VIDEO")} disabled={!partner || calling}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card)] disabled:opacity-40"
              style={{ color: "var(--text-secondary)" }}
              title="Video call">
              <Video size={13} />
            </button>
          </>
        )}
        <button onClick={() => setMinimized(true)}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card)]"
          style={{ color: "var(--text-secondary)" }}
          title="Minimize">
          <Minus size={13} />
        </button>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card)]"
          style={{ color: "var(--text-secondary)" }}
          title="Close">
          <X size={13} />
        </button>
      </div>

      {/* Context ribbon — only for 1:1 */}
      {!isGroup && partner && <ContextRibbon partnerId={partner.id} />}

      {/* Messages */}
      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2"
        style={{ background: "var(--bg-base)" }}>
        {messages.length === 0 ? (
          <p className="text-center text-[11px] py-8" style={{ color: "var(--text-secondary)" }}>
            No messages yet. Say hi!
          </p>
        ) : (() => {
          // Compute the index of the most recent message sent by ME so we can
          // attach a Seen/Sent indicator only there (avoids labeling every line).
          let lastMineIdx = -1
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].senderId === currentUserId) { lastMineIdx = i; break }
          }
          const partnerReadMs = partnerLastReadAt ? new Date(partnerLastReadAt).getTime() : 0
          return messages.map((m, idx) => {
            const isMe = m.senderId === currentUserId
            const showSeen = isMe && idx === lastMineIdx
            const seen = showSeen && partnerReadMs >= new Date(m.createdAt).getTime()
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[78%] space-y-0.5">
                  {isGroup && !isMe && (
                    <p className="text-[10px] font-semibold pl-1" style={{ color: "var(--text-secondary)" }}>
                      {m.sender.name}
                    </p>
                  )}
                  {m.type === "VOICE" && m.voiceUrl ? (
                    <div className={`rounded-2xl px-2 py-1.5 ${isMe ? "bg-emerald-500" : "bg-gray-800"}`}>
                      <WaveformPlayer src={m.voiceUrl} variant={isMe ? "me" : "them"} />
                    </div>
                  ) : m.type === "IMAGE" && m.mediaUrl ? (
                    <div className="space-y-1">
                      <img src={m.mediaUrl} alt="" className="rounded-2xl max-w-full max-h-60 object-cover" />
                      {m.content && <ChatTextBubble content={m.content} isMe={isMe} />}
                    </div>
                  ) : m.type === "VIDEO" && m.mediaUrl ? (
                    <div className="space-y-1">
                      <video src={m.mediaUrl} controls playsInline
                        className="rounded-2xl max-w-full max-h-60" />
                      {m.content && <ChatTextBubble content={m.content} isMe={isMe} />}
                    </div>
                  ) : m.type === "POLL" && m.poll ? (
                    <div className="space-y-1">
                      <PollCard poll={m.poll} currentUserId={currentUserId} isMe={isMe} />
                      {m.content && <ChatTextBubble content={m.content} isMe={isMe} />}
                    </div>
                  ) : (
                    <ChatTextBubble content={m.content ?? ""} isMe={isMe} />
                  )}
                  <p className={`text-[9px] px-1 ${isMe ? "text-right" : "text-left"} flex items-center gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
                    style={{ color: "var(--text-secondary)" }}>
                    <span>{formatRelativeTime(m.createdAt)}</span>
                    {!isGroup && showSeen && (
                      <span style={{ color: seen ? "#10b981" : "var(--text-secondary)" }}>
                        · {seen ? "Seen" : "Sent"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )
          })
        })()}
        <div ref={bottomRef} />
      </div>

      <FinanceComposer conversationId={conversationId} isGroup={isGroup} onSent={handleSent} initialAttached={initialAttached} />
    </div>
  )
}
