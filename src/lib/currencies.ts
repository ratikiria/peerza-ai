// Currency catalog used by the FX widget.
// Sourced via open.er-api.com — broad coverage incl. GEL and most national currencies.
// Flag comes from the country code via emoji regional-indicator letters.

export interface CurrencyMeta {
  code: string      // ISO 4217 (USD, EUR, …)
  name: string      // Display name
  country: string   // ISO 3166-1 alpha-2 (US, EU, …) — drives the flag emoji
}

export const CURRENCIES: CurrencyMeta[] = [
  // Major
  { code: "USD", name: "US Dollar",          country: "US" },
  { code: "EUR", name: "Euro",               country: "EU" },
  { code: "GBP", name: "British Pound",      country: "GB" },
  { code: "JPY", name: "Japanese Yen",       country: "JP" },
  { code: "CHF", name: "Swiss Franc",        country: "CH" },
  { code: "CAD", name: "Canadian Dollar",    country: "CA" },
  { code: "AUD", name: "Australian Dollar",  country: "AU" },
  { code: "NZD", name: "New Zealand Dollar", country: "NZ" },
  { code: "CNY", name: "Chinese Yuan",       country: "CN" },

  // Asia / Pacific
  { code: "HKD", name: "Hong Kong Dollar",   country: "HK" },
  { code: "TWD", name: "Taiwan Dollar",      country: "TW" },
  { code: "SGD", name: "Singapore Dollar",   country: "SG" },
  { code: "KRW", name: "South Korean Won",   country: "KR" },
  { code: "INR", name: "Indian Rupee",       country: "IN" },
  { code: "PKR", name: "Pakistani Rupee",    country: "PK" },
  { code: "BDT", name: "Bangladeshi Taka",   country: "BD" },
  { code: "LKR", name: "Sri Lankan Rupee",   country: "LK" },
  { code: "NPR", name: "Nepalese Rupee",     country: "NP" },
  { code: "THB", name: "Thai Baht",          country: "TH" },
  { code: "VND", name: "Vietnamese Dong",    country: "VN" },
  { code: "IDR", name: "Indonesian Rupiah",  country: "ID" },
  { code: "MYR", name: "Malaysian Ringgit",  country: "MY" },
  { code: "PHP", name: "Philippine Peso",    country: "PH" },
  { code: "MNT", name: "Mongolian Tugrik",   country: "MN" },
  { code: "KZT", name: "Kazakhstani Tenge",  country: "KZ" },
  { code: "UZS", name: "Uzbek Som",          country: "UZ" },
  { code: "AZN", name: "Azerbaijani Manat",  country: "AZ" },
  { code: "AMD", name: "Armenian Dram",      country: "AM" },
  { code: "GEL", name: "Georgian Lari",      country: "GE" },

  // Middle East / Africa
  { code: "TRY", name: "Turkish Lira",       country: "TR" },
  { code: "ILS", name: "Israeli Shekel",     country: "IL" },
  { code: "AED", name: "UAE Dirham",         country: "AE" },
  { code: "SAR", name: "Saudi Riyal",        country: "SA" },
  { code: "QAR", name: "Qatari Riyal",       country: "QA" },
  { code: "KWD", name: "Kuwaiti Dinar",      country: "KW" },
  { code: "BHD", name: "Bahraini Dinar",     country: "BH" },
  { code: "OMR", name: "Omani Rial",         country: "OM" },
  { code: "JOD", name: "Jordanian Dinar",    country: "JO" },
  { code: "LBP", name: "Lebanese Pound",     country: "LB" },
  { code: "EGP", name: "Egyptian Pound",     country: "EG" },
  { code: "MAD", name: "Moroccan Dirham",    country: "MA" },
  { code: "TND", name: "Tunisian Dinar",     country: "TN" },
  { code: "ZAR", name: "South African Rand", country: "ZA" },
  { code: "NGN", name: "Nigerian Naira",     country: "NG" },
  { code: "KES", name: "Kenyan Shilling",    country: "KE" },
  { code: "UGX", name: "Ugandan Shilling",   country: "UG" },
  { code: "GHS", name: "Ghanaian Cedi",      country: "GH" },
  { code: "ETB", name: "Ethiopian Birr",     country: "ET" },

  // Europe (non-euro)
  { code: "RUB", name: "Russian Ruble",      country: "RU" },
  { code: "UAH", name: "Ukrainian Hryvnia",  country: "UA" },
  { code: "PLN", name: "Polish Zloty",       country: "PL" },
  { code: "CZK", name: "Czech Koruna",       country: "CZ" },
  { code: "HUF", name: "Hungarian Forint",   country: "HU" },
  { code: "RON", name: "Romanian Leu",       country: "RO" },
  { code: "BGN", name: "Bulgarian Lev",      country: "BG" },
  { code: "RSD", name: "Serbian Dinar",      country: "RS" },
  { code: "MKD", name: "Macedonian Denar",   country: "MK" },
  { code: "ALL", name: "Albanian Lek",       country: "AL" },
  { code: "BAM", name: "Bosnia Mark",        country: "BA" },
  { code: "MDL", name: "Moldovan Leu",       country: "MD" },
  { code: "BYN", name: "Belarusian Ruble",   country: "BY" },
  { code: "SEK", name: "Swedish Krona",      country: "SE" },
  { code: "NOK", name: "Norwegian Krone",    country: "NO" },
  { code: "DKK", name: "Danish Krone",       country: "DK" },
  { code: "ISK", name: "Icelandic Krona",    country: "IS" },

  // Americas
  { code: "MXN", name: "Mexican Peso",       country: "MX" },
  { code: "BRL", name: "Brazilian Real",     country: "BR" },
  { code: "ARS", name: "Argentine Peso",     country: "AR" },
  { code: "CLP", name: "Chilean Peso",       country: "CL" },
  { code: "COP", name: "Colombian Peso",     country: "CO" },
  { code: "PEN", name: "Peruvian Sol",       country: "PE" },
  { code: "UYU", name: "Uruguayan Peso",     country: "UY" },
  { code: "VES", name: "Venezuelan Bolívar", country: "VE" },
]

// Quick lookup
export const CURRENCY_BY_CODE: Record<string, CurrencyMeta> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
)

// Two-letter country code → flag emoji (regional indicator characters).
// "EU" is special-cased to the EU flag.
export function flagEmoji(country: string): string {
  if (!country) return "🏳️"
  const cc = country.toUpperCase()
  if (cc === "EU") return "🇪🇺"
  if (cc.length !== 2) return "🏳️"
  const A = 0x1F1E6
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65))
}

// Locale-based fallback: derive a default currency from the browser locale.
// Returns USD if the browser doesn't expose a region.
export function defaultLocaleCurrency(): string {
  if (typeof navigator === "undefined") return "USD"
  try {
    const locale = navigator.language || "en-US"
    const region = locale.split("-")[1]?.toUpperCase()
    if (!region) return "USD"
    const match = CURRENCIES.find((c) => c.country === region)
    return match?.code ?? "USD"
  } catch {
    return "USD"
  }
}
