"use client"

import { useEffect } from "react"
import { applyTheme, readThemeMode } from "@/lib/theme"

// The landing page and auth screens are designed dark-only (brand hero art).
// Pin dark while they're mounted and restore the user's choice on the way out.
// The pre-paint script in app/layout.tsx does the same for first paint.
export default function ForceDarkTheme() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark")
    return () => applyTheme(readThemeMode())
  }, [])
  return null
}
