"use client"

import { useEffect, useState } from "react"

interface Ticker {
  sym: string
  price: string
  change: string
  up: boolean
}

const FALLBACK: Ticker[] = [
  { sym: "BTC",     price: "—", change: "—", up: true },
  { sym: "S&P 500", price: "—", change: "—", up: true },
  { sym: "NVDA",    price: "—", change: "—", up: true },
  { sym: "EUR/USD", price: "—", change: "—", up: true },
  { sym: "Gold",    price: "—", change: "—", up: true },
  { sym: "TSLA",    price: "—", change: "—", up: true },
]

interface RawPrice {
  id: string
  symbol: string
  name: string
  price: number
  change: number
  up: boolean
}

const SYMBOL_LABEL: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  "^spx": "S&P 500",
  "nvda.us": "NVDA",
  "tsla.us": "TSLA",
  "aapl.us": "AAPL",
  "msft.us": "MSFT",
  eurusd: "EUR/USD",
  gbpusd: "GBP/USD",
  usdjpy: "USD/JPY",
  xauusd: "Gold",
  "cl.f": "BRENT",
}

function fmtPrice(p: number): string {
  if (p >= 10000) return Math.round(p).toLocaleString()
  if (p >= 100) return p.toFixed(2)
  if (p >= 10) return p.toFixed(2)
  if (p >= 1) return p.toFixed(4)
  return p.toFixed(5)
}

function fmtChange(c: number): string {
  const sign = c >= 0 ? "+" : "−"
  return `${sign}${Math.abs(c).toFixed(2)}%`
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<Ticker[]>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    async function fetchPrices() {
      try {
        const url =
          "/api/market/prices?crypto=bitcoin,ethereum&stooq=^spx,nvda.us,tsla.us,aapl.us,msft.us,eurusd,gbpusd,usdjpy,xauusd,cl.f"
        const res = await fetch(url)
        if (!res.ok) return
        const data = (await res.json()) as RawPrice[]
        if (!Array.isArray(data) || cancelled) return
        const order = [
          "bitcoin", "^spx", "nvda.us", "eurusd", "xauusd", "tsla.us",
          "aapl.us", "ethereum", "cl.f", "msft.us", "gbpusd", "usdjpy",
        ]
        const next: Ticker[] = order
          .map((id) => data.find((d) => d.id === id))
          .filter((d): d is RawPrice => !!d)
          .map((d) => ({
            sym: SYMBOL_LABEL[d.id] || d.symbol.toUpperCase(),
            price: fmtPrice(d.price),
            change: fmtChange(d.change),
            up: d.up,
          }))
        if (next.length > 0) setTickers(next)
      } catch {
        // keep fallback
      }
    }
    fetchPrices()
    const id = setInterval(fetchPrices, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div className="relative w-full border-b border-white/5 bg-black/40 backdrop-blur-md py-2 overflow-hidden">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-1.5 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
        Live
      </span>
      <div
        className="flex gap-10 pl-20 animate-[pz-ticker_75s_linear_infinite] whitespace-nowrap"
        style={{ willChange: "transform" }}
      >
        {[...tickers, ...tickers, ...tickers].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400 font-semibold">{t.sym}</span>
            <span className="text-gray-200">{t.price}</span>
            <span className={t.up ? "text-emerald-400" : "text-rose-400"}>{t.change}</span>
          </span>
        ))}
      </div>
      {/* Soft fade edges so the loop seam isn't visible */}
      <div className="pointer-events-none absolute inset-y-0 left-16 w-12 bg-gradient-to-r from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/60 to-transparent" />
    </div>
  )
}
