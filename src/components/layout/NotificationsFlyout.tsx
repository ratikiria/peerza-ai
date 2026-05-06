"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell, Heart, MessageSquare, UserPlus, UserCheck, Users, Phone, Repeat, User as UserIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ApiNotification = {
  id: string
  type:
    | "FOLLOW"
    | "CONNECTION_REQUEST"
    | "CONNECTION_ACCEPTED"
    | "POST_LIKE"
    | "POST_COMMENT"
    | "POST_SHARE"
    | "MESSAGE"
    | "CALL"
  isRead: boolean
  entityId: string | null
  createdAt: string
  triggerer: { id: string; name: string; username: string; image: string | null }
}

const POLL_MS = 8000

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

function describe(n: ApiNotification): { body: string; href: string; icon: React.ReactNode; iconColor: string } {
  switch (n.type) {
    case "MESSAGE":
      return { body: "sent you a message",        href: `/messages/${n.triggerer.id}`,          icon: <MessageSquare size={11} />, iconColor: "#10b981" }
    case "POST_LIKE":
      return { body: "reacted to your post",      href: n.entityId ? `/feed?post=${n.entityId}` : "/feed", icon: <Heart size={11} />,         iconColor: "#f43f5e" }
    case "POST_COMMENT":
      return { body: "commented on your post",    href: n.entityId ? `/feed?post=${n.entityId}` : "/feed", icon: <MessageSquare size={11} />, iconColor: "#10b981" }
    case "POST_SHARE":
      return { body: "shared your post",          href: n.entityId ? `/feed?post=${n.entityId}` : "/feed", icon: <Repeat size={11} />,        iconColor: "#a78bfa" }
    case "FOLLOW":
      return { body: "started following you",     href: `/profile/${n.triggerer.username}`,     icon: <UserPlus size={11} />,      iconColor: "#10b981" }
    case "CONNECTION_REQUEST":
      return { body: "wants to connect",          href: `/profile/${n.triggerer.username}`,     icon: <Users size={11} />,         iconColor: "#fbbf24" }
    case "CONNECTION_ACCEPTED":
      return { body: "accepted your connection",  href: `/profile/${n.triggerer.username}`,     icon: <UserCheck size={11} />,     iconColor: "#10b981" }
    case "CALL":
      return { body: "called you",                href: "/messages",                            icon: <Phone size={11} />,         iconColor: "#f59e0b" }
    default:
      return { body: "interacted with you",       href: "/notifications",                       icon: <Bell size={11} />,          iconColor: "#10b981" }
  }
}

export default function NotificationsFlyout({ active }: { active: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApiNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCount() {
      try {
        const res = await fetch("/api/notifications/count", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setUnread(data.unread ?? 0)
        }
      } catch {}
    }
    loadCount()
    const id = setInterval(loadCount, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Lazy-load the list only when the panel is opened (and refresh while open)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let id: ReturnType<typeof setInterval> | null = null

    async function loadList() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" })
        if (res.ok) {
          const data: ApiNotification[] = await res.json()
          if (!cancelled) {
            setItems(data)
            setLoaded(true)
          }
        }
      } catch {}
    }

    loadList()
    id = setInterval(loadList, POLL_MS)
    return () => {
      cancelled = true
      if (id) clearInterval(id)
    }
  }, [open])

  // Close on outside click / Escape
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

  async function markAllRead() {
    setUnread(0)
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })))
    try {
      await fetch("/api/notifications", { method: "PATCH" })
    } catch {}
  }

  function openItem(n: ApiNotification) {
    setOpen(false)
    // For DMs, pop the chat in-place rather than navigate. ChatDock listens
    // for this event and opens the conversation in a popped window.
    if (n.type === "MESSAGE") {
      window.dispatchEvent(
        new CustomEvent("peerza:open-chat", { detail: { partnerId: n.triggerer.id } })
      )
      return
    }
    const { href } = describe(n)
    router.push(href)
  }

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        data-tour="notifications"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all",
          active || open
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
        )}
      >
        <Bell size={20} />
        {unread > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-gray-950 text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
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
          className="absolute top-12 right-0 w-[380px] max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl py-2 z-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-4 pb-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Notifications {unread > 0 && `(${unread} new)`}
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-emerald-400 hover:opacity-80"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {!loaded ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                <Bell size={22} className="mx-auto mb-2 opacity-40" />
                You&rsquo;re all caught up.
              </div>
            ) : (
              items.slice(0, 20).map((n) => {
                const desc = describe(n)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-base)]"
                    style={{
                      background: !n.isRead ? "rgba(16,185,129,0.05)" : "transparent",
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      {n.triggerer.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.triggerer.image}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(16,185,129,0.15)" }}
                        >
                          <UserIcon size={14} className="text-emerald-400" />
                        </div>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{
                          background: desc.iconColor,
                          color: "#0f1117",
                          border: "2px solid var(--bg-card)",
                        }}
                      >
                        {desc.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm truncate"
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: !n.isRead ? 700 : 500,
                        }}
                      >
                        <span className="font-semibold">{n.triggerer.name}</span>
                        <span className="font-normal" style={{ color: "var(--text-secondary)" }}> {desc.body}</span>
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {relTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#10b981" }}
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div
            className="pt-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold py-2 mx-2 rounded-lg transition-colors hover:bg-[var(--bg-base)]"
              style={{ color: "#10b981" }}
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
