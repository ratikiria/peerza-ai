"use client"

import { useEffect, useRef, useState } from "react"
import {
  UserPlus, UserCheck, Heart, MessageSquare, Repeat, Mail, Phone, Users,
} from "lucide-react"

type Key =
  | "FOLLOW"
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "POST_LIKE"
  | "POST_COMMENT"
  | "POST_SHARE"
  | "MESSAGE"
  | "CALL"

type Prefs = Record<Key, boolean>

const ITEMS: { key: Key; title: string; hint: string; icon: React.ReactNode }[] = [
  { key: "FOLLOW",              title: "New followers",            hint: "When someone follows you",                              icon: <UserPlus size={15} /> },
  { key: "CONNECTION_REQUEST",  title: "Connection requests",      hint: "When someone requests to connect",                      icon: <Users size={15} /> },
  { key: "CONNECTION_ACCEPTED", title: "Connections accepted",     hint: "When your request is accepted",                         icon: <UserCheck size={15} /> },
  { key: "POST_LIKE",           title: "Reactions",                hint: "When someone reacts to your posts or comments",         icon: <Heart size={15} /> },
  { key: "POST_COMMENT",        title: "Comments & replies",       hint: "When someone comments on your posts or replies to you", icon: <MessageSquare size={15} /> },
  { key: "POST_SHARE",          title: "Reposts & shares",         hint: "When someone reposts or shares your content",           icon: <Repeat size={15} /> },
  { key: "MESSAGE",             title: "Direct messages",          hint: "When someone sends you a DM",                           icon: <Mail size={15} /> },
  { key: "CALL",                title: "Audio & video calls",      hint: "When someone calls you",                                icon: <Phone size={15} /> },
]

const DEFAULT_PREFS: Prefs = {
  FOLLOW: true,
  CONNECTION_REQUEST: true,
  CONNECTION_ACCEPTED: true,
  POST_LIKE: true,
  POST_COMMENT: true,
  POST_SHARE: true,
  MESSAGE: true,
  CALL: true,
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [savedKey, setSavedKey] = useState<Key | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/profile/notification-prefs")
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data?.prefs) setPrefs({ ...DEFAULT_PREFS, ...data.prefs })
        }
      } catch {}
      if (!cancelled) setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function toggle(key: Key) {
    const next: Prefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      await fetch("/api/profile/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      })
      setSavedKey(key)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSavedKey(null), 1100)
    } catch {
      // revert on error
      setPrefs((p) => ({ ...p, [key]: !next[key] }))
    }
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
      {ITEMS.map((item) => {
        const on = prefs[item.key]
        return (
          <div
            key={item.key}
            className="flex items-center justify-between px-4 py-3 gap-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: on ? "rgba(16,185,129,0.15)" : "var(--bg-base)",
                  color: on ? "#10b981" : "var(--text-secondary)",
                }}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                  {savedKey === item.key && (
                    <span className="text-[10px] text-emerald-400">Saved</span>
                  )}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {item.hint}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggle(item.key)}
              disabled={!loaded}
              role="switch"
              aria-checked={on}
              aria-label={`${on ? "Disable" : "Enable"} ${item.title}`}
              className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{
                background: on ? "#10b981" : "var(--bg-elevated)",
                border: "1px solid var(--border)",
                opacity: loaded ? 1 : 0.5,
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: on ? 20 : 2,
                  background: on ? "#0f1117" : "var(--text-secondary)",
                }}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
