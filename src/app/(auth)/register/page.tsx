"use client"

import { ink } from "@/lib/ink"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import GoogleSignIn from "@/components/auth/GoogleSignIn"
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

      <GoogleSignIn divider={t("or_sign_up_with_email")} dividerClassName="mb-5" />

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
                  color: gender === opt.value ? ink("#10b981") : "var(--text-secondary)",
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
                  color: interests.includes(interest) ? ink("#10b981") : "var(--text-secondary)",
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
