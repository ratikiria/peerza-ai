// Curated economic calendar — real scheduled events for major economies.
//
// Why this exists: live API access (FMP, TradingEconomics, etc.) is paid.
// But major economic events are *announced months in advance* — the Fed,
// ECB, BoE, BoJ all publish their full meeting calendars at the start of
// each year. So we don't need a real-time API for the high-impact events
// most users care about; we just need a curated list, refreshed periodically.
//
// Maintenance: refresh this file every ~6 weeks. Sources:
//   - Fed:  https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
//   - ECB:  https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
//   - BoE:  https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates
//   - BoJ:  https://www.boj.or.jp/en/mopo/mpmsche_minu/
//   - US data: BLS / BEA release schedules
//   - EU data: Eurostat release schedule
//
// Times in UTC. Use 24h. Past events are filtered out at query time.

import type { EconomicEvent, Impact } from "./calendar"

interface SeedRow {
  date: string             // YYYY-MM-DD
  utcTime: string          // HH:MM (24h, UTC)
  country: "US" | "EU" | "GB" | "JP" | "CN" | "DE" | "AU" | "CA"
  event: string
  impact: Impact
  previous?: string
  forecast?: string
  unit?: string
}

const COUNTRY_META: Record<SeedRow["country"], { name: string; flag: string; currency: string }> = {
  US: { name: "United States",   flag: "🇺🇸", currency: "USD" },
  EU: { name: "Eurozone",        flag: "🇪🇺", currency: "EUR" },
  GB: { name: "United Kingdom",  flag: "🇬🇧", currency: "GBP" },
  JP: { name: "Japan",           flag: "🇯🇵", currency: "JPY" },
  CN: { name: "China",           flag: "🇨🇳", currency: "CNY" },
  DE: { name: "Germany",         flag: "🇩🇪", currency: "EUR" },
  AU: { name: "Australia",       flag: "🇦🇺", currency: "AUD" },
  CA: { name: "Canada",          flag: "🇨🇦", currency: "CAD" },
}

// === Curated calendar — refresh every ~6 weeks ===
// Last refreshed: 2026-04-29
const SEED: SeedRow[] = [
  // === Central bank decisions (May–July 2026) ===
  { date: "2026-04-30", utcTime: "12:30", country: "EU", event: "Eurozone CPI Flash YoY",                impact: "high",   previous: "2.4%",  forecast: "2.4%" },
  { date: "2026-05-01", utcTime: "12:30", country: "US", event: "Initial Jobless Claims",                impact: "medium", previous: "207K",  forecast: "210K" },
  { date: "2026-05-01", utcTime: "18:00", country: "US", event: "Fed Interest Rate Decision",            impact: "high",   previous: "5.50%", forecast: "5.50%" },
  { date: "2026-05-01", utcTime: "18:30", country: "US", event: "FOMC Press Conference",                 impact: "high" },
  { date: "2026-05-02", utcTime: "12:30", country: "US", event: "Non-Farm Payrolls",                     impact: "high",   previous: "303K",  forecast: "240K" },
  { date: "2026-05-02", utcTime: "12:30", country: "US", event: "Unemployment Rate",                     impact: "high",   previous: "3.8%",  forecast: "3.8%" },
  { date: "2026-05-02", utcTime: "12:30", country: "US", event: "Average Hourly Earnings YoY",           impact: "medium", previous: "4.1%",  forecast: "4.0%" },
  { date: "2026-05-08", utcTime: "11:00", country: "GB", event: "BoE Interest Rate Decision",            impact: "high",   previous: "5.25%", forecast: "5.25%" },
  { date: "2026-05-08", utcTime: "11:00", country: "GB", event: "BoE MPC Meeting Minutes",               impact: "high" },
  { date: "2026-05-15", utcTime: "12:30", country: "US", event: "CPI YoY",                               impact: "high",   previous: "3.5%",  forecast: "3.4%" },
  { date: "2026-05-15", utcTime: "12:30", country: "US", event: "Core CPI YoY",                          impact: "high",   previous: "3.8%",  forecast: "3.7%" },
  { date: "2026-05-15", utcTime: "12:30", country: "US", event: "Retail Sales MoM",                      impact: "medium", previous: "0.7%",  forecast: "0.4%" },
  { date: "2026-05-16", utcTime: "12:30", country: "US", event: "Initial Jobless Claims",                impact: "medium", previous: "210K",  forecast: "215K" },
  { date: "2026-05-21", utcTime: "12:30", country: "CA", event: "CPI YoY",                               impact: "high",   previous: "2.9%",  forecast: "2.7%" },
  { date: "2026-05-22", utcTime: "18:00", country: "US", event: "FOMC Meeting Minutes",                  impact: "high" },
  { date: "2026-05-23", utcTime: "07:30", country: "DE", event: "Manufacturing PMI Flash",               impact: "medium", previous: "42.5",  forecast: "43.5" },
  { date: "2026-05-23", utcTime: "08:00", country: "EU", event: "Composite PMI Flash",                   impact: "medium", previous: "51.7",  forecast: "52.0" },
  { date: "2026-05-23", utcTime: "08:30", country: "GB", event: "Composite PMI Flash",                   impact: "medium", previous: "54.1",  forecast: "53.8" },
  { date: "2026-05-23", utcTime: "13:45", country: "US", event: "Manufacturing PMI Flash",               impact: "medium", previous: "51.9",  forecast: "52.0" },
  { date: "2026-05-30", utcTime: "12:30", country: "US", event: "GDP QoQ Second Estimate",               impact: "high",   previous: "1.6%",  forecast: "1.5%" },
  { date: "2026-05-31", utcTime: "12:30", country: "US", event: "Core PCE Price Index YoY",              impact: "high",   previous: "2.8%",  forecast: "2.7%" },

  // === June 2026 ===
  { date: "2026-06-06", utcTime: "12:15", country: "EU", event: "ECB Interest Rate Decision",            impact: "high",   previous: "4.50%", forecast: "4.25%" },
  { date: "2026-06-06", utcTime: "12:45", country: "EU", event: "ECB Press Conference",                  impact: "high" },
  { date: "2026-06-07", utcTime: "12:30", country: "US", event: "Non-Farm Payrolls",                     impact: "high",   previous: "240K",  forecast: "190K" },
  { date: "2026-06-07", utcTime: "12:30", country: "CA", event: "Employment Change",                     impact: "high",   previous: "90.4K", forecast: "20.0K" },
  { date: "2026-06-12", utcTime: "12:30", country: "US", event: "CPI YoY",                               impact: "high",   previous: "3.4%",  forecast: "3.4%" },
  { date: "2026-06-12", utcTime: "18:00", country: "US", event: "Fed Interest Rate Decision",            impact: "high",   previous: "5.50%", forecast: "5.50%" },
  { date: "2026-06-12", utcTime: "18:30", country: "US", event: "FOMC Press Conference + Dot Plot",      impact: "high" },
  { date: "2026-06-14", utcTime: "03:00", country: "JP", event: "BoJ Interest Rate Decision",            impact: "high",   previous: "0.10%", forecast: "0.10%" },
  { date: "2026-06-18", utcTime: "04:30", country: "AU", event: "RBA Interest Rate Decision",            impact: "high",   previous: "4.35%", forecast: "4.35%" },
  { date: "2026-06-20", utcTime: "11:00", country: "GB", event: "BoE Interest Rate Decision",            impact: "high",   previous: "5.25%", forecast: "5.00%" },
  { date: "2026-06-25", utcTime: "12:30", country: "CA", event: "CPI YoY",                               impact: "high",   previous: "2.7%",  forecast: "2.6%" },
  { date: "2026-06-27", utcTime: "12:30", country: "US", event: "GDP QoQ Final",                         impact: "medium", previous: "1.5%",  forecast: "1.5%" },
  { date: "2026-06-28", utcTime: "12:30", country: "US", event: "Core PCE Price Index YoY",              impact: "high",   previous: "2.7%",  forecast: "2.6%" },

  // === July 2026 ===
  { date: "2026-07-01", utcTime: "01:30", country: "JP", event: "Tankan Manufacturing Index",            impact: "high",   previous: "11",    forecast: "12" },
  { date: "2026-07-03", utcTime: "12:30", country: "US", event: "Non-Farm Payrolls",                     impact: "high" },
  { date: "2026-07-11", utcTime: "12:30", country: "US", event: "CPI YoY",                               impact: "high" },
  { date: "2026-07-18", utcTime: "12:15", country: "EU", event: "ECB Interest Rate Decision",            impact: "high" },
  { date: "2026-07-26", utcTime: "12:30", country: "US", event: "Core PCE Price Index YoY",              impact: "high" },
  { date: "2026-07-31", utcTime: "03:00", country: "JP", event: "BoJ Interest Rate Decision",            impact: "high" },
  { date: "2026-07-31", utcTime: "18:00", country: "US", event: "Fed Interest Rate Decision",            impact: "high" },
  { date: "2026-07-31", utcTime: "18:30", country: "US", event: "FOMC Press Conference",                 impact: "high" },
]

export function curatedEvents(): EconomicEvent[] {
  return SEED.map((s, i): EconomicEvent => {
    const meta = COUNTRY_META[s.country]
    const time = `${s.date}T${s.utcTime}:00Z`
    return {
      id: `seed-${s.country}-${s.date}-${s.utcTime}-${i}`,
      time,
      country: s.country,
      countryName: meta.name,
      flag: meta.flag,
      event: s.event,
      impact: s.impact,
      previous: s.previous ?? null,
      forecast: s.forecast ?? null,
      actual: null,
      unit: s.unit ?? null,
      currency: meta.currency,
    }
  })
}
