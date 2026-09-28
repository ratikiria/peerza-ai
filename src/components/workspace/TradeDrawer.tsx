"use client"

import { ink } from "@/lib/ink"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { X, Zap, ExternalLink, Loader2, CheckCircle2, Trophy, Info, Building2 } from "lucide-react"
import { tvToTradable, tvToTicker, type Tradable, type TradableClass } from "@/lib/tv-symbols"

interface Props {
  open: boolean
  onClose: () => void
  /** TradingView symbol currently on the chart */
  tv: string
}

type Tab = "paper" | "broker"

interface ChallengeLite {
  id: string
  name: string
  assetClasses: string[]
  virtualCapital: number
}

const CHALLENGE_KEY = "peerza-workspace-challenge-v1"

// ─── Brokers ───────────────────────────────────────────────────────────────
// Deep links open the broker's own site. Only URL shapes we're confident
// about get a ticker; everything else falls back to the broker homepage.

interface Broker {
  name: string
  mono: string
  color: string
  classes: TradableClass[]
  blurb: string
  url: (t: Tradable | null, ticker: string) => string
}

const BROKERS: Broker[] = [
  {
    name: "Robinhood", mono: "R", color: "#00C805", classes: ["stocks", "crypto"],
    blurb: "Commission-free stocks & crypto",
    url: (t) => t?.assetClass === "stocks" ? `https://robinhood.com/us/en/stocks/${t.symbol}/` : "https://robinhood.com/",
  },
  {
    name: "Interactive Brokers", mono: "IB", color: "#D81222", classes: ["stocks", "forex", "commodities", "crypto"],
    blurb: "Global markets, pro-grade tools",
    url: () => "https://www.interactivebrokers.com/",
  },
  {
    name: "Webull", mono: "W", color: "#0A6CFF", classes: ["stocks", "crypto"],
    blurb: "Advanced charts, extended hours",
    url: (t) => t?.assetClass === "stocks" && t.exchange
      ? `https://www.webull.com/quote/${t.exchange}-${t.symbol.toLowerCase()}`
      : "https://www.webull.com/",
  },
  {
    name: "eToro", mono: "e", color: "#13C636", classes: ["stocks", "crypto", "forex", "commodities"],
    blurb: "Social trading & copy portfolios",
    url: (t) => t && t.assetClass !== "commodities"
      ? `https://www.etoro.com/markets/${t.symbol.replace("/", "").toLowerCase()}`
      : "https://www.etoro.com/",
  },
  {
    name: "Coinbase", mono: "C", color: "#0052FF", classes: ["crypto"],
    blurb: "The largest US crypto exchange",
    url: (t) => t?.assetClass === "crypto" && ["bitcoin", "ethereum", "solana", "cardano", "dogecoin", "litecoin", "chainlink"].includes(t.priceKey)
      ? `https://www.coinbase.com/price/${t.priceKey}`
      : "https://www.coinbase.com/",
  },
  {
    name: "Binance", mono: "B", color: "#F0B90B", classes: ["crypto"],
    blurb: "Deepest crypto liquidity",
    url: (t) => t?.assetClass === "crypto" ? `https://www.binance.com/en/trade/${t.symbol}_USDT` : "https://www.binance.com/",
  },
  {
    name: "OANDA", mono: "O", color: "#8B5CF6", classes: ["forex", "commodities"],
    blurb: "FX & metals specialist",
    url: () => "https://www.oanda.com/",
  },
]

function fmtPrice(n: number) {
  return n >= 1
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

function fmtUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function TradeDrawer({ open, onClose, tv }: Props) {
  const [tab, setTab] = useState<Tab>("paper")
  const tradable = useMemo(() => tvToTradable(tv), [tv])
  const ticker = tradable?.symbol ?? tvToTicker(tv)

  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)

  // Live price while the drawer is open
  const loadPrice = useCallback(async () => {
    if (!tradable) { setPrice(null); setChange(null); return }
    const param = tradable.assetType === "crypto"
      ? `?crypto=${encodeURIComponent(tradable.priceKey)}`
      : `?stooq=${encodeURIComponent(tradable.priceKey)}`
    try {
      const res = await fetch(`/api/market/prices${param}`)
      const data = await res.json()
      const list: { id: string; price: number; change?: number }[] = Array.isArray(data) ? data : []
      const entry = list.find((e) => e.id === tradable.priceKey) ?? list[0]
      setPrice(entry?.price ?? null)
      setChange(typeof entry?.change === "number" ? entry.change : null)
    } catch {}
  }, [tradable])

  useEffect(() => {
    if (!open) return
    loadPrice()
    const id = setInterval(loadPrice, 15_000)
    return () => clearInterval(id)
  }, [open, loadPrice])

  // Esc closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const up = (change ?? 0) >= 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          top: 64,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label="Trade"
        aria-hidden={!open}
        className="fixed right-0 z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          top: 64,
          height: "calc(100vh - 64px)",
          width: "min(400px, 100vw)",
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-24px 0 48px rgba(0,0,0,0.35)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 pt-4 pb-4 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(59,130,246,0.10) 100%)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 w-44 h-44 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0) 70%)" }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: ink("#10b981") }}>
                <Zap size={11} fill="currentColor" /> Trade
              </p>
              <p className="text-2xl font-bold tracking-tight mt-1 truncate" style={{ color: "var(--text-primary)" }}>
                {ticker}
              </p>
              <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{tv}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <button
                onClick={onClose}
                className="ml-auto mb-2 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-base)]"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Close trade panel"
              >
                <X size={16} />
              </button>
              {tradable && (
                price != null ? (
                  <>
                    <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      ${fmtPrice(price)}
                    </p>
                    {change != null && (
                      <p className="text-[11px] font-semibold tabular-nums" style={{ color: up ? ink("#10b981") : ink("#f43f5e") }}>
                        {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                      </p>
                    )}
                  </>
                ) : (
                  <Loader2 size={16} className="animate-spin ml-auto" style={{ color: "var(--text-secondary)" }} />
                )
              )}
            </div>
          </div>

          {/* Tabs */}
          <div
            className="relative mt-4 grid grid-cols-2 p-1 rounded-xl"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
          >
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 rounded-lg transition-all duration-300"
              style={{
                left: tab === "paper" ? 4 : "50%",
                width: "calc(50% - 4px)",
                background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
              }}
            />
            {(["paper", "broker"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="relative z-10 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors"
                style={{ color: tab === k ? "#ffffff" : "var(--text-secondary)" }}
              >
                {k === "paper" ? <Trophy size={13} /> : <Building2 size={13} />}
                {k === "paper" ? "Paper trade" : "Your broker"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin" }}>
          {tab === "paper"
            ? <PaperTrade open={open} tradable={tradable} price={price} onTraded={loadPrice} onGoBroker={() => setTab("broker")} />
            : <BrokerList tradable={tradable} ticker={ticker} />}
        </div>
      </aside>
    </>
  )
}

// ─── Paper trade ───────────────────────────────────────────────────────────

function PaperTrade({
  open, tradable, price, onTraded, onGoBroker,
}: {
  open: boolean
  tradable: Tradable | null
  price: number | null
  onTraded: () => void
  onGoBroker: () => void
}) {
  const [challenges, setChallenges] = useState<ChallengeLite[] | null>(null)
  const [challengeId, setChallengeId] = useState<string>("")
  const [cash, setCash] = useState<number | null>(null)
  const [held, setHeld] = useState<number>(0)
  const [side, setSide] = useState<"BUY" | "SELL">("BUY")
  const [qty, setQty] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState("")

  // Active challenges the user is in
  useEffect(() => {
    if (!open || challenges !== null) return
    fetch("/api/challenges?status=ACTIVE&type=mine")
      .then((r) => r.ok ? r.json() : { challenges: [] })
      .then((d) => {
        const list: ChallengeLite[] = Array.isArray(d?.challenges) ? d.challenges : []
        setChallenges(list)
        let saved = ""
        try { saved = localStorage.getItem(CHALLENGE_KEY) ?? "" } catch {}
        setChallengeId(list.find((c) => c.id === saved)?.id ?? list[0]?.id ?? "")
      })
      .catch(() => setChallenges([]))
  }, [open, challenges])

  const loadPortfolio = useCallback(async () => {
    if (!challengeId || !tradable) return
    try {
      const res = await fetch(`/api/challenges/${challengeId}/portfolio`)
      if (!res.ok) return
      const d = await res.json()
      setCash(typeof d.cashBalance === "number" ? d.cashBalance : null)
      const h = (d.holdings ?? []).find((x: { symbol: string }) => x.symbol === tradable.symbol)
      setHeld(h?.quantity ?? 0)
    } catch {}
  }, [challengeId, tradable])

  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  function pickChallenge(id: string) {
    setChallengeId(id)
    setCash(null); setHeld(0); setError(""); setDone(""); setQty("")
    try { localStorage.setItem(CHALLENGE_KEY, id) } catch {}
  }

  if (!tradable) {
    return (
      <Notice
        title="This symbol can't be paper traded"
        body="Indices and some exchanges aren't supported yet. Pick a US stock, a major crypto, an FX pair or a commodity — or trade it with your broker."
        action={<button onClick={onGoBroker} className="text-xs font-semibold" style={{ color: ink("#10b981") }}>See brokers →</button>}
      />
    )
  }

  if (challenges === null) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={20} style={{ color: "var(--text-secondary)" }} /></div>
  }

  if (challenges.length === 0) {
    return (
      <Notice
        title="Join a challenge to paper trade"
        body="Paper trades use the virtual cash from an active Investment Challenge — practice with real prices and climb the leaderboard, no money at risk."
        action={
          <Link href="/investments" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}>
            <Trophy size={13} /> Browse challenges
          </Link>
        }
      />
    )
  }

  const challenge = challenges.find((c) => c.id === challengeId)
  const allowed = !challenge || challenge.assetClasses.length === 0 || challenge.assetClasses.includes(tradable.assetClass)
  const q = Number(qty)
  const total = price != null && q > 0 ? price * q : null
  const maxQty = side === "BUY"
    ? (cash != null && price ? cash / price : 0)
    : held
  const overLimit = q > 0 && q > maxQty + 1e-9
  const canSubmit = allowed && price != null && q > 0 && !overLimit && !busy

  function setPct(p: number) {
    if (!maxQty) return
    const raw = maxQty * p
    const decimals = tradable!.assetType === "stock" ? 0 : 6
    const f = 10 ** decimals
    setQty(String(Math.floor(raw * f) / f || ""))
  }

  async function submit() {
    if (!canSubmit || !tradable) return
    setBusy(true); setError(""); setDone("")
    try {
      const res = await fetch(`/api/challenges/${challengeId}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: tradable.symbol,
          name: tradable.symbol,
          assetType: tradable.assetType,
          priceKey: tradable.priceKey,
          side,
          quantity: q,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Trade failed")
      setDone(`${side === "BUY" ? "Bought" : "Sold"} ${q} ${tradable.symbol} @ $${fmtPrice(data.price)}`)
      setQty("")
      loadPortfolio()
      onTraded()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed")
    } finally {
      setBusy(false)
    }
  }

  const buy = side === "BUY"
  const sideColor = buy ? "#10b981" : "#f43f5e"

  return (
    <div className="space-y-4">
      {/* Challenge */}
      <div>
        <Label>Challenge</Label>
        <select
          value={challengeId}
          onChange={(e) => pickChallenge(e.target.value)}
          className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {challenges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex justify-between mt-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span>Cash <b className="tabular-nums" style={{ color: "var(--text-primary)" }}>{cash != null ? fmtUsd(cash) : "—"}</b></span>
          <span>You hold <b className="tabular-nums" style={{ color: "var(--text-primary)" }}>{held ? `${+held.toFixed(6)} ${tradable.symbol}` : "0"}</b></span>
        </div>
      </div>

      {!allowed ? (
        <Notice
          title={`${tradable.assetClass[0].toUpperCase()}${tradable.assetClass.slice(1)} aren't allowed here`}
          body={`“${challenge?.name}” only allows ${challenge?.assetClasses.join(", ")}. Pick another challenge or another symbol.`}
        />
      ) : (
        <>
          {/* Side */}
          <div className="grid grid-cols-2 gap-2">
            {(["BUY", "SELL"] as const).map((s) => {
              const active = side === s
              const c = s === "BUY" ? "#10b981" : "#f43f5e"
              return (
                <button
                  key={s}
                  onClick={() => { setSide(s); setError(""); setDone("") }}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: active ? c : "var(--bg-base)",
                    color: active ? "#ffffff" : "var(--text-secondary)",
                    border: `1px solid ${active ? c : "var(--border)"}`,
                    boxShadow: active ? `0 6px 18px ${c}55` : "none",
                  }}
                >
                  {s === "BUY" ? "Buy" : "Sell"}
                </button>
              )
            })}
          </div>

          {/* Quantity */}
          <div>
            <Label>Quantity</Label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => { setQty(e.target.value); setError(""); setDone("") }}
                placeholder="0"
                className="w-full text-lg font-semibold tabular-nums pl-3 pr-16 py-2.5 rounded-xl outline-none"
                style={{ background: "var(--bg-base)", border: `1px solid ${overLimit ? "#f43f5e" : "var(--border)"}`, color: "var(--text-primary)" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {tradable.symbol}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  onClick={() => setPct(p)}
                  disabled={!maxQty}
                  className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-[var(--bg-base)] disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {p === 1 ? "Max" : `${p * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-3 space-y-1.5 text-xs" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            <Row k="Market price" v={price != null ? `$${fmtPrice(price)}` : "—"} />
            <Row k={buy ? "Estimated cost" : "Estimated proceeds"} v={total != null ? fmtUsd(total) : "—"} strong />
            {overLimit && (
              <p className="text-[11px] font-semibold" style={{ color: ink("#f43f5e") }}>
                {buy ? "Not enough cash for this size." : `You only hold ${+held.toFixed(6)} ${tradable.symbol}.`}
              </p>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${sideColor} 0%, ${buy ? "#047857" : "#be123c"} 100%)`,
              boxShadow: canSubmit ? `0 8px 22px ${sideColor}55` : "none",
            }}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
            {buy ? "Buy" : "Sell"} {q > 0 ? `${q} ` : ""}{tradable.symbol}
          </button>

          {done && (
            <p className="flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2"
              style={{ background: "rgba(16,185,129,0.12)", color: ink("#10b981") }}>
              <CheckCircle2 size={14} /> {done}
            </p>
          )}
          {error && (
            <p className="text-xs font-semibold rounded-lg px-3 py-2"
              style={{ background: "rgba(244,63,94,0.12)", color: ink("#f43f5e") }}>
              {error}
            </p>
          )}

          <p className="text-[10px] flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <Info size={11} className="flex-shrink-0 mt-px" />
            Virtual money only. Fills at the latest market price inside your challenge.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Brokers ───────────────────────────────────────────────────────────────

function BrokerList({ tradable, ticker }: { tradable: Tradable | null; ticker: string }) {
  const list = tradable ? BROKERS.filter((b) => b.classes.includes(tradable.assetClass)) : BROKERS

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Open <b style={{ color: "var(--text-primary)" }}>{ticker}</b> at your broker to place a real order.
      </p>

      <div className="space-y-2">
        {list.map((b) => (
          <a
            key={b.name}
            href={b.url(tradable, ticker)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.boxShadow = `0 6px 20px ${b.color}33` }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none" }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${b.color} 0%, ${b.color}b3 100%)`,
                color: b.color === "#F0B90B" ? "#1a1a1a" : "#ffffff",
                boxShadow: `0 4px 12px ${b.color}40`,
              }}
            >
              {b.mono}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{b.name}</span>
              <span className="block text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{b.blurb}</span>
            </span>
            <ExternalLink size={14} className="flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-secondary)" }} />
          </a>
        ))}
      </div>

      <div className="rounded-xl p-3 text-[11px]"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px dashed rgba(59,130,246,0.35)", color: "var(--text-secondary)" }}>
        <b style={{ color: "var(--text-primary)" }}>One-click broker connect is coming.</b> Soon you&apos;ll link your
        account and trade from this panel without leaving Peerza.
      </div>

      <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)", opacity: 0.8 }}>
        Links open the broker&apos;s own website. Peerza isn&apos;t affiliated with these brokers, doesn&apos;t place real
        orders, and nothing here is investment advice.
      </p>
    </div>
  )
}

// ─── Bits ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--text-secondary)" }}>{k}</span>
      <span className={`tabular-nums ${strong ? "font-bold" : "font-semibold"}`} style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  )
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-base)", border: "1px dashed var(--border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
