"use client"

import { useEffect, useState } from "react"

// Thin frosted market strip fixed under the Navbar (Glass Terminal, Option D).
// Theme-aware sibling of components/auth/LiveTicker, which is dark-only.

interface RawPrice {
  id: string
  symbol: string
  price: number
  change: number
  up: boolean
}

interface Tick {
  id: string
  sym: string
  price: string
  change: string
  up: boolean
}

// Display order + labels. Ids match what /api/market/prices echoes back.
const SYMBOLS: { id: string; label: string }[] = [
  { id: "bitcoin",  label: "BTC" },
  { id: "ethereum", label: "ETH" },
  { id: "^spx",     label: "S&P 500" },
  { id: "nvda.us",  label: "NVDA" },
  { id: "tsla.us",  label: "TSLA" },
  { id: "aapl.us",  label: "AAPL" },
  { id: "eurusd",   label: "EUR/USD" },
  { id: "xauusd",   label: "GOLD" },
  { id: "usdgel",   label: "USD/GEL" },
]

const CRYPTO = ["bitcoin", "ethereum"]
const URL_ =
  `/api/market/prices?crypto=${CRYPTO.join(",")}` +
  `&stooq=${SYMBOLS.map((s) => s.id).filter((id) => !CRYPTO.includes(id)).join(",")}`

function fmtPrice(p: number): string {
  if (p >= 10000) return Math.round(p).toLocaleString("en-US")
  if (p >= 10) return p.toFixed(2)
  return p.toFixed(4)
}

function fmtChange(c: number): string {
  return `${c >= 0 ? "+" : "−"}${Math.abs(c).toFixed(2)}%`
}

export default function TickerTape() {
  const [ticks, setTicks] = useState<Tick[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(URL_)
        if (!res.ok) return
        const data = (await res.json()) as RawPrice[]
        if (!Array.isArray(data) || cancelled) return
        const next = SYMBOLS.flatMap(({ id, label }) => {
          const d = data.find((x) => x.id === id)
          if (!d || !Number.isFinite(d.price) || d.price <= 0) return []
          return [{ id, sym: label, price: fmtPrice(d.price), change: fmtChange(d.change), up: d.up }]
        })
        if (next.length > 0) setTicks(next)
      } catch {
        // keep last good values
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  return (
    <div
      className="pz-tape fixed left-0 right-0 z-40 overflow-hidden flex items-center font-mono text-[11.5px]"
      style={{
        top: "var(--nav-h)",
        height: "var(--tape-h)",
        background: "var(--tape-bg)",
        borderBottom: "1px solid var(--glass-border)",
        WebkitBackdropFilter: "blur(14px)",
        backdropFilter: "blur(14px)",
        color: "var(--text-secondary)",
      }}
      aria-label="Market prices"
    >
      {ticks.length > 0 && (
        // Content is rendered twice so the -50% loop is seamless.
        <div className="pz-tape-track flex whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-7 pl-7" aria-hidden={copy === 1 || undefined}>
              {ticks.map((t) => (
                <span key={t.id} className="inline-flex items-center tabular-nums">
                  <span
                    className="w-1.5 h-1.5 rounded-full mr-2"
                    style={{ background: t.up ? "var(--up)" : "var(--down)", boxShadow: `0 0 8px ${t.up ? "var(--up)" : "var(--down)"}` }}
                  />
                  <b className="font-semibold mr-1.5" style={{ color: "var(--text-primary)" }}>{t.sym}</b>
                  {t.price}
                  <span className="ml-1.5" style={{ color: t.up ? "var(--up)" : "var(--down)" }}>{t.change}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
