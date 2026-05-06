"use client"

import { useEffect, useState } from "react"
import { Globe } from "lucide-react"

const COUNTRIES = [
  { code: "", label: "— Not set —" },
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
  { code: "IN", label: "🇮🇳 India" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "TR", label: "🇹🇷 Turkey" },
]

export default function CountrySelect() {
  const [country, setCountry] = useState<string>("")
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (u && typeof u.country === "string") setCountry(u.country)
        setHydrated(true)
      })
      .catch(() => setHydrated(true))
  }, [])

  async function update(value: string) {
    setCountry(value)
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: value || null }),
      })
      setSavedAt(Date.now())
    } catch {}
    setSaving(false)
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <Globe size={16} style={{ color: "var(--text-secondary)" }} />
        <div>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>Your country</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Determines which ads are shown to you. Crypto ads are hidden in jurisdictions where they&apos;re restricted.
          </p>
        </div>
      </div>
      <select
        value={country}
        onChange={(e) => update(e.target.value)}
        disabled={!hydrated || saving}
        className="w-full text-sm px-3 py-2 rounded-xl outline-none disabled:opacity-60"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
      </select>
      {savedAt && Date.now() - savedAt < 4000 && (
        <p className="text-[10px] mt-1.5 text-emerald-400">Saved</p>
      )}
    </div>
  )
}
