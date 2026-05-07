"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageCircle, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  partner: {
    id: string
    name: string
    username: string
    image: string | null
  } | null
  lastMessage: {
    id: string
    type: "TEXT" | "VOICE" | "IMAGE" | "VIDEO"
    content: string | null
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

const POLL_MS = 5000

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ""
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

function previewText(c: Conversation): string {
  const m = c.lastMessage
  if (!m) return "Say hi 👋"
  if (m.type === "VOICE") return "🎙 Voice message"
  if (m.type === "IMAGE") return "📷 Photo"
  if (m.type === "VIDEO") return "🎬 Video"
  const text = m.content?.replace(/\n/g, " ") ?? ""
  if (!text) return "(no text)"
  // Strip share-token prefixes for cleaner preview
  if (text.startsWith("[post:")) return "📎 Shared a post"
  if (text.startsWith("[challenge:")) return "🔥 Shared a challenge"
  if (text.startsWith("[call:")) return "💰 Price call"
  return text.slice(0, 80)
}

export default function MessagesFlyout({ active }: { active: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" })
        if (!res.ok) return
        const data: Conversation[] = await res.json()
        if (!cancelled) {
          setConversations(data)
          setLoaded(true)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        data-tour="messages"
        onClick={() => setOpen((v) => !v)}
        title="Messages"
        aria-label="Messages"
        aria-expanded={open}
        className={cn(
          "relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all",
          active || open
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
        )}
      >
        <MessageCircle size={20} />
        {totalUnread > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-gray-950 text-[9px] font-bold rounded-full flex items-center justify-center">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
            <span
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full"
              style={{
                background: "rgba(16,185,129,0.6)",
                animation: "pz-msg-pulse 1.6s ease-out infinite",
              }}
            />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute top-12 right-0 w-[360px] max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl py-2 z-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-4 pb-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Messages {totalUnread > 0 && `(${totalUnread} new)`}
            </p>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-emerald-400 hover:opacity-80"
            >
              See all
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!loaded ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                No conversations yet.
                <div className="mt-2">
                  <Link
                    href="/messages"
                    onClick={() => setOpen(false)}
                    className="text-emerald-400 text-xs font-semibold hover:opacity-80"
                  >
                    Start a chat →
                  </Link>
                </div>
              </div>
            ) : (
              // Filter out null partners + dedupe by id (the API polls every
              // 5s and a transient duplicate on retry would warn about
              // non-unique keys). Then cap at 12.
              Array.from(
                new Map(
                  conversations
                    .filter((c) => c.partner)
                    .map((c) => [c.id, c] as const)
                ).values()
              ).slice(0, 12).map((c, idx) => {
                const isUnread = c.unreadCount > 0
                return (
                  <button
                    key={c.id ?? c.partner?.id ?? `conv-${idx}`}
                    type="button"
                    onClick={() => {
                      if (!c.partner) return
                      setOpen(false)
                      router.push(`/messages/${c.partner.id}`)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-base)]"
                  >
                    <div className="relative flex-shrink-0">
                      {c.partner!.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.partner!.image}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(16,185,129,0.15)" }}
                        >
                          <UserIcon size={16} className="text-emerald-400" />
                        </div>
                      )}
                      {isUnread && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: "#10b981",
                            color: "#0f1117",
                            border: "2px solid var(--bg-card)",
                          }}
                        >
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="text-sm truncate"
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: isUnread ? 700 : 500,
                          }}
                        >
                          {c.partner!.name}
                        </p>
                        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                          {c.lastMessage ? relTime(c.lastMessage.createdAt) : ""}
                        </span>
                      </div>
                      <p
                        className="text-xs truncate"
                        style={{
                          color: isUnread ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: isUnread ? 600 : 400,
                        }}
                      >
                        {previewText(c)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pz-msg-pulse {
          0%   { opacity: 0.7; transform: scale(1); }
          80%  { opacity: 0; transform: scale(2.6); }
          100% { opacity: 0; transform: scale(2.6); }
        }
      `}</style>
    </div>
  )
}
