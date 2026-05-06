"use client"

import { useEffect, useRef, useState } from "react"
import { Phone, PhoneOff, User, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { playIncomingRing, type RingController } from "@/lib/call-sounds"

interface IncomingCall {
  id: string
  kind?: "AUDIO" | "VIDEO"
  initiator: { id: string; name: string; username: string; image?: string | null }
}

export default function IncomingCallOverlay() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const router = useRouter()
  const ringRef = useRef<RingController | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/calls")
        if (res.ok) {
          const calls = await res.json()
          setIncomingCall(calls[0] ?? null)
        }
      } catch {
        // Ignore transient network errors (HMR reload, sleep/wake, offline)
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  // Loop the incoming ring while a call is pending; stop when accepted, declined,
  // or the caller cancels (incomingCall becomes null).
  useEffect(() => {
    if (incomingCall) {
      ringRef.current = playIncomingRing()
    }
    return () => {
      ringRef.current?.stop()
      ringRef.current = null
    }
  }, [incomingCall?.id])

  if (!incomingCall) return null

  async function accept() {
    await fetch(`/api/calls/${incomingCall!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    })
    setIncomingCall(null)
    router.push(`/call/${incomingCall!.id}`)
  }

  async function decline() {
    await fetch(`/api/calls/${incomingCall!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DECLINED" }),
    })
    setIncomingCall(null)
  }

  return (
    <div className="fixed inset-x-0 top-4 flex justify-center z-50 pointer-events-none">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 pointer-events-auto animate-in slide-in-from-top-4 duration-300 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          {incomingCall.initiator.image ? (
            <img
              src={incomingCall.initiator.image}
              alt={incomingCall.initiator.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User size={20} className="text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">{incomingCall.initiator.name}</p>
          <p className="text-xs text-gray-500 animate-pulse flex items-center gap-1">
            {incomingCall.kind === "VIDEO" ? <Video size={11} /> : <Phone size={11} />}
            Incoming {incomingCall.kind === "VIDEO" ? "video" : "audio"} call…
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="w-10 h-10 rounded-full bg-rose-500/20 hover:bg-rose-500/30 flex items-center justify-center text-rose-400 transition-colors"
          >
            <PhoneOff size={18} />
          </button>
          <button
            onClick={accept}
            className="w-10 h-10 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors"
          >
            {incomingCall.kind === "VIDEO" ? <Video size={18} /> : <Phone size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
