"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Home, MessageCircle, Bell, TrendingUp, Brain, Gamepad2,
  CalendarDays, BookOpen, Settings, User as UserIcon, Trophy, Sparkles,
  ArrowRight, FileText, Hash, Star,
} from "lucide-react"
import enDict from "@/data/dictionary/en.json"

type ApiUser = {
  id: string
  name: string
  username: string
  image: string | null
  bio: string | null
  isPro: boolean
}
type ApiPost = {
  id: string
  content: string
  createdAt: string
  ticker: string | null
  author: { username: string; name: string; image: string | null }
}
type ApiChallenge = {
  id: string
  name: string
  description: string | null
  style: "INVESTMENT" | "TRADING" | "MIXED"
  status: "UPCOMING" | "ACTIVE" | "ENDED"
  _count: { participants: number }
}
type ApiResp = { users: ApiUser[]; posts: ApiPost[]; challenges: ApiChallenge[] }

type DictEntry = {
  id: string
  name: string
  abbreviation: string
  category: string
  country: string
  definition: string
}

type FlatItem = {
  key: string
  group: "Pages" | "Users" | "Posts" | "Challenges" | "Dictionary"
  href: string
  icon: React.ReactNode
  primary: React.ReactNode
  secondary?: React.ReactNode
  trailing?: React.ReactNode
}

const PAGES: { href: string; label: string; hint: string; icon: React.ReactNode }[] = [
  { href: "/feed", label: "Feed", hint: "Home timeline", icon: <Home size={16} /> },
  { href: "/messages", label: "Messages", hint: "DMs and chats", icon: <MessageCircle size={16} /> },
  { href: "/notifications", label: "Notifications", hint: "Activity inbox", icon: <Bell size={16} /> },
  { href: "/investments", label: "Investments", hint: "Trading challenges", icon: <TrendingUp size={16} /> },
  { href: "/calendar", label: "Economic Calendar", hint: "Macro events", icon: <CalendarDays size={16} /> },
  { href: "/dictionary", label: "Dictionary", hint: "Macro term explanations", icon: <BookOpen size={16} /> },
  { href: "/ai-tutor", label: "AI Tutor (Aria)", hint: "Ask anything finance", icon: <Brain size={16} /> },
  { href: "/games", label: "Games", hint: "Play to learn", icon: <Gamepad2 size={16} /> },
  { href: "/pro", label: "Pro membership", hint: "Upgrade · $10/mo", icon: <Star size={16} /> },
  { href: "/settings", label: "Settings", hint: "Account, privacy, voice", icon: <Settings size={16} /> },
]

function styleBadge(style: ApiChallenge["style"]) {
  if (style === "INVESTMENT") return { label: "Investment", emoji: "💼", color: "text-blue-400" }
  if (style === "TRADING") return { label: "Trading", emoji: "⚡", color: "text-orange-400" }
  return { label: "Mixed", emoji: "🔀", color: "text-emerald-400" }
}

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [api, setApi] = useState<ApiResp>({ users: [], posts: [], challenges: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Global keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape" && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    function onCustomOpen() { setOpen(true) }
    window.addEventListener("peerza:open-palette", onCustomOpen)
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("peerza:open-palette", onCustomOpen)
    }
  }, [open])

  // Focus input + reset state on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIdx(0)
      setApi({ users: [], posts: [], challenges: [] })
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Debounced API fetch (only when query is non-trivial)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setApi({ users: [], posts: [], challenges: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) setApi(await res.json())
        else setApi({ users: [], posts: [], challenges: [] })
      } catch {
        setApi({ users: [], posts: [], challenges: [] })
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Client-side filters
  const dictMatches: DictEntry[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const entries = (enDict as { entries: DictEntry[] }).entries
    return entries
      .filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.abbreviation.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [query])

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGES
    return PAGES.filter((p) =>
      p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q)
    )
  }, [query])

  // Flatten in display order for keyboard navigation
  const items: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = []

    pageMatches.forEach((p) => {
      out.push({
        key: `page:${p.href}`,
        group: "Pages",
        href: p.href,
        icon: p.icon,
        primary: p.label,
        secondary: p.hint,
      })
    })

    api.users.forEach((u) => {
      out.push({
        key: `user:${u.id}`,
        group: "Users",
        href: `/profile/${u.username}`,
        icon: u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt="" className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <UserIcon size={16} />
        ),
        primary: (
          <span className="inline-flex items-center gap-1.5">
            {u.name}
            {u.isPro && <Star size={11} className="text-emerald-400 fill-emerald-400" />}
          </span>
        ),
        secondary: `@${u.username}${u.bio ? ` · ${u.bio.slice(0, 60)}` : ""}`,
      })
    })

    api.posts.forEach((p) => {
      out.push({
        key: `post:${p.id}`,
        group: "Posts",
        href: `/feed?post=${p.id}`,
        icon: p.ticker ? <Hash size={16} /> : <FileText size={16} />,
        primary: p.ticker ? `$${p.ticker} · ${p.author.name}` : p.author.name,
        secondary: p.content.replace(/\n/g, " ").slice(0, 90) || "(no text)",
        trailing: <span className="text-[10px] text-[var(--text-secondary)]">@{p.author.username}</span>,
      })
    })

    api.challenges.forEach((c) => {
      const sb = styleBadge(c.style)
      out.push({
        key: `challenge:${c.id}`,
        group: "Challenges",
        href: `/investments/${c.id}`,
        icon: <Trophy size={16} />,
        primary: c.name,
        secondary: `${sb.emoji} ${sb.label} · ${c.status} · ${c._count.participants} player${c._count.participants === 1 ? "" : "s"}`,
      })
    })

    dictMatches.forEach((d) => {
      out.push({
        key: `dict:${d.id}`,
        group: "Dictionary",
        href: `/dictionary?entry=${encodeURIComponent(d.id)}`,
        icon: <BookOpen size={16} />,
        primary: d.name,
        secondary: `${d.abbreviation} · ${d.definition.slice(0, 90)}…`,
      })
    })

    return out
  }, [pageMatches, api, dictMatches])

  // Reset active index when items change
  useEffect(() => {
    setActiveIdx(0)
  }, [query, items.length])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    if (el) el.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  const navigate = useCallback((item: FlatItem) => {
    setOpen(false)
    router.push(item.href)
  }, [router])

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const it = items[activeIdx]
      if (it) navigate(it)
    } else if (e.key === "Home") {
      setActiveIdx(0)
    } else if (e.key === "End") {
      setActiveIdx(items.length - 1)
    }
  }

  if (!open) return null

  // Group items in display order while preserving the global flat index for keyboard nav
  const grouped: { group: FlatItem["group"]; items: { item: FlatItem; idx: number }[] }[] = []
  items.forEach((item, idx) => {
    let bucket = grouped.find((g) => g.group === item.group)
    if (!bucket) {
      bucket = { group: item.group, items: [] }
      grouped.push(bucket)
    }
    bucket.items.push({ item, idx })
  })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search people, posts, challenges, terms…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          {loading && (
            <span className="text-[10px] text-[var(--text-secondary)]">Searching…</span>
          )}
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Sparkles size={20} className="mx-auto mb-2 opacity-30 text-[var(--text-secondary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                {query ? `No results for "${query}"` : "Start typing to search"}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map((g) => (
                <div key={g.group} className="px-2 py-1">
                  <p
                    className="text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {g.group}
                  </p>
                  <div>
                    {g.items.map(({ item, idx }) => {
                      const active = idx === activeIdx
                      return (
                        <button
                          key={item.key}
                          data-idx={idx}
                          type="button"
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => navigate(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                          style={{
                            background: active ? "rgba(16,185,129,0.10)" : "transparent",
                            color: active ? "var(--text-primary)" : "var(--text-secondary)",
                          }}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? "text-emerald-400" : ""}`}
                            style={{ background: active ? "rgba(16,185,129,0.15)" : "var(--bg-base)" }}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span
                              className="block text-sm font-medium truncate"
                              style={{ color: active ? "var(--text-primary)" : "var(--text-primary)" }}
                            >
                              {item.primary}
                            </span>
                            {item.secondary && (
                              <span
                                className="block text-xs truncate"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {item.secondary}
                              </span>
                            )}
                          </span>
                          {item.trailing}
                          <ArrowRight
                            size={14}
                            className={active ? "text-emerald-400" : "text-transparent"}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 text-[10px] border-t"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "var(--bg-base)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>↑↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono px-1 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>↵</kbd>
              open
            </span>
          </div>
          <span>Peerza Search</span>
        </div>
      </div>
    </div>
  )
}
