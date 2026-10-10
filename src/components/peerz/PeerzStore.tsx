"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Gem, MessageCircleQuestion } from "lucide-react"
import { ink } from "@/lib/ink"
import { formatPeerz, type StoreItem } from "@/lib/peerz"
import PeerzCoin from "@/components/peerz/PeerzCoin"

const ICONS = { "pro-week": Gem, "aria-5": MessageCircleQuestion } as const

export default function PeerzStore({
  items, balance: initialBalance, verified, proUntil, bonusQuestions,
}: {
  items: StoreItem[]
  balance: number
  verified: boolean
  proUntil: string | null
  bonusQuestions: number
}) {
  const router = useRouter()
  const [balance, setBalance] = useState(initialBalance)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function buy(item: StoreItem) {
    setBusy(item.id)
    setMessage(null)
    try {
      const res = await fetch("/api/peerz/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Couldn't redeem that. Try again." })
        return
      }
      setBalance(data.balance)
      setMessage({ ok: true, text: `Redeemed: ${item.name}` })
      router.refresh()
    } catch {
      setMessage({ ok: false, text: "Network error. Try again." })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl p-4 space-y-3" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Store</h2>
        {!verified && (
          <span className="text-xs" style={{ color: ink("#fbbf24") }}>Verify your email to spend Peerz</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = ICONS[item.id]
          const short = balance < item.cost
          const status =
            item.id === "pro-week" && proUntil
              ? `Pro until ${new Date(proUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : item.id === "aria-5" && bonusQuestions > 0
              ? `${bonusQuestions} bonus left`
              : null
          return (
            <div key={item.id} className="rounded-xl p-3 flex flex-col gap-3" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-none"
                  style={{ background: "rgba(34,195,238,0.12)", color: ink("#22c3ee") }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                  {status && <p className="text-xs mt-1 font-semibold" style={{ color: ink("#2ee6a8") }}>{status}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => buy(item)}
                disabled={!verified || short || busy !== null}
                aria-label={`Redeem ${item.name} for ${formatPeerz(item.cost)} Peerz`}
                className="h-10 rounded-lg flex items-center justify-center gap-2 font-mono font-bold text-sm transition-colors disabled:cursor-not-allowed"
                style={
                  !verified || short
                    ? { background: "var(--bg-elevated)", color: "var(--text-secondary)" }
                    : { background: "#fbbf24", color: "#1c1203" }
                }
              >
                <PeerzCoin size={14} />
                {busy === item.id ? "Redeeming…" : formatPeerz(item.cost)}
              </button>
            </div>
          )
        })}
      </div>

      {message && (
        <p role="status" className="text-xs font-semibold" style={{ color: message.ok ? ink("#2ee6a8") : ink("#ff5c7a") }}>
          {message.text}
        </p>
      )}
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>More rewards — profile flair, Spotlight, tournament tickets — arrive with Season 1.</p>
    </section>
  )
}
