"use client"

import { useEffect, useRef } from "react"

// Minimal type for the global TradingView object exposed by tv.js.
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown
    }
  }
}

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js"
const TV_SCRIPT_ID  = "tradingview-tv-js"

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.TradingView) return Promise.resolve()
  const existing = document.getElementById(TV_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.id = TV_SCRIPT_ID
    s.src = TV_SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load TradingView script"))
    document.body.appendChild(s)
  })
}

interface Props {
  symbol: string
  interval?: string
  theme?: "dark" | "light"
}

export default function TradingViewChart({ symbol, interval = "60", theme = "dark" }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const containerIdRef = useRef(`tv_chart_${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.TradingView) return
      // Reset container — widget mutates DOM and we want a fresh mount on prop changes.
      ref.current.innerHTML = `<div id="${containerIdRef.current}" style="height:100%;width:100%"></div>`
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme,
        style: "1",
        locale: "en",
        toolbar_bg: theme === "dark" ? "#0f1117" : "#ffffff",
        enable_publishing: false,
        withdateranges: true,
        allow_symbol_change: true,
        save_image: true,
        details: true,
        hotlist: true,
        calendar: true,
        studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
        container_id: containerIdRef.current,
      })
    })
    return () => { cancelled = true }
  }, [symbol, interval, theme])

  return <div ref={ref} className="w-full h-full" />
}
