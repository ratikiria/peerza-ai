"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, Trash2, TrendingUp, TrendingDown, Briefcase, ShieldAlert, Sparkles, Info, RotateCcw, X, BarChart3, PieChart, ShieldCheck, RefreshCw } from "lucide-react"
import AddHoldingDialog from "./AddHoldingDialog"
import { CLASS_VOL, riskBand, type AssetType } from "@/lib/portfolio"

const INTRO_DISMISSED_KEY = "peerza-portfolio-intro-dismissed-v1"

interface Holding {
  id: string
  symbol: string
  name: string
  assetType: AssetType
  priceKey: string
  quantity: number
  avgCost: number | null
  sector: string | null
  region: string | null
}

interface Portfolio {
  id: string
  name: string
  baseCurrency: string
  holdings: Holding[]
}

interface Price {
  id: string
  symbol: string
  price: number       // in USD
  change: number      // 24h % change
  up: boolean
}

const ASSET_COLORS: Record<AssetType, string> = {
  stock:  "#3b82f6",
  etf:    "#10b981",
  crypto: "#f59e0b",
  bond:   "#a855f7",
  cash:   "#6b7280",
}


// Sector palette — predictable + accessible. Unknown bucket gets gray.
const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3b82f6",
  Healthcare: "#10b981",
  "Financial Services": "#f59e0b",
  "Consumer Cyclical": "#ec4899",
  "Consumer Defensive": "#84cc16",
  "Communication Services": "#06b6d4",
  Industrials: "#a855f7",
  Energy: "#ef4444",
  Utilities: "#eab308",
  "Real Estate": "#f97316",
  "Basic Materials": "#14b8a6",
  Crypto: "#f59e0b",
  "Fixed Income": "#a855f7",
  Cash: "#6b7280",
  Unknown: "#475569",
}

function fmtMoney(v: number) {
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

export default function PortfolioPage() {
  const t = useTranslations("Portfolio")
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [prices, setPrices] = useState<Record<string, Price>>({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [refreshingSectors, setRefreshingSectors] = useState(false)

  // Hydrate the intro card visibility from localStorage. We only show it on
  // the first visit; users can re-open via the help icon if they dismiss it.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_DISMISSED_KEY)) setShowIntro(true)
    } catch {}
  }, [])

  function dismissIntro() {
    setShowIntro(false)
    try { localStorage.setItem(INTRO_DISMISSED_KEY, "1") } catch {}
  }

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio")
      if (res.ok) {
        const data = await res.json()
        setPortfolio(data.portfolio)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadPortfolio() }, [loadPortfolio])

  // Fetch live prices whenever holdings change. Reuses /api/market/prices.
  const loadPrices = useCallback(async (holdings: Holding[]) => {
    if (holdings.length === 0) return
    const crypto = holdings.filter((h) => h.assetType === "crypto").map((h) => h.priceKey).filter(Boolean)
    const stooq  = holdings.filter((h) => h.assetType !== "crypto" && h.assetType !== "cash").map((h) => h.priceKey).filter(Boolean)
    if (crypto.length === 0 && stooq.length === 0) return

    const params = new URLSearchParams()
    if (crypto.length > 0) params.set("crypto", crypto.join(","))
    if (stooq.length > 0)  params.set("stooq",  stooq.join(","))
    try {
      const res = await fetch(`/api/market/prices?${params.toString()}`)
      if (res.ok) {
        const fresh: Price[] = await res.json()
        const map: Record<string, Price> = {}
        for (const p of fresh) {
          map[p.id] = p
          // Match by symbol too — Stooq sometimes returns the symbol not the id
          map[p.symbol] = p
        }
        setPrices(map)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!portfolio) return
    loadPrices(portfolio.holdings)
    const iv = setInterval(() => loadPrices(portfolio.holdings), 60_000)
    return () => clearInterval(iv)
  }, [portfolio, loadPrices])

  async function removeHolding(id: string) {
    if (!confirm(t("remove_holding"))) return
    const res = await fetch(`/api/portfolio/holdings/${id}`, { method: "DELETE" })
    if (res.ok) loadPortfolio()
  }

  async function resetPortfolio() {
    if (!confirm(t("reset_confirm"))) return
    setResetting(true)
    try {
      await fetch("/api/portfolio/holdings", { method: "DELETE" })
      await loadPortfolio()
    } finally {
      setResetting(false)
    }
  }

  async function refreshSectors() {
    setRefreshingSectors(true)
    try {
      await fetch("/api/portfolio/backfill-sectors", { method: "POST" })
      await loadPortfolio()
    } finally {
      setRefreshingSectors(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const enriched = useMemo(() => {
    if (!portfolio) return []
    return portfolio.holdings.map((h) => {
      // Cash holdings: 1 unit = 1 USD by convention (qty is the dollar amount)
      const livePrice = h.assetType === "cash" ? 1 : (prices[h.priceKey]?.price ?? prices[h.symbol]?.price ?? 0)
      const value = h.quantity * livePrice
      const costBasis = h.avgCost != null ? h.quantity * h.avgCost : null
      const pnl = costBasis != null ? value - costBasis : null
      const pnlPct = costBasis != null && costBasis > 0 ? (pnl! / costBasis) * 100 : null
      return { ...h, livePrice, value, costBasis, pnl, pnlPct }
    })
  }, [portfolio, prices])

  const totalValue = enriched.reduce((sum, h) => sum + h.value, 0)
  const totalCost  = enriched.reduce((sum, h) => sum + (h.costBasis ?? 0), 0)
  const totalPnl   = totalCost > 0 ? enriched.reduce((sum, h) => sum + (h.pnl ?? 0), 0) : null
  const totalPnlPct = totalCost > 0 && totalPnl != null ? (totalPnl / totalCost) * 100 : null

  // Day change %: weighted by current value
  const dayChangePct = useMemo(() => {
    if (totalValue === 0) return null
    let weighted = 0
    let totalW = 0
    for (const h of enriched) {
      if (h.assetType === "cash") continue
      const p = prices[h.priceKey] ?? prices[h.symbol]
      if (!p) continue
      weighted += (p.change ?? 0) * h.value
      totalW += h.value
    }
    return totalW > 0 ? weighted / totalW : null
  }, [enriched, prices, totalValue])

  // ── Analyses ───────────────────────────────────────────────────────────────

  // 1. Concentration — top holdings
  const concentrated = useMemo(() => {
    if (totalValue === 0) return []
    return [...enriched]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((h) => ({ symbol: h.symbol, name: h.name, value: h.value, weight: h.value / totalValue }))
  }, [enriched, totalValue])

  const topWeight = concentrated[0]?.weight ?? 0
  const concentrationFlag = topWeight > 0.25
  const top3Weight = concentrated.slice(0, 3).reduce((s, x) => s + x.weight, 0)

  // 2. Sector mix
  const sectorMix = useMemo(() => {
    if (totalValue === 0) return []
    const buckets: Record<string, number> = {}
    for (const h of enriched) {
      const key = h.sector || "Unknown"
      buckets[key] = (buckets[key] ?? 0) + h.value
    }
    return Object.entries(buckets)
      .map(([sector, value]) => ({ sector, value, weight: value / totalValue }))
      .sort((a, b) => b.weight - a.weight)
  }, [enriched, totalValue])

  // 3. Asset class split + risk band
  const assetMix = useMemo(() => {
    if (totalValue === 0) return [] as { type: AssetType; value: number; weight: number }[]
    const buckets: Partial<Record<AssetType, number>> = {}
    for (const h of enriched) {
      buckets[h.assetType] = (buckets[h.assetType] ?? 0) + h.value
    }
    return (Object.entries(buckets) as [AssetType, number][])
      .map(([type, value]) => ({ type, value, weight: value / totalValue }))
      .sort((a, b) => b.weight - a.weight)
  }, [enriched, totalValue])

  const riskyWeight = assetMix
    .filter((a) => a.type === "stock" || a.type === "crypto" || a.type === "etf")
    .reduce((s, a) => s + a.weight, 0)
  const band = totalValue > 0 ? riskBand(riskyWeight) : null

  // 4. Volatility estimate — weighted by class default σ
  const portfolioVol = useMemo(() => {
    if (totalValue === 0) return null
    let v = 0
    for (const h of enriched) {
      v += (h.value / totalValue) * (CLASS_VOL[h.assetType] ?? 0.15)
    }
    return v
  }, [enriched, totalValue])

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="h-4 w-32 rounded mb-3" style={{ background: "var(--bg-elevated)" }} />
            <div className="h-8 w-48 rounded" style={{ background: "var(--bg-elevated)" }} />
          </div>
        ))}
      </div>
    )
  }

  const isEmpty = enriched.length === 0

  return (
    <div className="space-y-4">
      {/* Onboarding intro */}
      {showIntro && <IntroCard onDismiss={dismissIntro} />}

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={16} className="text-emerald-400" />
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {portfolio?.name ?? t("title")}
              </h1>
              {!showIntro && (
                <button
                  onClick={() => setShowIntro(true)}
                  className="w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-base)] transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  title={t("show_intro")}
                  aria-label={t("show_intro")}
                >
                  <Info size={12} />
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-3xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
                {fmtMoney(totalValue)}
              </p>
              {dayChangePct != null && (
                <span
                  className="text-sm font-bold flex items-center gap-1 tabular-nums"
                  style={{ color: dayChangePct >= 0 ? "#10b981" : "#f43f5e" }}
                >
                  {dayChangePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}% {t("today")}
                </span>
              )}
            </div>
            {totalPnl != null && totalPnlPct != null && (
              <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                {t("unrealized_pnl")}:{" "}
                <span className="font-semibold tabular-nums"
                  style={{ color: totalPnl >= 0 ? "#10b981" : "#f43f5e" }}>
                  {totalPnl >= 0 ? "+" : ""}{fmtMoney(totalPnl)} ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isEmpty && (
              <>
                <button
                  onClick={refreshSectors}
                  disabled={refreshingSectors}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  title={t("refresh_sectors")}
                >
                  <RefreshCw size={11} className={refreshingSectors ? "animate-spin" : ""} />
                  {refreshingSectors ? t("refreshing") : t("refresh_sectors")}
                </button>
                <button
                  onClick={resetPortfolio}
                  disabled={resetting}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
                  title={t("reset")}
                >
                  <RotateCcw size={11} />
                  {resetting ? t("resetting") : t("reset")}
                </button>
              </>
            )}
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: "#10b981", color: "#0f1117" }}
            >
              <Plus size={13} /> {t("add_holding")}
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Sparkles size={26} className="text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
            {t("empty_title")}
          </h3>
          <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            {t("empty_body")}
          </p>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            <Plus size={13} /> {t("add_holding")}
          </button>
        </div>
      ) : (
        <>
          {/* Holdings table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("holdings")}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                {t(enriched.length === 1 ? "positions_one" : "positions_other", { count: enriched.length })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    <th className="text-left font-semibold px-5 py-2">{t("col_symbol")}</th>
                    <th className="text-right font-semibold px-3 py-2">{t("col_qty")}</th>
                    <th className="text-right font-semibold px-3 py-2">{t("col_price")}</th>
                    <th className="text-right font-semibold px-3 py-2">{t("col_value")}</th>
                    <th className="text-right font-semibold px-3 py-2">{t("col_weight")}</th>
                    <th className="text-right font-semibold px-3 py-2">{t("col_pnl")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((h) => (
                    <tr key={h.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: ASSET_COLORS[h.assetType] + "22", color: ASSET_COLORS[h.assetType] }}
                          >
                            {h.symbol.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{h.symbol}</p>
                            <p className="text-[10px] truncate max-w-[180px]" style={{ color: "var(--text-secondary)" }}>{h.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right tabular-nums px-3 py-3" style={{ color: "var(--text-primary)" }}>
                        {h.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                      </td>
                      <td className="text-right tabular-nums px-3 py-3" style={{ color: "var(--text-secondary)" }}>
                        {h.livePrice > 0 ? fmtMoney(h.livePrice) : "—"}
                      </td>
                      <td className="text-right tabular-nums font-semibold px-3 py-3" style={{ color: "var(--text-primary)" }}>
                        {fmtMoney(h.value)}
                      </td>
                      <td className="text-right tabular-nums px-3 py-3" style={{ color: "var(--text-secondary)" }}>
                        {totalValue > 0 ? `${(h.value / totalValue * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-right tabular-nums px-3 py-3">
                        {h.pnl != null && h.pnlPct != null ? (
                          <span style={{ color: h.pnl >= 0 ? "#10b981" : "#f43f5e" }}>
                            {h.pnl >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", opacity: 0.5 }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => removeHolding(h.id)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                          aria-label={t("remove_aria", { symbol: h.symbol })}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyses grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* 1. Concentration */}
            <AnalysisCard
              title={t("concentration_title")}
              subtitle={t("concentration_subtitle", { pct: (top3Weight * 100).toFixed(0) })}
            >
              <ul className="space-y-2.5">
                {concentrated.slice(0, 5).map((c) => (
                  <li key={c.symbol}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{c.symbol}</span>
                      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {(c.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${c.weight * 100}%`,
                          background: c.weight > 0.25 ? "#f43f5e" : "#10b981",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {concentrationFlag && (
                <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{t("concentration_flag", { symbol: concentrated[0].symbol, pct: (topWeight * 100).toFixed(0) })}</span>
                </div>
              )}
            </AnalysisCard>

            {/* 2. Asset class split */}
            <AnalysisCard
              title={t("asset_class_title")}
              subtitle={band ? t("asset_class_band", { band: t(`band_${band}`) }) : undefined}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-3 rounded-full overflow-hidden flex-1" style={{ background: "var(--bg-base)" }}>
                  {assetMix.map((a) => (
                    <div
                      key={a.type}
                      className="h-full transition-all"
                      style={{ width: `${a.weight * 100}%`, background: ASSET_COLORS[a.type] }}
                      title={`${t(`asset_label_${a.type}`)} — ${(a.weight * 100).toFixed(1)}%`}
                    />
                  ))}
                </div>
              </div>
              <ul className="space-y-1.5">
                {assetMix.map((a) => (
                  <li key={a.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: ASSET_COLORS[a.type] }} />
                      <span style={{ color: "var(--text-primary)" }}>{t(`asset_label_${a.type}`)}</span>
                    </div>
                    <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {(a.weight * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
              {band && (
                <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {t("asset_class_text", { pct: (riskyWeight * 100).toFixed(0) })}
                </p>
              )}
            </AnalysisCard>

            {/* 3. Sector mix */}
            <AnalysisCard
              title={t("sector_title")}
              subtitle={sectorMix.length > 0 ? t(sectorMix.length === 1 ? "sector_count_one" : "sector_count_other", { count: sectorMix.length }) : undefined}
            >
              <DonutChart
                slices={sectorMix.map((s) => ({
                  label: s.sector,
                  weight: s.weight,
                  color: SECTOR_COLORS[s.sector] ?? SECTOR_COLORS.Unknown,
                }))}
              />
              <ul className="mt-3 space-y-1 max-h-44 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {sectorMix.map((s) => (
                  <li key={s.sector} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: SECTOR_COLORS[s.sector] ?? SECTOR_COLORS.Unknown }} />
                      <span className="truncate" style={{ color: "var(--text-primary)" }}>{s.sector}</span>
                    </div>
                    <span className="tabular-nums flex-shrink-0 ml-2" style={{ color: "var(--text-secondary)" }}>
                      {(s.weight * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            {/* 4. Volatility estimate */}
            <AnalysisCard title={t("vol_title")} subtitle={t("vol_subtitle")}>
              <div className="text-center py-4">
                <p className="text-4xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {portfolioVol != null ? `${(portfolioVol * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  {t("vol_caption")}
                </p>
              </div>
              <div className="text-[11px] leading-relaxed flex items-start gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}>
                <Info size={11} className="flex-shrink-0 mt-0.5" />
                <span>{t("vol_text")}</span>
              </div>
            </AnalysisCard>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl px-4 py-3 text-[11px] leading-relaxed flex items-start gap-2"
            style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", color: "var(--text-secondary)" }}>
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              <b style={{ color: "var(--text-primary)" }}>{t("disclaimer_bold")}</b>{" "}
              {t("disclaimer_text")}
            </span>
          </div>
        </>
      )}

      <AddHoldingDialog open={adding} onClose={() => setAdding(false)} onAdded={loadPortfolio} />
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AnalysisCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        {subtitle && (
          <span className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// Onboarding card — explains what this page does + does NOT do. Dismissable;
// re-openable via the Info icon in the header.
function IntroCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("Portfolio")
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.06) 100%)",
        border: "1px solid rgba(16,185,129,0.25)",
      }}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-base)] transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label={t("intro_dismiss")}
      >
        <X size={13} />
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
        >
          <Briefcase size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            {t("intro_title")}
          </h2>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {t("intro_body_part1")}
            {" "}<b style={{ color: "var(--text-primary)" }}>{t("intro_body_no_advice")}</b>{" "}
            {t("intro_body_part2")}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        <Bullet
          icon={<BarChart3 size={12} />}
          title={t("intro_bullet_concentration_title")}
          text={t("intro_bullet_concentration_text")}
        />
        <Bullet
          icon={<PieChart size={12} />}
          title={t("intro_bullet_mix_title")}
          text={t("intro_bullet_mix_text")}
        />
        <Bullet
          icon={<TrendingUp size={12} />}
          title={t("intro_bullet_vol_title")}
          text={t("intro_bullet_vol_text")}
        />
        <Bullet
          icon={<ShieldCheck size={12} />}
          title={t("intro_bullet_advice_title")}
          text={t("intro_bullet_advice_text")}
        />
      </div>
    </div>
  )
}

function Bullet({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug px-2.5 py-2 rounded-lg"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
        {icon}
      </div>
      <div>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{title}</p>
        <p style={{ color: "var(--text-secondary)" }}>{text}</p>
      </div>
    </div>
  )
}

// Compact donut. Slices < 1% are merged into "Other".
function DonutChart({ slices }: { slices: { label: string; weight: number; color: string }[] }) {
  const cleaned = slices.filter((s) => s.weight > 0.005)
  const cx = 60, cy = 60, r = 48, sw = 14

  if (cleaned.length === 0) {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-base)" strokeWidth={sw} />
      </svg>
    )
  }

  // For a single slice that fills the donut, draw a full circle (avoids the
  // SVG arc-180-degree edge case where start==end produces nothing).
  if (cleaned.length === 1) {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={cleaned[0].color} strokeWidth={sw} />
      </svg>
    )
  }

  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-base)" strokeWidth={sw} />
      {cleaned.map((s, i) => {
        const dash = s.weight * circumference
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={sw}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}
