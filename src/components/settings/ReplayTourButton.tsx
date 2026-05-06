"use client"

import { Compass } from "lucide-react"

export default function ReplayTourButton() {
  function replay() {
    window.dispatchEvent(new CustomEvent("peerza:open-tour"))
  }

  return (
    <button
      type="button"
      onClick={replay}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-base)] transition-colors"
    >
      <span className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
        <Compass size={14} className="text-emerald-400" />
        Replay welcome tour
      </span>
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Walk through the app
      </span>
    </button>
  )
}
