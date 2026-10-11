"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Home, CandlestickChart, Plus, MessageCircle, User } from "lucide-react"
import { haptic } from "@/lib/haptics"
import CreateSheet from "@/components/layout/CreateSheet"

const POLL_MS = 15000

// Screens that own the bottom edge (chat composer, call controls) hide the bar.
function hiddenOn(pathname: string) {
  return /^\/messages\/[^/]+/.test(pathname) || pathname.startsWith("/call/")
}

interface MobileTabBarProps {
  user: { name: string; username: string; image?: string | null }
}

/** Phone-only bottom navigation: Feed · Markets · Create · Chats · You. */
export default function MobileTabBar({ user }: MobileTabBarProps) {
  const t = useTranslations("Nav")
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Skip polling on desktop, where the bar isn't shown.
      if (window.matchMedia("(min-width: 768px)").matches || document.hidden) return
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" })
        if (!res.ok) return
        const data: { unreadCount?: number }[] = await res.json()
        if (!cancelled) setUnread(data.reduce((n, c) => n + (c.unreadCount ?? 0), 0))
      } catch {}
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (hiddenOn(pathname)) return null

  const markets = ["/markets", "/portfolio", "/investments", "/workspace", "/calendar"]
  const tabs = [
    { href: "/feed", label: t("feed"), icon: Home, on: pathname.startsWith("/feed") },
    { href: "/markets", label: t("markets"), icon: CandlestickChart, on: markets.some((p) => pathname.startsWith(p)) },
    null,
    { href: "/messages", label: t("chats"), icon: MessageCircle, on: pathname.startsWith("/messages"), badge: unread },
    { href: "/me", label: t("you"), icon: User, on: pathname === "/me" || pathname === `/profile/${user.username}`, avatar: true },
  ]

  return (
    <>
      <nav
        aria-label={t("main_nav")}
        className="md:hidden fixed left-3 right-3 z-40 grid grid-cols-5 items-center h-[68px] rounded-[26px]"
        style={{
          bottom: "calc(10px + env(safe-area-inset-bottom))",
          background: "var(--nav-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px -10px rgba(0,0,0,0.7)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          backdropFilter: "blur(18px) saturate(150%)",
        }}
      >
        {tabs.map((tab) => {
          if (!tab) {
            return (
              <button
                key="create"
                type="button"
                aria-label={t("create")}
                aria-haspopup="dialog"
                onClick={() => { haptic("medium"); setCreateOpen(true) }}
                className="justify-self-center -mt-7 w-14 h-14 rounded-[20px] flex items-center justify-center transition-transform active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #2ee6a8, #22c3ee)",
                  color: "#04110c",
                  boxShadow: "0 10px 28px -6px rgba(46,230,168,0.65), 0 0 0 5px var(--bg-base)",
                }}
              >
                <Plus size={26} strokeWidth={2.8} />
              </button>
            )
          }
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => haptic()}
              aria-current={tab.on ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-1 h-full transition-transform active:scale-90"
              style={{ color: tab.on ? "var(--accent-hi)" : "var(--text-secondary)" }}
            >
              {tab.avatar ? (
                <span
                  className="w-[26px] h-[26px] rounded-full p-[2px] flex"
                  style={{ background: tab.on ? "var(--accent-hi)" : "linear-gradient(135deg, #2ee6a8, #22c3ee)" }}
                >
                  <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                    {user.image
                      ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                      : <User size={13} style={{ color: "var(--text-primary)" }} />}
                  </span>
                </span>
              ) : (
                <Icon size={24} strokeWidth={tab.on ? 2.5 : 2} />
              )}
              <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
              {!!tab.badge && (
                <span
                  className="absolute top-2 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "var(--accent-hi)", color: "#04110c" }}
                >
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} />}
    </>
  )
}
