"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useTranslations } from "next-intl"
import {
  Home, MessageCircle, Bell, Search, TrendingUp, Brain, Gamepad2, User, LogOut,
  Settings, ChevronDown, UserPlus, Check, X, CalendarDays, CandlestickChart,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import LogoAnimated from "@/components/brand/LogoAnimated"
import CountryFlag from "@/components/layout/CountryFlag"
import MessagesFlyout from "@/components/layout/MessagesFlyout"
import NotificationsFlyout from "@/components/layout/NotificationsFlyout"
import ProBadge from "@/components/shared/ProBadge"
import LocaleSwitcher from "@/components/settings/LocaleSwitcher"

// `mobile: true` keeps the icon visible on phones; secondary destinations are
// hidden on small screens and reachable via the cmd-K search palette.
// `tKey` looks up the translated label in the Nav namespace.
const navItems = [
  { href: "/feed",          icon: Home,             tKey: "feed",         mobile: true  },
  { href: "/messages",      icon: MessageCircle,    tKey: "messages",     mobile: true  },
  { href: "/notifications", icon: Bell,             tKey: "notifications", mobile: true },
  { href: "/workspace",     icon: CandlestickChart, tKey: "workspace",    mobile: false },
  { href: "/investments",   icon: TrendingUp,       tKey: "investments",  mobile: false },
  { href: "/calendar",      icon: CalendarDays,     tKey: "calendar",     mobile: false },
  { href: "/ai-tutor",      icon: Brain,            tKey: "ai_tutor",     mobile: false },
  { href: "/games",         icon: Gamepad2,         tKey: "games",        mobile: false },
] as const

interface NavbarProps {
  user: {
    name: string
    username: string
    image?: string | null
    isPremium: boolean
    isPro?: boolean
  }
}

export default function Navbar({ user }: NavbarProps) {
  const t = useTranslations("Nav")
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [requests, setRequests] = useState<{
    id: string
    requester: { id: string; name: string; username: string; image?: string | null }
  }[]>([])
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl K")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const requestsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)) {
      setShortcutLabel("⌘ K")
    }
  }, [])

  useEffect(() => {
    async function fetchRequests() {
      const res = await fetch("/api/connections/pending")
      if (res.ok) setRequests(await res.json())
    }
    fetchRequests()
    const iv = setInterval(fetchRequests, 15000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (requestsRef.current && !requestsRef.current.contains(e.target as Node)) {
        setShowRequests(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleAccept(requesterId: string, connectionId: string) {
    const res = await fetch(`/api/connections/${requesterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== connectionId))
  }

  async function handleDecline(requesterId: string, connectionId: string) {
    const res = await fetch(`/api/connections/${requesterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    })
    if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== connectionId))
  }

  function openPalette() {
    window.dispatchEvent(new CustomEvent("peerza:open-palette"))
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-3"
      style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/feed" className="flex items-center gap-2.5">
          <LogoAnimated size={44} />
        </Link>
        <span className="hidden sm:inline-flex"><CountryFlag /></span>
        <div className="hidden sm:flex"><LocaleSwitcher variant="compact" /></div>
      </div>

      {/* Search — opens cmd-K palette */}
      <button
        type="button"
        data-tour="search"
        onClick={openPalette}
        className="flex-1 max-w-xs flex items-center gap-2 text-sm pl-3 pr-2 py-2 rounded-xl outline-none transition-colors hover:opacity-90"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
        title="Open search (Ctrl/Cmd + K)"
      >
        <Search size={14} />
        <span className="flex-1 text-left truncate">{t("search_placeholder")}</span>
        <kbd
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border hidden sm:inline-block"
          style={{ borderColor: "var(--border)" }}
        >
          {shortcutLabel}
        </kbd>
      </button>

      {/* Nav icons */}
      <div className="flex items-center gap-0.5">
        {navItems.map(({ href, icon: Icon, tKey, mobile }) => {
          if (href === "/messages") {
            return <MessagesFlyout key={href} active={pathname.startsWith("/messages")} />
          }
          if (href === "/notifications") {
            return <NotificationsFlyout key={href} active={pathname.startsWith("/notifications")} />
          }
          const active = pathname.startsWith(href)
          const tourKey = href.replace(/^\//, "")
          const label = t(tKey)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              data-tour={`nav-${tourKey}`}
              className={cn(
                "relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all",
                mobile ? "flex" : "hidden md:flex",
                active
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
              )}
            >
              <Icon size={20} />
            </Link>
          )
        })}
      </div>

      {/* Connection requests */}
      <div className="relative flex-shrink-0" ref={requestsRef}>
        <button
          data-tour="requests"
          onClick={() => setShowRequests((v) => !v)}
          title={t("connection_requests")}
          className={`relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all ${
            showRequests
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
          }`}
        >
          <UserPlus size={20} />
          {requests.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-gray-950 text-[9px] font-bold rounded-full flex items-center justify-center">
              {requests.length > 9 ? "9+" : requests.length}
            </span>
          )}
        </button>

        {showRequests && (
          <div
            className="absolute top-12 right-0 w-72 rounded-2xl shadow-2xl py-3 z-50"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold px-4 pb-2" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
              {t("connection_requests_heading")} {requests.length > 0 && `(${requests.length})`}
            </p>

            {requests.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--text-secondary)" }}>
                {t("no_pending_requests")}
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-base)] transition-colors">
                    <Link href={`/profile/${req.requester.username}`} onClick={() => setShowRequests(false)}
                      className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)" }}>
                        {req.requester.image
                          ? <img src={req.requester.image} alt={req.requester.name} className="w-full h-full object-cover" />
                          : <User size={16} className="text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {req.requester.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          @{req.requester.username}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req.requester.id, req.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                        title="Accept"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => handleDecline(req.requester.id, req.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        title="Decline"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile dropdown */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          data-tour="profile"
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors hover:bg-[var(--bg-base)]"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center overflow-hidden ring-2 ring-emerald-500/30">
            {user.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={15} className="text-emerald-400" />
            )}
          </div>
          <span className="text-sm font-medium hidden md:block max-w-[120px] truncate" style={{ color: "var(--text-primary)" }}>
            {user.name.split(" ")[0]}
          </span>
          <ChevronDown size={14} className="text-[var(--text-secondary)] hidden md:block" />
        </button>

        {showDropdown && (
          <div
            className="absolute top-12 right-0 w-56 rounded-2xl shadow-2xl py-2 z-50"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                {user.name}
                {user.isPro && <ProBadge size="xs" />}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
              {user.isPro ? (
                <span className="mt-1.5 inline-block text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">{t("pro_badge")}</span>
              ) : (
                <Link
                  href="/pro"
                  onClick={() => setShowDropdown(false)}
                  className="mt-1.5 inline-block text-[10px] hover:opacity-80 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide transition-opacity"
                  style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px dashed rgba(16,185,129,0.4)" }}
                >
                  {t("upgrade_cta")}
                </Link>
              )}
            </div>
            <Link
              href={`/profile/${user.username}`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <User size={15} /> {t("view_profile")}
            </Link>
            <Link
              href="/settings"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-base)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <Settings size={15} /> {t("settings")}
            </Link>
            <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 w-full transition-colors hover:bg-[var(--bg-base)]"
            >
              <LogOut size={15} /> {t("sign_out")}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
