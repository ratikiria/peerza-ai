"use client"

import { useState } from "react"
import { Phone } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CallButton({ partnerId }: { partnerId: string }) {
  const [calling, setCalling] = useState(false)
  const router = useRouter()

  async function initiateCall() {
    setCalling(true)
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: partnerId }),
    })
    if (res.ok) {
      const call = await res.json()
      router.push(`/call/${call.id}`)
    } else {
      setCalling(false)
    }
  }

  return (
    <button
      onClick={initiateCall}
      disabled={calling}
      className="text-gray-500 hover:text-emerald-400 transition-colors flex-shrink-0 disabled:opacity-50"
      title={calling ? "Connecting…" : "Audio call"}
      aria-label="Audio call"
    >
      <Phone size={18} />
    </button>
  )
}
