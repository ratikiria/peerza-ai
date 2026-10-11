"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight, MailCheck } from "lucide-react"

type Result =
  | { kind: "sent" | "resent" | "has_account"; email: string }
  | { kind: "error"; message: string }
  | null

export default function GenesisJoinForm({ refCode, stage }: {
  refCode: string | null
  stage: "genesis" | "pioneer" | "closed"
}) {
  const t = useTranslations("Genesis")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch("/api/genesis/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username: username.replace(/^@/, ""), ref: refCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ kind: "error", message: data.error ?? t("generic_error") })
      } else {
        const kind = data.status === "has_account" ? "has_account" : data.status === "resent" ? "resent" : "sent"
        setResult({ kind, email })
      }
    } catch {
      setResult({ kind: "error", message: t("generic_error") })
    } finally {
      setBusy(false)
    }
  }

  if (result && result.kind !== "error") {
    return (
      <div role="status" className="rounded-2xl p-5 flex items-start gap-4"
        style={{ background: "rgba(46,230,168,.08)", border: "1px solid rgba(46,230,168,.35)" }}>
        <MailCheck size={22} className="flex-none mt-0.5" style={{ color: "#2ee6a8" }} />
        <div className="space-y-1">
          {result.kind === "has_account" ? (
            <p className="text-sm">
              {t("has_account")}{" "}
              <Link href="/login" className="font-semibold underline" style={{ color: "#2ee6a8" }}>{t("sign_in")}</Link>
            </p>
          ) : (
            <>
              <p className="font-bold">{t("sent_title")}</p>
              <p className="text-sm" style={{ color: "#a3b1c2" }}>
                {result.kind === "resent" ? t("resent_body", { email: result.email }) : t("sent_body", { email: result.email })}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const field = "w-full h-[52px] rounded-xl px-4 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(251,191,36,.18)]"
  const fieldStyle = { background: "rgba(7,11,18,.7)", border: "1px solid rgba(148,190,220,.2)", color: "#e8f1f8" }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-[1.4] flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "#a3b1c2" }}>{t("email_label")}</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className={field} style={fieldStyle} />
        </label>
        {stage !== "closed" && (
          <label className="flex-1 flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "#a3b1c2" }}>
              {t("username_label")} <span style={{ color: "#6b7a8f" }}>{t("optional")}</span>
            </span>
            <input type="text" autoComplete="username" value={username} maxLength={31}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="@yourname" className={field} style={fieldStyle} />
          </label>
        )}
      </div>
      {result?.kind === "error" && <p role="alert" className="text-sm" style={{ color: "#ff5c7a" }}>{result.message}</p>}
      <button type="submit" disabled={busy}
        className="w-full h-[52px] rounded-xl flex items-center justify-center gap-2.5 font-extrabold text-base transition-colors disabled:opacity-60 hover:brightness-105"
        style={{ background: "#fbbf24", color: "#1c1203" }}>
        {busy ? t("sending") : stage === "genesis" ? t("cta_genesis") : stage === "pioneer" ? t("cta_pioneer") : t("cta_closed")}
        {!busy && <ArrowRight size={18} />}
      </button>
      <p className="text-xs leading-relaxed" style={{ color: "#7f8ea3" }}>
        {t("consent")} <Link href="/legal/privacy" className="underline">{t("privacy")}</Link>
      </p>
    </form>
  )
}
