"use client"

import { useEffect, useState } from "react"

const CACHE_KEY = "peerio:geo:v2"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface Geo {
  countryCode: string
  country: string
}

export default function CountryFlag() {
  const [geo, setGeo] = useState<Geo | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; geo: Geo }
        if (Date.now() - parsed.ts < CACHE_TTL_MS && parsed.geo?.countryCode) {
          setGeo(parsed.geo)
          return
        }
      }
    } catch {}

    let cancelled = false
    fetch("/api/geo/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { countryCode?: string; country?: string } | null) => {
        if (cancelled) return
        if (data?.countryCode) {
          const next: Geo = { countryCode: data.countryCode, country: data.country || "" }
          setGeo(next)
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), geo: next }))
          } catch {}
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!geo?.countryCode) return null

  const cc = geo.countryCode.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/40x30/${cc}.png`}
      srcSet={`https://flagcdn.com/80x60/${cc}.png 2x`}
      width={24}
      height={18}
      alt={geo.country || geo.countryCode}
      title={geo.country || geo.countryCode}
      className="rounded-sm shadow-sm select-none"
      draggable={false}
    />
  )
}
