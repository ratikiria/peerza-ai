"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Bell, MessageCircle, Heart, UserPlus, Phone, Repeat, X, Users, UserCheck, Swords,
} from "lucide-react"

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
    | "GAME_DUEL_INVITE"
    | "GAME_DUEL_RESULT"
  receiverId: string
  triggeredBy: string
  entityId: string | null
  isRead: boolean
  createdAt: string
  triggerer: { id: string; name: string; username: string; image: string | null }
}

type Toast = {
  id: string
  title: string
  body: string
  href: string
  icon: React.ReactNode
  iconColor: string
  triggerer: ApiNotification["triggerer"]
  isMessage: boolean
}

const POLL_MS = 4000
const SOUND_KEY = "peerza-chat-sound-v1"

function isSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY)
    return v === null ? true : v !== "off"
  } catch {
    return true
  }
}

// Soft two-note chime via Web Audio. Mirrors the ChatDock chime so the user
// has one consistent sound across pings. Swallows autoplay errors silently —
// browsers block AudioContext until first gesture, but by then the user will
// have interacted with the page.
function playToastChime() {
  if (typeof window === "undefined") return
  if (!isSoundEnabled()) return
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const tones = [
      { f: 880, t: now,        d: 0.09 },
      { f: 1320, t: now + 0.09, d: 0.13 },
    ]
    for (const { f, t, d } of tones) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.018)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + d + 0.03)
    }
    setTimeout(() => ctx.close(), 600)
  } catch {}
}

function describe(n: ApiNotification): { title: string; body: string; href: string; icon: React.ReactNode; iconColor: string } {
  const who = n.triggerer.name
  switch (n.type) {
    case "MESSAGE":
      return {
        title: who,
        body: "sent you a message",
        href: `/messages/${n.triggerer.id}`,
        icon: <MessageCircle size={14} />,
        iconColor: "#10b981",
      }
    case "POST_LIKE":
      return {
        title: who,
        body: "reacted to your post",
        href: n.entityId ? `/feed?post=${n.entityId}` : "/notifications",
        icon: <Heart size={14} />,
        iconColor: "#f43f5e",
      }
    case "POST_COMMENT":
      return {
        title: who,
        body: "commented on your post",
        href: n.entityId ? `/feed?post=${n.entityId}` : "/notifications",
        icon: <MessageCircle size={14} />,
        iconColor: "#10b981",
      }
    case "POST_SHARE":
      return {
        title: who,
        body: "shared your post",
        href: n.entityId ? `/feed?post=${n.entityId}` : "/notifications",
        icon: <Repeat size={14} />,
        iconColor: "#a78bfa",
      }
    case "FOLLOW":
      return {
        title: who,
        body: "started following you",
        href: `/profile/${n.triggerer.username}`,
        icon: <UserPlus size={14} />,
        iconColor: "#10b981",
      }
    case "CONNECTION_REQUEST":
      return {
        title: who,
        body: "wants to connect with you",
        href: "/connections",
        icon: <Users size={14} />,
        iconColor: "#fbbf24",
      }
    case "CONNECTION_ACCEPTED":
      return {
        title: who,
        body: "accepted your connection",
        href: `/profile/${n.triggerer.username}`,
        icon: <UserCheck size={14} />,
        iconColor: "#10b981",
      }
    case "CALL":
      return {
        title: who,
        body: "is calling you",
        href: "/messages",
        icon: <Phone size={14} />,
        iconColor: "#f59e0b",
      }
    case "GAME_DUEL_INVITE":
      return {
        title: who,
        body: "challenged you to a game duel",
        href: "/games/duels",
        icon: <Swords size={14} />,
        iconColor: "#818cf8",
      }
    case "GAME_DUEL_RESULT":
      return {
        title: who,
        body: "finished your duel — see who won",
        href: "/games/duels?box=sent",
        icon: <Swords size={14} />,
        iconColor: "#10b981",
      }
    default:
      return {
        title: who,
        body: "interacted with you",
        href: "/notifications",
        icon: <Bell size={14} />,
        iconColor: "#10b981",
      }
  }
}

export default function ToastHost() {
  const router = useRouter()
  const pathname = usePathname()
  const [toasts, setToasts] = useState<Toast[]>([])
  const sinceRef = useRef<string>(new Date().toISOString())
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [hideBanner, setHideBanner] = useState(false)

  // Initial permission probe
  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission)
    try {
      if (localStorage.getItem("peerza-toast-banner-dismissed-v1") === "1") {
        setHideBanner(true)
      }
    } catch {}
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timersRef.current[id]
    if (t) {
      clearTimeout(t)
      delete timersRef.current[id]
    }
  }, [])

  const pushToast = useCallback((toast: Toast) => {
    setToasts((prev) => {
      // De-dupe + cap to last 4
      const filtered = prev.filter((t) => t.id !== toast.id)
      const next = [...filtered, toast]
      return next.slice(-4)
    })
    timersRef.current[toast.id] = setTimeout(() => dismissToast(toast.id), 5500)
  }, [dismissToast])

  // Poll loop
  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const res = await fetch(`/api/notifications?since=${encodeURIComponent(sinceRef.current)}`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const items: ApiNotification[] = await res.json()
        if (cancelled || items.length === 0) return

        // API returns newest-first; iterate oldest-first so the newest ends up on top
        const ordered = [...items].reverse()
        let maxTime = sinceRef.current
        let pushedAny = false
        for (const n of ordered) {
          if (n.createdAt > maxTime) maxTime = n.createdAt

          // Skip if we're already on the destination — feels like noise
          const desc = describe(n)
          if (n.type === "MESSAGE" && pathname.startsWith("/messages")) continue
          if (pathname === desc.href) continue

          pushToast({
            id: n.id,
            title: desc.title,
            body: desc.body,
            href: desc.href,
            icon: desc.icon,
            iconColor: desc.iconColor,
            triggerer: n.triggerer,
            isMessage: n.type === "MESSAGE",
          })
          pushedAny = true

          // Native browser notification when tab is hidden
          if (
            permission === "granted" &&
            typeof document !== "undefined" &&
            document.hidden
          ) {
            try {
              const noti = new Notification(`${desc.title}`, {
                body: desc.body,
                icon: n.triggerer.image || undefined,
                tag: n.id,
                silent: false,
              })
              noti.onclick = () => {
                window.focus()
                router.push(desc.href)
                noti.close()
              }
            } catch {}
          }
        }
        sinceRef.current = maxTime
        if (pushedAny) playToastChime()
      } catch {
        // network blip — silent retry on next tick
      }
    }

    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [permission, pathname, pushToast, router])

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      for (const t of Object.values(timersRef.current)) clearTimeout(t)
      timersRef.current = {}
    }
  }, [])

  async function requestPermission() {
    if (typeof Notification === "undefined") return
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      try { localStorage.setItem("peerza-toast-banner-dismissed-v1", "1") } catch {}
      setHideBanner(true)
    } catch {}
  }

  function dismissBanner() {
    setHideBanner(true)
    try { localStorage.setItem("peerza-toast-banner-dismissed-v1", "1") } catch {}
  }

  return (
    <>
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="fixed top-20 right-4 z-[80] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 360 }}
      >
        {permission === "default" && !hideBanner && (
          <div
            className="pointer-events-auto rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              animation: "pz-toast-in 320ms ease-out",
            }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
            >
              <Bell size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Pop notifications when offline
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                Get pinged even when this tab is in the background.
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: "#10b981", color: "#0f1117" }}
            >
              Enable
            </button>
            <button
              onClick={dismissBanner}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              dismissToast(t.id)
              if (t.isMessage) {
                // Pop the chat in-place rather than navigating to /messages
                window.dispatchEvent(
                  new CustomEvent("peerza:open-chat", { detail: { partnerId: t.triggerer.id } })
                )
                return
              }
              router.push(t.href)
            }}
            className="pointer-events-auto rounded-2xl shadow-2xl px-3 py-3 flex items-center gap-3 text-left group"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              animation: "pz-toast-in 280ms ease-out",
            }}
          >
            <div className="relative flex-shrink-0">
              {t.triggerer.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.triggerer.image}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  {t.triggerer.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: t.iconColor, color: "#0f1117", border: "2px solid var(--bg-card)" }}
              >
                {t.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {t.title}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                {t.body}
              </p>
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(t.id)
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-50 group-hover:opacity-100"
              style={{ color: "var(--text-secondary)" }}
              role="button"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </span>
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes pz-toast-in {
          from { opacity: 0; transform: translateX(20px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </>
  )
}
