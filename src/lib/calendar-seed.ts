// Curated economic calendar — real scheduled events for major economies.
//
// Why this exists: live API access (FMP, TradingEconomics, etc.) is paid, and
// our FMP plan doesn't include the calendar endpoint. But the events most
// users care about are either (a) published months in advance by the issuer,
// or (b) follow a fixed rule. So:
//
//   1. RULE_EVENTS generate recurring releases for ANY date range (weekly
//      jobless claims, NFP, ISM PMIs, FOMC minutes). These never go stale.
//   2. DATED holds one-off dates published by the issuer (central-bank
//      decisions, CPI/PPI). Extend it when issuers publish new calendars:
//        - Fed:  https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
//        - ECB:  https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
//        - BoE:  https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates
//        - BoJ:  https://www.boj.or.jp/en/mopo/mpmsche_minu/
//        - BoC:  https://www.bankofcanada.ca/press/upcoming-events/
//        - RBA:  https://www.rba.gov.au/schedules-events/board-meeting-schedules.html
//        - BLS:  https://www.bls.gov/schedule/news_release/current_year.asp
//
// Times are entered in the issuer's LOCAL time + IANA zone and converted to
// UTC, so DST shifts (e.g. 08:30 ET = 12:30 or 13:30 UTC) are handled.
//
// We don't invent previous/forecast figures — those stay null unless known.

import type { EconomicEvent, Impact } from "./calendar"

type Country = "US" | "EU" | "GB" | "JP" | "CN" | "DE" | "AU" | "CA"

const COUNTRY_META: Record<Country, { name: string; flag: string; currency: string }> = {
  US: { name: "United States",   flag: "🇺🇸", currency: "USD" },
  EU: { name: "Eurozone",        flag: "🇪🇺", currency: "EUR" },
  GB: { name: "United Kingdom",  flag: "🇬🇧", currency: "GBP" },
  JP: { name: "Japan",           flag: "🇯🇵", currency: "JPY" },
  CN: { name: "China",           flag: "🇨🇳", currency: "CNY" },
  DE: { name: "Germany",         flag: "🇩🇪", currency: "EUR" },
  AU: { name: "Australia",       flag: "🇦🇺", currency: "AUD" },
  CA: { name: "Canada",          flag: "🇨🇦", currency: "CAD" },
}

const NY = "America/New_York"

// ---------------------------------------------------------------------------
// Date helpers (all "day" values are YYYY-MM-DD strings, treated as calendar
// dates with no time zone).

function dayFromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function dayMs(day: string): number {
  return Date.parse(day + "T00:00:00Z")
}

function addDays(day: string, n: number): string {
  return dayFromUtc(dayMs(day) + n * 86_400_000)
}

function weekday(day: string): number {
  return new Date(dayMs(day)).getUTCDay() // 0 = Sun
}

function ymd(y: number, m: number, d: number): string {
  return dayFromUtc(Date.UTC(y, m - 1, d))
}

// nth (1-based) given weekday of a month, e.g. nthWeekday(2026, 11, 4, 4) = Thanksgiving.
function nthWeekday(y: number, m: number, wd: number, n: number): string {
  const first = ymd(y, m, 1)
  const offset = (wd - weekday(first) + 7) % 7
  return addDays(first, offset + (n - 1) * 7)
}

// Offset (ms) of `tz` from UTC at instant `ms`.
function tzOffset(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUtc - Math.floor(ms / 1000) * 1000
}

// Local wall-clock time in `tz` → ISO UTC string.
function zonedToIso(day: string, hhmm: string, tz: string): string {
  const [h, mi] = hhmm.split(":").map(Number)
  const guess = dayMs(day) + (h * 60 + mi) * 60_000
  let utc = guess - tzOffset(guess, tz)
  utc = guess - tzOffset(utc, tz) // second pass settles DST boundaries
  return new Date(utc).toISOString().replace(".000Z", "Z")
}

// US federal holidays that move data releases (observed dates).
function usHolidays(y: number): Set<string> {
  const observed = (day: string) => {
    const wd = weekday(day)
    return wd === 6 ? addDays(day, -1) : wd === 0 ? addDays(day, 1) : day
  }
  return new Set([
    observed(ymd(y, 1, 1)),
    observed(ymd(y, 7, 4)),
    nthWeekday(y, 9, 1, 1),   // Labor Day
    nthWeekday(y, 11, 4, 4),  // Thanksgiving
    observed(ymd(y, 12, 25)),
  ])
}

function isUsBusinessDay(day: string): boolean {
  const wd = weekday(day)
  if (wd === 0 || wd === 6) return false
  return !usHolidays(Number(day.slice(0, 4))).has(day)
}

function nthUsBusinessDay(y: number, m: number, n: number): string {
  let day = ymd(y, m, 1)
  let count = 0
  for (;;) {
    if (isUsBusinessDay(day)) count++
    if (count === n) return day
    day = addDays(day, 1)
  }
}

// ---------------------------------------------------------------------------
// Event definitions

interface Occurrence {
  day: string
  time: string       // HH:MM local to `tz`
  tz: string
  country: Country
  event: string
  impact: Impact
}

// One-off dates published by the issuer. Keep entries in local time.
const FOMC_DECISIONS = [
  "2026-09-16", "2026-10-28", "2026-12-09",
  "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09",
  "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08",
]
// Meetings with a Summary of Economic Projections (dot plot).
const SEP_MONTHS = new Set(["03", "06", "09", "12"])

const ECB_DECISIONS = ["2026-10-29", "2026-12-17", "2027-02-04", "2027-03-18", "2027-04-29"]

const BOE_DECISIONS = [
  "2026-11-05", "2026-12-17",
  "2027-02-04", "2027-03-18", "2027-04-29", "2027-06-17",
  "2027-07-29", "2027-09-16", "2027-11-04", "2027-12-16",
]

const BOJ_DECISIONS = ["2026-10-30", "2026-12-18"]
const BOC_DECISIONS = ["2026-10-28", "2026-12-09"]
const RBA_DECISIONS = ["2026-11-03", "2026-12-08"]

const US_CPI = ["2026-10-14", "2026-11-10", "2026-12-10"]
const US_PPI = ["2026-10-15", "2026-11-13", "2026-12-15"]

function datedOccurrences(): Occurrence[] {
  const out: Occurrence[] = []
  for (const d of FOMC_DECISIONS) {
    out.push({ day: d, time: "14:00", tz: NY, country: "US", event: "Fed Interest Rate Decision", impact: "high" })
    out.push({
      day: d, time: "14:30", tz: NY, country: "US", impact: "high",
      event: SEP_MONTHS.has(d.slice(5, 7)) ? "FOMC Press Conference + Dot Plot" : "FOMC Press Conference",
    })
    // Minutes are released three weeks after each meeting.
    out.push({ day: addDays(d, 21), time: "14:00", tz: NY, country: "US", event: "FOMC Meeting Minutes", impact: "high" })
  }
  for (const d of ECB_DECISIONS) {
    out.push({ day: d, time: "14:15", tz: "Europe/Berlin", country: "EU", event: "ECB Interest Rate Decision", impact: "high" })
    out.push({ day: d, time: "14:45", tz: "Europe/Berlin", country: "EU", event: "ECB Press Conference", impact: "high" })
  }
  for (const d of BOE_DECISIONS) {
    out.push({ day: d, time: "12:00", tz: "Europe/London", country: "GB", event: "BoE Interest Rate Decision", impact: "high" })
    out.push({ day: d, time: "12:00", tz: "Europe/London", country: "GB", event: "BoE MPC Meeting Minutes", impact: "high" })
  }
  // BoJ has no fixed release time; decisions typically land around midday Tokyo.
  for (const d of BOJ_DECISIONS) {
    out.push({ day: d, time: "12:00", tz: "Asia/Tokyo", country: "JP", event: "BoJ Interest Rate Decision", impact: "high" })
  }
  for (const d of BOC_DECISIONS) {
    out.push({ day: d, time: "09:45", tz: "America/Toronto", country: "CA", event: "BoC Interest Rate Decision", impact: "high" })
  }
  for (const d of RBA_DECISIONS) {
    out.push({ day: d, time: "14:30", tz: "Australia/Sydney", country: "AU", event: "RBA Interest Rate Decision", impact: "high" })
  }
  for (const d of US_CPI) {
    out.push({ day: d, time: "08:30", tz: NY, country: "US", event: "CPI YoY", impact: "high" })
    out.push({ day: d, time: "08:30", tz: NY, country: "US", event: "Core CPI YoY", impact: "high" })
  }
  for (const d of US_PPI) {
    out.push({ day: d, time: "08:30", tz: NY, country: "US", event: "PPI MoM", impact: "medium" })
  }
  return out
}

// Recurring releases generated for every month touched by [from, to).
function ruleOccurrences(from: string, to: string): Occurrence[] {
  const out: Occurrence[] = []

  // Weekly: initial jobless claims, Thursdays (moved to Wednesday on holidays).
  let day = from
  while (weekday(day) !== 4) day = addDays(day, 1)
  for (; day < to; day = addDays(day, 7)) {
    const release = isUsBusinessDay(day) ? day : addDays(day, -1)
    out.push({ day: release, time: "08:30", tz: NY, country: "US", event: "Initial Jobless Claims", impact: "medium" })
  }

  // Monthly releases. Start one month early so rules near the boundary are covered.
  const start = new Date(dayMs(from))
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth() // 0-based → previous month in 1-based terms
  if (m === 0) { y -= 1; m = 12 }
  for (;;) {
    if (ymd(y, m, 1) >= to) break

    // Employment Situation: third Friday after the week (Sun–Sat) containing the 12th.
    const twelfth = ymd(y, m, 12)
    const refWeekEnd = addDays(twelfth, 6 - weekday(twelfth))
    const nfp = addDays(refWeekEnd, 6 + 14)
    out.push({ day: nfp, time: "08:30", tz: NY, country: "US", event: "Non-Farm Payrolls", impact: "high" })
    out.push({ day: nfp, time: "08:30", tz: NY, country: "US", event: "Unemployment Rate", impact: "high" })
    out.push({ day: nfp, time: "08:30", tz: NY, country: "US", event: "Average Hourly Earnings YoY", impact: "medium" })

    // ISM PMIs: 1st and 3rd US business day of the month.
    out.push({ day: nthUsBusinessDay(y, m, 1), time: "10:00", tz: NY, country: "US", event: "ISM Manufacturing PMI", impact: "medium" })
    out.push({ day: nthUsBusinessDay(y, m, 3), time: "10:00", tz: NY, country: "US", event: "ISM Services PMI", impact: "medium" })

    m += 1
    if (m === 13) { y += 1; m = 1 }
  }
  return out
}

const LAST_DATED_DAY = [
  ...FOMC_DECISIONS, ...ECB_DECISIONS, ...BOE_DECISIONS, ...BOJ_DECISIONS,
  ...BOC_DECISIONS, ...RBA_DECISIONS, ...US_CPI, ...US_PPI,
].sort().at(-1)!

let warnedStale = false

// All curated events whose release falls in [from, to) (YYYY-MM-DD, UTC).
export function curatedEvents(from: string, to: string): EconomicEvent[] {
  if (!warnedStale && to > LAST_DATED_DAY) {
    warnedStale = true
    console.warn(`[calendar] curated dated events end ${LAST_DATED_DAY} — extend DATED lists in calendar-seed.ts`)
  }

  const fromMs = dayMs(from)
  const toMs = dayMs(to)
  const occurrences = [...datedOccurrences(), ...ruleOccurrences(addDays(from, -1), addDays(to, 1))]

  return occurrences
    .map((o): EconomicEvent => {
      const meta = COUNTRY_META[o.country]
      const time = zonedToIso(o.day, o.time, o.tz)
      return {
        id: `seed-${o.country}-${time}-${o.event}`,
        time,
        country: o.country,
        countryName: meta.name,
        flag: meta.flag,
        event: o.event,
        impact: o.impact,
        previous: null,
        forecast: null,
        actual: null,
        unit: null,
        currency: meta.currency,
      }
    })
    .filter((e) => {
      const t = Date.parse(e.time)
      return t >= fromMs && t < toMs
    })
}
