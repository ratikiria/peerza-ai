"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Search, X, Loader2, ShieldAlert } from "lucide-react"
import type { AssetType } from "@/lib/portfolio"

interface SearchResult {
  id: string
  symbol: string
  name: string
  source: "crypto" | "yahoo"
  type?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

const TYPE_FROM_SOURCE: Record<string, AssetType> = {
  Crypto:   "crypto",
  EQUITY:   "stock",
  ETF:      "etf",
  INDEX:    "etf",        // user usually buys index *ETFs*; treat as ETF for analysis
  CURRENCY: "cash",
  FUTURE:   "stock",
}

export default function AddHoldingDialog({ open, onClose, onAdded }: Props) {
  const t = useTranslations("Portfolio")
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked]     = useState<SearchResult | null>(null)
  const [assetType, setAssetType] = useState<AssetType>("stock")
  const [qty, setQty]           = useState("")
  const [cost, setCost]         = useState("")
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery(""); setResults([]); setPicked(null); setQty(""); setCost(""); setErr(null)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim() || picked) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`)
        if (res.ok) setResults(await res.json())
      } catch {}
      setSearching(false)
    }, 300)
  }, [query, picked])

  function pick(r: SearchResult) {
    setPicked(r)
    setAssetType(TYPE_FROM_SOURCE[r.type ?? r.source] ?? "stock")
  }

  async function save() {
    if (!picked) return
    const quantity = parseFloat(qty)
    if (isNaN(quantity) || quantity <= 0) {
      setErr(t("dlg_qty_invalid"))
      return
    }
    const avgCost = cost.trim() ? parseFloat(cost) : null
    if (avgCost != null && (isNaN(avgCost) || avgCost < 0)) {
      setErr(t("dlg_cost_invalid"))
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch("/api/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: picked.source,
          id: picked.id,
          symbol: picked.symbol,
          name: picked.name,
          assetType,
          quantity,
          avgCost,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(data?.error ? String(data.error) : t("dlg_save_failed"))
      } else {
        onAdded()
        onClose()
      }
    } catch {
      setErr(t("dlg_network_error"))
    }
    setSaving(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("dlg_title")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!picked ? (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-secondary)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("dlg_search_placeholder")}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  autoFocus
                />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-400" />}
              </div>

              {results.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {results.map((r) => (
                    <button
                      key={`${r.source}-${r.id}`}
                      onClick={() => pick(r)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-base)] text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                      >
                        {r.symbol.slice(0, 4)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.symbol}</p>
                          {r.type && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                              {r.type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{r.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Picked ticker display */}
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  {picked.symbol.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{picked.symbol}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{picked.name}</p>
                </div>
                <button
                  onClick={() => { setPicked(null); setQuery("") }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-[var(--bg-card)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("dlg_change")}
                </button>
              </div>

              {/* Asset type selector */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block"
                  style={{ color: "var(--text-secondary)" }}>
                  {t("dlg_asset_type")}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {(["stock", "etf", "crypto", "bond", "cash"] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setAssetType(tp)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors capitalize"
                      style={assetType === tp
                        ? { background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }
                        : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    >
                      {t(`type_${tp}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty + cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("dlg_qty")}
                  </label>
                  <input
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}>
                    {t("dlg_avg_cost")} <span className="opacity-60 font-normal normal-case">{t("dlg_optional")}</span>
                  </label>
                  <input
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {err && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {picked && (
          <div className="p-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("dlg_cancel")}
            </button>
            <button
              onClick={save}
              disabled={saving || !qty}
              className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
              style={{ background: "#10b981", color: "#0f1117" }}
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              {t("add_holding")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
