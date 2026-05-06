"use client"

import { useState } from "react"
import { UserPlus, UserCheck, Clock } from "lucide-react"

export type ConnectionStatus = "none" | "pending-sent" | "pending-received" | "connected"

interface ConnectButtonProps {
  targetUserId: string
  initialStatus: ConnectionStatus
}

export default function ConnectButton({ targetUserId, initialStatus }: ConnectButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus)
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    if (loading) return
    setLoading(true)
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    })
    if (res.ok) setStatus("pending-sent")
    setLoading(false)
  }

  async function handleAccept() {
    if (loading) return
    setLoading(true)
    const res = await fetch(`/api/connections/${targetUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    if (res.ok) setStatus("connected")
    setLoading(false)
  }

  async function handleDecline() {
    if (loading) return
    setLoading(true)
    const res = await fetch(`/api/connections/${targetUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    })
    if (res.ok) setStatus("none")
    setLoading(false)
  }

  async function handleRemove() {
    if (loading) return
    setLoading(true)
    const res = await fetch(`/api/connections/${targetUserId}`, { method: "DELETE" })
    if (res.ok) setStatus("none")
    setLoading(false)
  }

  if (status === "connected") {
    return (
      <button
        onClick={handleRemove}
        disabled={loading}
        title="Remove connection"
        className="flex items-center gap-1.5 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-50"
      >
        <UserCheck size={14} />
        Connected
      </button>
    )
  }

  if (status === "pending-sent") {
    return (
      <button
        onClick={handleRemove}
        disabled={loading}
        title="Cancel request"
        className="flex items-center gap-1.5 text-sm text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-500 transition-colors disabled:opacity-50"
      >
        <Clock size={14} />
        Pending
      </button>
    )
  }

  if (status === "pending-received") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <UserPlus size={14} />
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={loading}
          className="text-sm text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:border-gray-500 transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:border-emerald-500/50 hover:text-emerald-400 transition-colors disabled:opacity-50"
    >
      <UserPlus size={14} />
      Connect
    </button>
  )
}
