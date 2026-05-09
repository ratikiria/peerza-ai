"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, Sparkles } from "lucide-react"

export default function LoginPage() {
  const t = useTranslations("Auth")
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setError(t("login_invalid"))
      setLoading(false)
    } else {
      router.push("/feed")
    }
  }

  function fillDemo() {
    setEmail("human@peerza.ai")
    setPassword("demo1234")
    setError("")
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-1 tracking-tight" style={{ color: "var(--text-primary)" }}>
        {t("login_title")}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("login_subtitle")}
      </p>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/feed" })}
        className="w-full mb-3 rounded-xl border px-4 py-3 flex items-center justify-center gap-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
        style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {t("continue_with_google")}
      </button>

      <div className="flex items-center gap-3 mb-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
        {t("or")}
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <button
        type="button"
        onClick={fillDemo}
        className="group w-full mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/10 px-4 py-3 flex items-center gap-3 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-amber-400" />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
            {t("login_demo_eyebrow")}
          </span>
          <span className="block text-xs text-gray-400 mt-0.5">
            {t("login_demo_hint")}
          </span>
        </span>
        <span className="text-xs font-mono text-amber-400/80 group-hover:text-amber-300">→</span>
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t("email_placeholder")}
            className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#10b981")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("password")}
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full text-sm px-4 py-3 pr-11 rounded-xl outline-none transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
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

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-gray-400 hover:text-emerald-400 transition-colors"
          >
            {t("login_forgot")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-50 hover:opacity-90 mt-2"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          {loading ? t("login_signing_in") : t("login_submit")}
        </button>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
        {t("login_no_account")}{" "}
        <Link href="/register" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
          {t("login_create_free")}
        </Link>
      </p>

      <p className="text-[10px] text-center mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {t("login_terms_prefix")}{" "}
        <Link href="/legal/terms" className="hover:text-emerald-400 underline underline-offset-2">{t("terms_short")}</Link>{" "}
        {t("and")}{" "}
        <Link href="/legal/privacy" className="hover:text-emerald-400 underline underline-offset-2">{t("privacy_policy_short")}</Link>.
      </p>
    </div>
  )
}
