"use client"

import { Plus } from "lucide-react"

export default function NewChatButton() {
  function open() {
    // Tells the dock to expand its conversations panel into "new chat" mode.
    window.dispatchEvent(new CustomEvent("peerza:open-new-chat"))
  }

  return (
    <button
      onClick={open}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
      style={{ background: "#10b981", color: "#0f1117" }}
    >
      <Plus size={13} /> New chat
    </button>
  )
}
