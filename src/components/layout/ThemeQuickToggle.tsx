"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { Sun, Moon } from "lucide-react"
import { applyTheme, readThemeMode, resolveTheme, setThemeMode, subscribeTheme, type ResolvedTheme } from "@/lib/theme"

// One-click light/dark switch for the navbar. "System" stays available in
// Settings; clicking here always pins an explicit mode.
export default function ThemeQuickToggle({ variant = "icon", onToggled }: {
  variant?: "icon" | "menu"
  onToggled?: () => void
}) {
  const t = useTranslations("Nav")
  const resolved = useSyncExternalStore<ResolvedTheme>(
    subscribeTheme,
    () => resolveTheme(readThemeMode()),
    () => "dark",
  )

  // The pre-paint script sets data-theme; this also syncs the theme-color meta.
  // Only the icon instance does it so the menu copy doesn't repeat the work.
  useEffect(() => {
    if (variant === "icon") applyTheme(readThemeMode())
  }, [variant])

  const next: ResolvedTheme = resolved === "dark" ? "light" : "dark"
  const label = next === "light" ? t("theme_light") : t("theme_dark")
  const Icon = next === "light" ? Sun : Moon

  function toggle() {
    setThemeMode(next)
    onToggled?.()
  }

  if (variant === "menu") {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-3 px-4 py-2.5 text-sm w-full transition-colors hover:bg-[var(--bg-base)]"
        style={{ color: "var(--text-secondary)" }}
      >
        <Icon size={15} /> {label}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
    >
      <Icon size={18} />
    </button>
  )
}
