"use client"

import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { Gem, X } from "lucide-react"
import { ink } from "@/lib/ink"

// Shown after a Pro week bought with Peerz runs out: the trial's job is to
// lead to a paid plan. Dismissal is remembered per trial in this browser.
const KEY = "peerz-pro-trial-dismissed"

function readDismissed(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export default function ProTrialEndedBanner({ trialRef }: { trialRef: string }) {
  // Server snapshot = dismissed, so the banner only appears after hydration.
  const stored = useSyncExternalStore(() => () => {}, readDismissed, () => trialRef)
  const [closed, setClosed] = useState(false)
  if (closed || stored === trialRef) return null

  function dismiss() {
    try { localStorage.setItem(KEY, trialRef) } catch { /* private mode: hide for this visit only */ }
    setClosed(true)
  }

  return (
    <div className="px-4 py-2.5" style={{ background: "rgba(16,185,129,0.1)", borderBottom: "1px solid rgba(16,185,129,0.35)" }}>
      <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm">
        <Gem size={16} className="flex-shrink-0" style={{ color: ink("#10b981") }} />
        <span className="flex-1" style={{ color: "var(--text-primary)" }}>
          <span className="hidden sm:inline">Your Pro week from Peerz has ended. Keep the badge and every Pro perk for $10/mo.</span>
          <span className="sm:hidden">Your Pro week ended. Keep it for $10/mo.</span>
        </span>
        <Link
          href="/pro"
          onClick={dismiss}
          className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ background: "#10b981", color: "#04130d" }}
        >
          Keep Pro
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ color: "var(--text-secondary)" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
