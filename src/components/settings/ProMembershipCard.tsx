"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import ProBadge from "@/components/shared/ProBadge"

interface Membership {
  status: string
  billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY"
  paymentMethod: "CARD" | "CRYPTO"
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  priceUSD: number
}

interface Props {
  isPro: boolean
  membership: Membership | null
}

export default function ProMembershipCard({ isPro, membership }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [, startTransition] = useTransition()

  async function handleCancel() {
    if (!confirm("Cancel Pro? You'll keep access until the end of your current period.")) return
    setBusy(true)
    setError("")
    const res = await fetch("/api/pro/cancel", { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? "Cancel failed")
      setBusy(false)
      return
    }
    setBusy(false)
    startTransition(() => router.refresh())
  }

  async function handleResume() {
    setBusy(true)
    setError("")
    const res = await fetch("/api/pro/cancel", { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Resume failed")
      setBusy(false)
      return
    }
    setBusy(false)
    startTransition(() => router.refresh())
  }

  async function handleDevGrant() {
    setBusy(true)
    setError("")
    const res = await fetch("/api/pro/dev-grant", { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Dev grant failed")
      setBusy(false)
      return
    }
    setBusy(false)
    startTransition(() => router.refresh())
  }

  if (!isPro || !membership) {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <ProBadge size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Get the Pro badge
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              $10/month. Cancel anytime. Pay with card or crypto.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/pro"
            className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            See plans
          </Link>
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={handleDevGrant}
              disabled={busy}
              className="px-3 py-2 rounded-xl text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px dashed rgba(251,191,36,0.5)", color: "#fbbf24" }}
              title="Dev only — instantly grant 30 days of Pro for testing"
            >
              {busy ? <Loader2 size={11} className="animate-spin inline" /> : "DEV: Grant 30 days"}
            </button>
          )}
        </div>
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
      </div>
    )
  }

  const renewLabel = membership.cancelAtPeriodEnd ? "Ends" : "Renews"
  const cycleLabel =
    membership.billingCycle === "MONTHLY"   ? "Monthly · $10/mo" :
    membership.billingCycle === "QUARTERLY" ? "3 months · $27"   :
    "Yearly · $99"

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <ProBadge size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            You&apos;re Pro · thank you
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {cycleLabel} · {membership.paymentMethod === "CARD" ? "Card" : "Crypto"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {renewLabel} {new Date(membership.currentPeriodEnd).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {membership.cancelAtPeriodEnd ? (
          <button
            type="button"
            onClick={handleResume}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            {busy ? <Loader2 size={12} className="animate-spin inline" /> : "Resume subscription"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy || membership.paymentMethod === "CRYPTO"}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            title={membership.paymentMethod === "CRYPTO" ? "Crypto subscriptions don't auto-renew — nothing to cancel" : ""}
          >
            {busy ? <Loader2 size={12} className="animate-spin inline" /> : "Cancel"}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}
