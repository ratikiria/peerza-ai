"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { SECURITY_QUESTIONS } from "@/lib/security-questions"

const INTERESTS = ["Crypto", "Forex", "Stocks", "Options", "ETFs", "Commodities"]

const inputStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export default function RegisterPage() {
  const t = useTranslations("Auth")
  const router = useRouter()
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" })
  const [interests, setInterests] = useState<string[]>([])
  const [bMonth, setBMonth] = useState("")
  const [bDay, setBDay] = useState("")
  const [bYear, setBYear] = useState("")
  const [gender, setGender] = useState("")
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 100 }, (_, i) => now - 13 - i) // 13+ minimum
  }, [])

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), [])

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bYear || !bMonth || !bDay) {
      setError(t("register_err_dob"))
      return
    }
    if (!securityQuestion) {
      setError(t("register_err_no_question"))
      return
    }
    if (securityAnswer.trim().length < 2) {
      setError(t("register_err_short_answer"))
      return
    }

    setLoading(true)
    setError("")

    const birthDate = `${bYear}-${String(MONTHS.indexOf(bMonth) + 1).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        interests,
        birthDate,
        ...(gender ? { gender } : {}),
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? t("register_err_generic"))
      setLoading(false)
      return
    }

    router.push("/login?registered=1")
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = "#10b981"
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = "var(--border)"
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-1 tracking-tight" style={{ color: "var(--text-primary)" }}>
        {t("register_title")}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {t("register_subtitle")}
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

      <div className="flex items-center gap-3 mb-5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
        {t("or_sign_up_with_email")}
        <span className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("register_full_name")}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
            placeholder={t("register_full_name_placeholder")}
            className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("register_username")}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-secondary)" }}>@</span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              required
              pattern="^[a-z0-9_]+$"
              placeholder={t("register_username_placeholder")}
              className="w-full text-sm pl-7 pr-4 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{t("register_username_hint")}</p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("email")}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            placeholder={t("email_placeholder")}
            className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("password")}
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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

        {/* Date of birth */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("register_dob")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={bMonth}
              onChange={(e) => setBMonth(e.target.value)}
              required
              className="text-sm px-3 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            >
              <option value="">{t("register_dob_month")}</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={bDay}
              onChange={(e) => setBDay(e.target.value)}
              required
              className="text-sm px-3 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            >
              <option value="">{t("register_dob_day")}</option>
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={bYear}
              onChange={(e) => setBYear(e.target.value)}
              required
              className="text-sm px-3 py-3 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            >
              <option value="">{t("register_dob_year")}</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
            {t("register_age_hint")}
          </p>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("register_gender")} <span className="normal-case font-normal">{t("register_interests_optional")}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "female", label: t("register_gender_female") },
              { value: "male", label: t("register_gender_male") },
              { value: "other", label: t("register_gender_other") },
              { value: "prefer_not_to_say", label: t("register_gender_pnts") },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(gender === opt.value ? "" : opt.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: gender === opt.value ? "rgba(16,185,129,0.2)" : "var(--bg-base)",
                  border: `1px solid ${gender === opt.value ? "#10b981" : "var(--border)"}`,
                  color: gender === opt.value ? "#10b981" : "var(--text-secondary)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Security question */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                {t("register_recovery_eyebrow")}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                {t("register_recovery_hint")}
              </p>
            </div>
          </div>

          <select
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
            required
            className="w-full text-sm px-3 py-3 rounded-xl outline-none transition-all"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="">{t("register_pick_question")}</option>
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            required={!!securityQuestion}
            disabled={!securityQuestion}
            placeholder={securityQuestion ? t("register_your_answer") : t("register_pick_question_first")}
            className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Interests */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {t("register_interests")} <span className="normal-case font-normal">{t("register_interests_optional")}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: interests.includes(interest) ? "rgba(16,185,129,0.2)" : "var(--bg-base)",
                  border: `1px solid ${interests.includes(interest) ? "#10b981" : "var(--border)"}`,
                  color: interests.includes(interest) ? "#10b981" : "var(--text-secondary)",
                }}
              >
                {interest}
              </button>
            ))}
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
          {loading ? t("register_creating") : t("register_submit")}
        </button>
      </form>

      <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
        {t("register_have_account")}{" "}
        <Link href="/login" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
          {t("register_sign_in")}
        </Link>
      </p>

      <p className="text-[10px] text-center mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {t("register_terms_prefix")}{" "}
        <Link href="/legal/terms" className="hover:text-emerald-400 underline underline-offset-2">{t("terms_short")}</Link>,{" "}
        <Link href="/legal/privacy" className="hover:text-emerald-400 underline underline-offset-2">{t("privacy_policy_short")}</Link>, {t("and")}{" "}
        <Link href="/legal/disclaimer" className="hover:text-emerald-400 underline underline-offset-2">{t("financial_disclaimer_short")}</Link>.
      </p>
    </div>
  )
}
