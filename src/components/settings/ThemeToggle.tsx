"use client"

import { useEffect, useSyncExternalStore } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { applyTheme, readThemeMode, setThemeMode, subscribeTheme, type ThemeMode } from "@/lib/theme"

const noopSubscribe = () => () => {}

export default function ThemeToggle() {
  // Stays in sync with the navbar quick toggle via the shared theme event.
  const mode = useSyncExternalStore<ThemeMode>(subscribeTheme, readThemeMode, () => "dark")
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  // Re-apply when system pref changes if user is on "system"
  useEffect(() => {
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    function onChange() { applyTheme("system") }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  function pick(next: ThemeMode) {
    setThemeMode(next)
  }

  const options: { key: ThemeMode; icon: React.ReactNode; label: string }[] = [
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
