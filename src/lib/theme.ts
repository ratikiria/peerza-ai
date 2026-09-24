// Theme state shared by the Settings toggle and the navbar quick toggle.
// The pre-paint script in app/layout.tsx reads the same storage key.
export const THEME_STORAGE_KEY = "peerza-theme-v1"
export const THEME_EVENT = "peerza:theme"

export type ThemeMode = "system" | "dark" | "light"
export type ResolvedTheme = "dark" | "light"

export function readThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch {}
  // Missing key → dark, the brand default (not OS preference).
  return "dark"
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

export function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode)
  document.documentElement.setAttribute("data-theme", resolved)
  // Mobile browser chrome / PWA status bar. Matches --bg-card for each theme.
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "light" ? "#ffffff" : "#0f1117")
}

// useSyncExternalStore plumbing — both toggles subscribe to the same event.
export function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange)
  return () => window.removeEventListener(THEME_EVENT, onChange)
}

export function setThemeMode(mode: ThemeMode) {
  // Persist "system" explicitly — absence of a key means "never set".
  try { localStorage.setItem(THEME_STORAGE_KEY, mode) } catch {}
  applyTheme(mode)
  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_EVENT, { detail: mode }))
}
