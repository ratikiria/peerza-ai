"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Loader2, ImageIcon, X, Building2, ExternalLink, Info } from "lucide-react"

interface BrandLite {
  id: string
  slug: string
  name: string
  country: string
  logoUrl?: string | null
}

const TOPICS = [
  { key: "crypto",  label: "Crypto",  tint: "#f59e0b" },
  { key: "stocks",  label: "Stocks",  tint: "#60a5fa" },
  { key: "forex",   label: "Forex",   tint: "#a78bfa" },
  { key: "options", label: "Options", tint: "#10b981" },
] as const

const RESTRICT_PRESETS: { code: string; label: string }[] = [
  { code: "US", label: "🇺🇸 USA" },
  { code: "GB", label: "🇬🇧 UK" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "CN", label: "🇨🇳 China" },
  { code: "IN", label: "🇮🇳 India" },
]

async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 6 * 1024 * 1024) { reject(new Error("Image must be under 6MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function NewAdForm({ brand }: { brand: BrandLite }) {
  const router = useRouter()
  const [headline, setHeadline] = useState("")
  const [body, setBody] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [ctaLabel, setCtaLabel] = useState("Learn more")
  const [ctaUrl, setCtaUrl] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [restricted, setRestricted] = useState<string[]>([])
  const [budgetUsd, setBudgetUsd] = useState("")
  const [disclaimer, setDisclaimer] = useState(
    "Capital at risk. Not financial advice."
  )
  const [loading, setLoading] = useState<"draft" | "submit" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    try { setImageUrl(await resizeImage(f)); setError(null) }
    catch (err: any) { setError(err.message) }
  }

  async function save(submit: boolean) {
    if (loading) return
    setLoading(submit ? "submit" : "draft"); setError(null)
    try {
      const res = await fetch(`/api/brands/${brand.slug}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim(),
          body: body.trim(),
          imageUrl: imageUrl || undefined,
          ctaLabel: ctaLabel.trim(),
          ctaUrl: ctaUrl.trim(),
          topics,
          restrictedCountries: restricted,
          budgetUsd: budgetUsd ? Number(budgetUsd) : undefined,
          disclaimer: disclaimer.trim() || undefined,
          submit,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        const data = text ? JSON.parse(text) : {}
        setError(data.error ?? `Server error (${res.status})`)
        setLoading(null)
        return
      }
      router.push(`/brands/${brand.slug}`)
    } catch {
      setError("Network error")
      setLoading(null)
    }
  }

  const canSubmit = headline.trim().length >= 3
    && body.trim().length >= 10
    && ctaLabel.trim().length >= 2
    && ctaUrl.trim().length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Megaphone size={20} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>New ad</h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            For <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{brand.name}</span>.
            Submit it for review when you&apos;re ready — drafts can stay draft.
          </p>
        </div>
      </div>

      {/* Live preview */}
      <Preview brand={brand} headline={headline} body={body} imageUrl={imageUrl}
        ctaLabel={ctaLabel} ctaUrl={ctaUrl} disclaimer={disclaimer} />

      {/* Content */}
      <Section title="Content">
        <Field label="Headline *" hint={`${headline.length} / 80`}>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80}
            placeholder="Trade smarter with Atlas"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
        <Field label="Body *" hint={`${body.length} / 280`}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={280} rows={3}
            placeholder="Commission-free stocks, ETFs, and options. Open an account in minutes."
            className="w-full text-sm px-3 py-2 rounded-xl outline-none resize-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
        <Field label="Hero image">
          <div className="flex items-center gap-3">
            <div className="w-24 h-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              {imageUrl
                ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                : <ImageIcon size={18} style={{ color: "var(--text-secondary)" }} />}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {imageUrl ? "Change image" : "Upload image"}
              </button>
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl(null)}
                  className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#ef4444" }}>
                  <X size={10} /> Remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CTA label *">
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={30}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </Field>
          <Field label="CTA destination *">
            <input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://atlasbrokers.com/signup"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </Field>
        </div>
        <Field label="Disclaimer" hint="Required by most regulators for financial promotions">
          <input value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} maxLength={280}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
      </Section>

      {/* Targeting */}
      <Section title="Targeting">
        <Field label="Topics" hint="Pick which topic feeds this ad shows in. Leave empty to show across all topics.">
          <div className="flex flex-wrap gap-2">
            {TOPICS.map(({ key, label, tint }) => {
              const active = topics.includes(key)
              return (
                <button key={key} type="button"
                  onClick={() => setTopics((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key])}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={active
                    ? { background: tint + "22", color: tint, border: `1px solid ${tint}66` }
                    : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Restrict from countries" hint="Useful for crypto ads — toggle USA off if your ad isn't compliant there">
          <div className="flex flex-wrap gap-2">
            {RESTRICT_PRESETS.map((c) => {
              const blocked = restricted.includes(c.code)
              return (
                <button key={c.code} type="button"
                  onClick={() => setRestricted((p) => p.includes(c.code) ? p.filter((x) => x !== c.code) : [...p, c.code])}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={blocked
                    ? { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }
                    : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                  {blocked ? "🚫 " : ""}{c.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* Budget */}
      <Section title="Budget (optional for now)">
        <Field label="Total budget (USD)">
          <input type="number" min="0" step="1" value={budgetUsd}
            onChange={(e) => setBudgetUsd(e.target.value)}
            placeholder="500"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
        <p className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <Info size={11} className="mt-0.5 flex-shrink-0" />
          Self-serve checkout coming soon. For now you&apos;ll be invoiced after the campaign runs.
        </p>
      </Section>

      {error && <p className="text-sm text-rose-400 text-center">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={() => save(false)} disabled={!canSubmit || loading !== null}
          className="text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          {loading === "draft" && <Loader2 size={13} className="inline-block animate-spin mr-1" />}
          Save as draft
        </button>
        <button onClick={() => save(true)} disabled={!canSubmit || loading !== null}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
          style={{ background: "#10b981", color: "#0f1117" }}>
          {loading === "submit" && <Loader2 size={13} className="animate-spin" />}
          Submit for review
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{hint}</p>}
    </div>
  )
}

function Preview({
  brand, headline, body, imageUrl, ctaLabel, ctaUrl, disclaimer,
}: {
  brand: BrandLite
  headline: string
  body: string
  imageUrl: string | null
  ctaLabel: string
  ctaUrl: string
  disclaimer: string
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-secondary)" }}>
        Preview · how it appears in the feed
      </div>
      <article className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-base)", border: "1px solid rgba(245,158,11,0.4)" }}>
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: "white" }}>
            {brand.logoUrl
              ? <img src={brand.logoUrl} alt="" className="w-full h-full object-contain" />
              : <Building2 size={16} style={{ color: "var(--text-secondary)" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{brand.name}</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                Sponsored
              </span>
            </div>
            <p className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              {headline || "Your headline shows here"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {body || "Your body copy shows here. Keep it clear and benefit-led."}
            </p>
          </div>
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-full max-h-72 object-cover" />
        )}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {disclaimer || "Disclaimer required."}
          </p>
          <a href={ctaUrl || "#"} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "#10b981", color: "#0f1117" }}>
            {ctaLabel || "CTA"} <ExternalLink size={11} />
          </a>
        </div>
      </article>
    </div>
  )
}
