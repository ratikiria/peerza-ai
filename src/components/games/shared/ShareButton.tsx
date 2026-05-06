"use client"

import { useState } from "react"
import { Share2, Check, AlertCircle } from "lucide-react"

interface Props {
  text: string
  className?: string
}

type State = "idle" | "sharing" | "shared" | "error"

export default function ShareButton({ text, className }: Props) {
  const [state, setState] = useState<State>("idle")

  async function handle() {
    if (state === "sharing" || state === "shared") return
    setState("sharing")
    try {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      setState(r.ok ? "shared" : "error")
    } catch {
      setState("error")
    }
  }

  const baseClasses = "rounded-xl font-semibold py-3 px-4 transition-colors flex items-center justify-center gap-2"

  if (state === "shared") {
    return (
      <button
        disabled
        className={`${baseClasses} bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 cursor-default ${className || ""}`}
      >
        <Check size={16} /> Shared to feed
      </button>
    )
  }

  if (state === "error") {
    return (
      <button
        onClick={() => setState("idle")}
        className={`${baseClasses} bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 ${className || ""}`}
      >
        <AlertCircle size={16} /> Try again
      </button>
    )
  }

  return (
    <button
      onClick={handle}
      disabled={state === "sharing"}
      className={`${baseClasses} bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-70 ${className || ""}`}
    >
      <Share2 size={16} />
      {state === "sharing" ? "Sharing…" : "Share to feed"}
    </button>
  )
}
