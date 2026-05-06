"use client"

import { useEffect, useState } from "react"
import { Users, Lock } from "lucide-react"

export default function FollowListToggle() {
  const [hidden, setHidden] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (u && typeof u.hideFollowList === "boolean") setHidden(u.hideFollowList)
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
  }, [])

  async function toggle() {
    if (saving) return
    const next = !hidden
    setHidden(next)
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideFollowList: next }),
      })
    } catch {
      setHidden(!next)
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3 min-w-0">
        {hidden ? (
          <Lock size={16} style={{ color: "#10b981" }} />
        ) : (
          <Users size={16} style={{ color: "var(--text-secondary)" }} />
        )}
        <div className="min-w-0">
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Hide my followers and following</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            When on, others won&apos;t be able to see who follows you or who you follow. Counts stay visible. You can still see your own lists.
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={!hydrated || saving}
        role="switch"
        aria-checked={hidden}
        className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60"
        style={{
          background: hidden ? "#10b981" : "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            left: hidden ? 20 : 2,
            background: hidden ? "#0f1117" : "var(--text-secondary)",
          }}
        />
      </button>
    </div>
  )
}
