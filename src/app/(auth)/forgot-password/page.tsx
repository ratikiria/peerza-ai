"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, ShieldCheck, Check } from "lucide-react"

const inputStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
}

type Step = "identify" | "verify" | "done"

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth")
  const router = useRouter()
  const [step, setStep] = useState<Step>("identify")
  const [identifier, setIdentifier] = useState("")
  const [resolvedIdentifier, setResolvedIdentifier] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "#10b981"
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--border)"
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/forgot-password/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? t("forgot_err_not_found"))
      setLoading(false)
      return
    }
    const data = await res.json()
    setQuestion(data.question)
    setResolvedIdentifier(data.identifier)
    setStep("verify")
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError(t("forgot_err_short_password"))
      return
    }
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: resolvedIdentifier,
        answer,
        newPassword,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? t("forgot_err_reset"))
      setLoading(false)
      return
    }
    setStep("done")
    setLoading(false)
    setTimeout(() => router.push("/login"), 2200)
  }

  if (step === "done") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>
          {t("forgot_done_title")}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {t("forgot_done_subtitle")}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={18} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
          {t("forgot_eyebrow")}
        </span>
      </div>
      <h1 className="text-3xl font-black mb-1 tracking-tight" style={{ color: "var(--text-primary)" }}>
        {step === "identify" ? t("forgot_title_identify") : t("forgot_title_verify")}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {step === "identify"
          ? t("forgot_subtitle_identify")
          : t("forgot_subtitle_verify")}
      </p>

      {step === "identify" && (
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {t("forgot_id_label")}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder={t("forgot_id_placeholder")}
              className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            {loading ? t("forgot_looking_up") : t("forgot_continue")}
          </button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 mb-1">
              {t("forgot_question_label")}
            </p>
            <p className="text-sm font-semibold text-gray-100">{question}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {t("forgot_answer_label")}
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
              autoFocus
              placeholder={t("forgot_answer_placeholder")}
              className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {t("forgot_answer_hint")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {t("forgot_new_password")}
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t("password_min_placeholder")}
                className="w-full text-sm px-4 py-3 pr-11 rounded-xl outline-none transition-all"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-secondary)" }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            {loading ? t("forgot_updating") : t("forgot_set_password")}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("identify")
              setAnswer("")
              setNewPassword("")
              setError("")
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t("forgot_try_other")}
          </button>
        </form>
      )}

      <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
        {t("forgot_remembered")}{" "}
        <Link href="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
          {t("forgot_back_signin")}
        </Link>
      </p>
    </div>
  )
}
