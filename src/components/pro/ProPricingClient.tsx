"use client"

import { useState } from "react"
import { CreditCard, Bitcoin, Loader2 } from "lucide-react"
import { PRO_PLANS, type ProPlanId } from "@/lib/pro"

interface Props {
  isPro: boolean
}

type PaymentMethod = "card" | "crypto"

export default function ProPricingClient({ isPro }: Props) {
  const [plan, setPlan] = useState<ProPlanId>("monthly")
  const [method, setMethod] = useState<PaymentMethod>("card")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selected = PRO_PLANS[plan]

  // Crypto cycles can't auto-renew, so monthly crypto isn't offered.
  const cryptoSupported = plan !== "monthly"

  async function handleCheckout() {
    if (isPro) return
    if (method === "crypto" && !cryptoSupported) {
      setError("Crypto payments require a 3-month or 1-year prepay (no auto-renew on chain).")
      return
    }
    setLoading(true)
    setError("")
    try {
      const endpoint = method === "card" ? "/api/pro/checkout/card" : "/api/pro/checkout/crypto"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Checkout failed")
        setLoading(false)
        return
      }
      // Redirect to hosted checkout
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setError("No checkout URL returned")
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-5 max-w-3xl mx-auto">
      {/* Plan toggle */}
      <div className="flex justify-center gap-2 flex-wrap">
        {(Object.keys(PRO_PLANS) as ProPlanId[]).map((id) => {
          const p = PRO_PLANS[id]
          const active = id === plan
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlan(id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? "rgba(16,185,129,0.18)" : "var(--bg-card)",
                border: active ? "1px solid rgba(16,185,129,0.6)" : "1px solid var(--border)",
                color: active ? "#10b981" : "var(--text-secondary)",
              }}
            >
              {p.label}
              {p.savePct ? <span className="ml-1.5 text-[10px] font-bold text-emerald-400">−{p.savePct}%</span> : null}
            </button>
          )
        })}
      </div>

      {/* Price card */}
      <div
        className="rounded-3xl p-6 md:p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(99,102,241,0.06) 100%)",
          border: "1px solid rgba(16,185,129,0.3)",
        }}
      >
        <div className="text-5xl md:text-6xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
          ${selected.priceUSD}
          <span className="text-base font-medium ml-2" style={{ color: "var(--text-secondary)" }}>
            {plan === "monthly" ? "/ month" : plan === "quarterly" ? "for 3 months" : "for 1 year"}
          </span>
        </div>
        {plan !== "monthly" && (
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            (${selected.monthlyEquivalent.toFixed(2)} / month equivalent)
          </p>
        )}

        {/* Payment method tabs */}
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => setMethod("card")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: method === "card" ? "rgba(16,185,129,0.18)" : "var(--bg-card)",
              border: method === "card" ? "1px solid rgba(16,185,129,0.6)" : "1px solid var(--border)",
              color: method === "card" ? "#10b981" : "var(--text-secondary)",
            }}
          >
            <CreditCard size={14} /> Card (international)
          </button>
          <button
            type="button"
            onClick={() => setMethod("crypto")}
            disabled={!cryptoSupported}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: method === "crypto" ? "rgba(247,147,26,0.18)" : "var(--bg-card)",
              border: method === "crypto" ? "1px solid rgba(247,147,26,0.6)" : "1px solid var(--border)",
              color: method === "crypto" ? "#f7931a" : "var(--text-secondary)",
            }}
          >
            <Bitcoin size={14} /> Crypto
          </button>
        </div>

        {!cryptoSupported && method === "crypto" && (
          <p className="mt-2 text-[11px] text-amber-400">
            Monthly crypto isn&apos;t available — switch to 3 months or 1 year.
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading || isPro || (method === "crypto" && !cryptoSupported)}
          className="mt-6 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {isPro ? "You&apos;re already Pro" : `Get Pro · $${selected.priceUSD}`}
        </button>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
        <p className="mt-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {method === "card"
            ? "Secure checkout via Stripe · cancel anytime in settings"
            : "Hosted checkout via Coinbase Commerce · BTC, ETH, USDC supported"}
        </p>
      </div>
    </section>
  )
}
