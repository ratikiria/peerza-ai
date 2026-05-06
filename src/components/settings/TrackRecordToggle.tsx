"use client"

import { useEffect, useState } from "react"
import { Award, EyeOff } from "lucide-react"

export default function TrackRecordToggle() {
  const [enabled, setEnabled] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (u && typeof u.showTrackRecord === "boolean") setEnabled(u.showTrackRecord)
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
  }, [])

  async function toggle() {
    if (saving) return
    const next = !enabled
    setEnabled(next)
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTrackRecord: next }),
      })
    } catch {
      // Revert on failure
      setEnabled(!next)
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {enabled ? (
          <Award size={16} style={{ color: "#10b981" }} />
        ) : (
          <EyeOff size={16} style={{ color: "var(--text-secondary)" }} />
        )}
        <div className="min-w-0">
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Show track record on my profile</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            When off, your accuracy and avg-return stats are hidden from other users. You can still see your own.
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={!hydrated || saving}
        role="switch"
        aria-checked={enabled}
        className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60"
        style={{
          background: enabled ? "#10b981" : "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            left: enabled ? 20 : 2,
            background: enabled ? "#0f1117" : "var(--text-secondary)",
          }}
        />
      </button>
    </div>
  )
}
