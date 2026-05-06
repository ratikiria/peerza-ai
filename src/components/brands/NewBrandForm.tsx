"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Loader2, ImageIcon, X } from "lucide-react"

const COUNTRIES = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "HK", label: "🇭🇰 Hong Kong" },
  { code: "SG", label: "🇸🇬 Singapore" },
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "GE", label: "🇬🇪 Georgia" },
]

async function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) { reject(new Error("Logo must be under 4MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 256
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function NewBrandForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [country, setCountry] = useState("US")
  const [regulator, setRegulator] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    try { setLogoUrl(await resizeLogo(f)); setError(null) }
    catch (err: any) { setError(err.message) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          legalName: legalName.trim() || undefined,
          bio: bio.trim() || undefined,
          website: website.trim() || undefined,
          country,
          regulator: regulator.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          logoUrl: logoUrl || undefined,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        const data = text ? JSON.parse(text) : {}
        setError(data.error ?? `Server error (${res.status})`)
        setLoading(false)
        return
      }
      const brand = JSON.parse(text)
      router.push(`/brands/${brand.slug}`)
    } catch {
      setError("Network error")
      setLoading(false)
    }
  }

  const canSubmit = name.trim().length >= 2 && country.length === 2 && !loading

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <Building2 size={20} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Create a Brand page</h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Companies, exchanges, brokers, and tools advertise here. Your page will be unverified until reviewed.
          </p>
        </div>
      </div>

      {/* Logo + name */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <Field label="Logo">
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: "white", border: "1px solid var(--border)" }}
            >
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                : <ImageIcon size={20} style={{ color: "var(--text-secondary)" }} />}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {logoUrl ? "Change logo" : "Upload logo"}
              </button>
              {logoUrl && (
                <button type="button" onClick={() => setLogoUrl(null)}
                  className="text-[11px] font-semibold flex items-center gap-1"
                  style={{ color: "#ef4444" }}>
                  <X size={10} /> Remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </div>
          </div>
        </Field>

        <Field label="Brand name *">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
            placeholder="e.g. Atlas Brokers"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>

        <Field label="Legal entity name">
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120}
            placeholder="e.g. Atlas Brokers Inc."
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>

        <Field label="Bio" hint="280 char max — what you do, who you serve">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3}
            placeholder="Multi-asset broker for active traders. Stocks, ETFs, options, crypto."
            className="w-full text-sm px-3 py-2 rounded-xl outline-none resize-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>

        <Field label="Website">
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://atlasbrokers.com"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
      </div>

      {/* Compliance */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Compliance</h2>
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          We collect this so we can verify financial advertisers and comply with local regulations. Required fields will be enforced once your country&apos;s rules are live.
        </p>

        <Field label="Country of registration *">
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Primary regulator" hint="e.g. SEC, FINRA, FCA, BaFin">
          <input value={regulator} onChange={(e) => setRegulator(e.target.value)} maxLength={60}
            placeholder="FINRA"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>

        <Field label="License / registration number" hint="CRD #, SEC #, FCA reference, etc.">
          <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} maxLength={60}
            placeholder="CRD 123456"
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </Field>
      </div>

      {error && (
        <p className="text-sm text-rose-400 text-center">{error}</p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={!canSubmit}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
          style={{ background: "#10b981", color: "#0f1117" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Create brand page
        </button>
      </div>
    </form>
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
