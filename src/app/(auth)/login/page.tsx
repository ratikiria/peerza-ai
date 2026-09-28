"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import GoogleSignIn from "@/components/auth/GoogleSignIn"
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

      <GoogleSignIn divider={t("or")} dividerClassName="mb-3" />

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
