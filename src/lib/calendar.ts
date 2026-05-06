// Economic calendar data layer.
//
// Strategy: try FMP's `/economic_calendar` first (requires their Starter plan
// or higher — free tier returns 403). On any failure, fall back to a curated
// list of major scheduled events (`calendar-seed.ts`) so the UI always shows
// real, current data.
//
// Provider is swappable: shape normalized in `normalizeFmp` so a future swap
// to TradingEconomics / another provider only touches that one function.

import { curatedEvents } from "./calendar-seed"

export type Impact = "low" | "medium" | "high"

export interface EconomicEvent {
  id: string                 // stable id for React keys
  time: string               // ISO UTC
  country: string            // 2-letter (US, GB, EU, JP, ...)
  countryName: string        // "United States", etc.
  flag: string               // emoji or "" if Windows
  event: string              // "Non-Farm Payrolls"
  impact: Impact
  previous: string | null
  forecast: string | null
  actual: string | null      // populated after release
  unit: string | null
  currency: string | null
}

export interface CalendarPayload {
  events: EconomicEvent[]
  isDemoData: boolean
  cachedAt: string
}

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  US: { name: "United States",   flag: "🇺🇸" },
  EU: { name: "Eurozone",        flag: "🇪🇺" },
  DE: { name: "Germany",         flag: "🇩🇪" },
  FR: { name: "France",          flag: "🇫🇷" },
  GB: { name: "United Kingdom",  flag: "🇬🇧" },
  UK: { name: "United Kingdom",  flag: "🇬🇧" },
  JP: { name: "Japan",           flag: "🇯🇵" },
  CN: { name: "China",           flag: "🇨🇳" },
  AU: { name: "Australia",       flag: "🇦🇺" },
  CA: { name: "Canada",          flag: "🇨🇦" },
  CH: { name: "Switzerland",     flag: "🇨🇭" },
  IN: { name: "India",           flag: "🇮🇳" },
  BR: { name: "Brazil",          flag: "🇧🇷" },
  IT: { name: "Italy",           flag: "🇮🇹" },
  ES: { name: "Spain",           flag: "🇪🇸" },
  KR: { name: "South Korea",     flag: "🇰🇷" },
  NZ: { name: "New Zealand",     flag: "🇳🇿" },
  RU: { name: "Russia",          flag: "🇷🇺" },
  MX: { name: "Mexico",          flag: "🇲🇽" },
  ZA: { name: "South Africa",    flag: "🇿🇦" },
}

const TOP_COUNTRIES = ["US", "EU", "GB", "JP", "CN", "DE", "AU", "CA"] as const
export const COUNTRY_OPTIONS = TOP_COUNTRIES.map((code) => ({
  code,
  name: COUNTRY_NAMES[code].name,
  flag: COUNTRY_NAMES[code].flag,
}))

export function isCalendarConfigured(): boolean {
  const key = process.env.FINANCIAL_MODELING_PREP_API_KEY
  return !!key && !key.startsWith("your-") && key !== "placeholder"
}

// 30-min in-memory cache, keyed by date range.
const cache = new Map<string, { at: number; payload: CalendarPayload }>()
const CACHE_TTL_MS = 30 * 60 * 1000

function impactFromString(raw: string | null | undefined): Impact {
  const v = (raw ?? "").toLowerCase()
  if (v.includes("high")) return "high"
  if (v.includes("medium") || v.includes("med")) return "medium"
  return "low"
}

function fmtCountry(code: string): { code: string; name: string; flag: string } {
  const u = (code || "").toUpperCase().slice(0, 2)
  const meta = COUNTRY_NAMES[u]
  if (meta) return { code: u, name: meta.name, flag: meta.flag }
  return { code: u || "??", name: u || "Unknown", flag: "🌐" }
}

interface FmpRow {
  event?: string
  date?: string
  country?: string
  currency?: string
  previous?: string | number
  estimate?: string | number
  actual?: string | number
  change?: string | number
  changePercentage?: string | number
  impact?: string
  unit?: string
}

function normalizeFmp(rows: FmpRow[]): EconomicEvent[] {
  return rows.map((r, i) => {
    const c = fmtCountry(r.country || "")
    // FMP returns "2026-04-29 14:30:00" (UTC, naive). Normalize to ISO Z.
    const iso = (r.date || "").includes("T")
      ? r.date!
      : (r.date || "").replace(" ", "T") + "Z"
    return {
      id: `${iso}-${c.code}-${(r.event || "").slice(0, 20)}-${i}`,
      time: iso,
      country: c.code,
      countryName: c.name,
      flag: c.flag,
      event: r.event ?? "Unknown event",
      impact: impactFromString(r.impact),
      previous: r.previous != null && r.previous !== "" ? String(r.previous) : null,
      forecast: r.estimate != null && r.estimate !== "" ? String(r.estimate) : null,
      actual: r.actual != null && r.actual !== "" ? String(r.actual) : null,
      unit: r.unit ?? null,
      currency: r.currency ?? null,
    }
  })
}

// Filter curated events into the requested [from, to) window.
function curatedInWindow(from: string, to: string): EconomicEvent[] {
  const fromMs = Date.parse(from + "T00:00:00Z")
  const toMs = Date.parse(to + "T00:00:00Z")
  return curatedEvents()
    .filter((e) => {
      const t = Date.parse(e.time)
      return t >= fromMs && t < toMs
    })
    .sort((a, b) => a.time.localeCompare(b.time))
}

export async function getEconomicEvents(from: string, to: string): Promise<CalendarPayload> {
  const key = `${from}_${to}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload

  // No API key → curated events only. These are real scheduled events
  // (FOMC, ECB, BoE, etc.), not demo data — the UI doesn't need a banner.
  if (!isCalendarConfigured()) {
    const payload: CalendarPayload = {
      events: curatedInWindow(from, to),
      isDemoData: false,
      cachedAt: new Date().toISOString(),
    }
    cache.set(key, { at: Date.now(), payload })
    return payload
  }

  const apiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY!
  const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) throw new Error(`FMP ${res.status}`)
    const rows = (await res.json()) as FmpRow[]
    const payload: CalendarPayload = {
      events: normalizeFmp(Array.isArray(rows) ? rows : []),
      isDemoData: false,
      cachedAt: new Date().toISOString(),
    }
    cache.set(key, { at: Date.now(), payload })
    return payload
  } catch (e) {
    console.error("[calendar] FMP fetch failed — falling back to curated events", e)
    // FMP returned 403 (free tier doesn't include calendar) or otherwise
    // failed. Curated events are real scheduled events, so this is a clean
    // graceful degradation.
    const payload: CalendarPayload = {
      events: curatedInWindow(from, to),
      isDemoData: false,
      cachedAt: new Date().toISOString(),
    }
    cache.set(key, { at: Date.now(), payload })
    return payload
  }
}

