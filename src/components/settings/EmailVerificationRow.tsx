"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Mail, CheckCircle2, AlertCircle } from "lucide-react"

interface Props {
  email: string
  verified: boolean
}

export default function EmailVerificationRow({ email, verified }: Props) {
  const t = useTranslations("Settings")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function resend() {
    setStatus("sending")
    setErrorMsg("")
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || t("email_send_failed"))
        setStatus("error")
        return
      }
      setStatus("sent")
    } catch {
      setErrorMsg(t("email_send_failed"))
      setStatus("error")
    }
  }

  return (
    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mail size={14} style={{ color: "var(--text-secondary)" }} className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{email}</div>
            {verified ? (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={12} /> {t("email_verified")}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <AlertCircle size={12} /> {t("email_not_verified")}
              </div>
            )}
          </div>
        </div>
        {!verified && status !== "sent" && (
          <button
            type="button"
            onClick={resend}
            disabled={status === "sending"}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 disabled:opacity-50 transition-colors"
          >
            {status === "sending" ? t("email_sending") : t("email_resend")}
          </button>
        )}
      </div>
      {status === "sent" && (
        <p className="mt-2 pl-6 text-xs text-emerald-400">{t("email_sent", { email })}</p>
      )}
      {status === "error" && (
        <p className="mt-2 pl-6 text-xs text-rose-400">{errorMsg}</p>
      )}
    </div>
  )
}
