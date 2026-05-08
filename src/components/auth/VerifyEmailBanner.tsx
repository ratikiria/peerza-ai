"use client"

import { useState } from "react"
import { Mail, X } from "lucide-react"

interface Props {
  email: string
}

export default function VerifyEmailBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  if (dismissed) return null

  async function resend() {
    setStatus("sending")
    setErrorMsg("")
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || "Could not send — try again later")
        setStatus("error")
        return
      }
      setStatus("sent")
    } catch {
      setErrorMsg("Network error — try again")
      setStatus("error")
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm">
        <Mail size={16} className="text-amber-400 flex-shrink-0" />
        <span className="flex-1 text-amber-100">
          {status === "sent" ? (
            <>Check <strong>{email}</strong> for the verification link.</>
          ) : (
            <>Verify your email so you don't lose access. We sent a link to <strong>{email}</strong>.</>
          )}
        </span>
        {status !== "sent" && (
          <button
            type="button"
            onClick={resend}
            disabled={status === "sending"}
            className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Resend"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-200/60 hover:text-amber-100"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      {status === "error" && (
        <p className="max-w-7xl mx-auto pl-7 mt-1 text-xs text-rose-300">{errorMsg}</p>
      )}
    </div>
  )
}
