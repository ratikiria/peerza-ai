"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

const STORAGE_KEY = "peerza-theme-v1"
type Mode = "system" | "dark" | "light"

function applyResolved(mode: Mode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : mode
  document.documentElement.setAttribute("data-theme", resolved)
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === "light" || v === "dark" || v === "system") setMode(v)
      else setMode("dark")
    } catch {}
    setMounted(true)
  }, [])

  // Re-apply when system pref changes if user is on "system"
  useEffect(() => {
    if (!mounted) return
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    function onChange() { applyResolved("system") }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode, mounted])

  function pick(next: Mode) {
    setMode(next)
    // Persist "system" explicitly — absence of a key means "never set", which
    // now resolves to dark (the brand default), not to OS preference.
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    applyResolved(next)
  }

  const options: { key: Mode; icon: React.ReactNode; label: string }[] = [
    { key: "system", icon: <Monitor size={14} />, label: "System" },
    { key: "light",  icon: <Sun size={14} />,     label: "Light" },
    { key: "dark",   icon: <Moon size={14} />,    label: "Dark" },
  ]

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="min-w-0">
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>Theme</p>
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Switch between dark, light, or follow your system setting.
        </p>
      </div>
      <div
        className="flex items-center rounded-lg p-0.5 flex-shrink-0"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
      >
        {options.map((o) => {
          const active = mode === o.key
          return (
            <button
              key={o.key}
              onClick={() => pick(o.key)}
              disabled={!mounted}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors"
              style={{
                background: active ? "var(--bg-card)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.15)" : undefined,
              }}
              aria-pressed={active}
            >
              {o.icon}
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
