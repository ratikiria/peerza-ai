"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Home,
  Search,
  Bell,
  MessageCircle,
  User,
  TrendingUp,
  Brain,
  Gamepad2,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import Logo from "@/components/brand/Logo"

const nav = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/ai-tutor", label: "AI Tutor", icon: Brain },
  { href: "/games", label: "Games", icon: Gamepad2 },
]

interface SidebarProps {
  user: {
    name: string
    username: string
    image?: string | null
    isPremium: boolean
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function fetchUnread() {
      const res = await fetch("/api/notifications/count")
      if (res.ok) {
        const data = await res.json()
        setUnread(data.unread)
      }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    return () => clearInterval(interval)
  }, [])

  // Clear badge when visiting notifications
  useEffect(() => {
    if (pathname.startsWith("/notifications")) setUnread(0)
  }, [pathname])

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-2">
        <Logo size="lg" />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            )}
          >
            <Icon size={20} />
            {label}
            {href === "/notifications" && unread > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-emerald-500 text-gray-950 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-gray-800 pt-4 mt-4">
        <Link
          href={`/profile/${user.username}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            {user.image ? (
              <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={16} className="text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">@{user.username}</p>
          </div>
          {user.isPremium && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
              PRO
            </span>
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
