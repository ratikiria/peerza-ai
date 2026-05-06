// Yahoo Finance suffix → emoji flag (used in ticker search results so users
// can see which exchange a stock trades on at a glance).
const YAHOO_SUFFIX_TO_FLAG: Record<string, string> = {
  "DE": "🇩🇪", "L":  "🇬🇧", "T":  "🇯🇵", "HK": "🇭🇰", "PA": "🇫🇷",
  "SW": "🇨🇭", "AS": "🇳🇱", "MC": "🇪🇸", "MI": "🇮🇹", "BR": "🇧🇪",
  "OL": "🇳🇴", "ST": "🇸🇪", "CO": "🇩🇰", "HE": "🇫🇮", "VI": "🇦🇹",
  "WA": "🇵🇱", "AX": "🇦🇺", "TO": "🇨🇦", "V":  "🇨🇦", "SA": "🇧🇷",
  "MX": "🇲🇽", "JK": "🇮🇩", "NS": "🇮🇳", "BO": "🇮🇳", "TW": "🇹🇼",
  "KS": "🇰🇷", "KQ": "🇰🇷", "SS": "🇨🇳", "SZ": "🇨🇳", "JO": "🇿🇦",
  "TA": "🇮🇱", "IR": "🇮🇪", "IS": "🇮🇸", "NZ": "🇳🇿", "BK": "🇹🇭",
}

// Forex pair → flag pair (e.g. "EURUSD=X" → "🇪🇺🇺🇸")
const CURRENCY_TO_FLAG: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭",
  AUD: "🇦🇺", CAD: "🇨🇦", NZD: "🇳🇿", CNY: "🇨🇳", HKD: "🇭🇰",
  SGD: "🇸🇬", SEK: "🇸🇪", NOK: "🇳🇴", DKK: "🇩🇰", MXN: "🇲🇽",
  ZAR: "🇿🇦", TRY: "🇹🇷", INR: "🇮🇳", RUB: "🇷🇺", BRL: "🇧🇷",
  KRW: "🇰🇷", PLN: "🇵🇱",
}

// Returns a flag (or globe / commodity icon) for a Yahoo symbol. Used in search.
export function flagForYahoo(yahoo: string, quoteType?: string): string {
  if (!yahoo) return "🌐"
  const t = (quoteType ?? "").toUpperCase()

  // Forex: "EURUSD=X" → 🇪🇺🇺🇸
  const fxMatch = yahoo.match(/^([A-Z]{3})([A-Z]{3})=X$/)
  if (fxMatch) {
    const a = CURRENCY_TO_FLAG[fxMatch[1]]
    const b = CURRENCY_TO_FLAG[fxMatch[2]]
    if (a && b) return a + b
  }

  // Futures: "GC=F", "CL=F" → commodity icon
  if (yahoo.endsWith("=F")) return "🛢️"

  // US indices and tickers without suffix
  if (yahoo.startsWith("^")) return "🇺🇸"

  // International equities: pull suffix
  const dotIdx = yahoo.lastIndexOf(".")
  if (dotIdx > 0) {
    const suffix = yahoo.slice(dotIdx + 1).toUpperCase()
    if (YAHOO_SUFFIX_TO_FLAG[suffix]) return YAHOO_SUFFIX_TO_FLAG[suffix]
  }

  // Default: equity / ETF without suffix → US listing
  if (t === "EQUITY" || t === "ETF" || t === "INDEX" || /^[A-Z][A-Z0-9.-]*$/.test(yahoo)) {
    return "🇺🇸"
  }
  return "🌐"
}

// Map Yahoo Finance suffix → Stooq suffix for international equities.
// Stooq covers many major exchanges with these codes; the `prices` route also
// races Yahoo as a fallback so even Stooq-unsupported tickers resolve.
const YAHOO_SUFFIX_TO_STOOQ: Record<string, string> = {
  "DE": "de", // Frankfurt / XETRA
  "L":  "uk", // London
  "T":  "jp", // Tokyo
  "HK": "hk", // Hong Kong
  "PA": "fr", // Paris
  "SW": "ch", // Switzerland (SIX)
  "AS": "nl", // Amsterdam
  "MC": "es", // Madrid
  "MI": "it", // Milan
  "BR": "be", // Brussels
  "OL": "no", // Oslo
  "ST": "se", // Stockholm
  "CO": "dk", // Copenhagen
  "HE": "fi", // Helsinki
  "VI": "at", // Vienna
  "WA": "pl", // Warsaw
  "AX": "au", // Australia (ASX)
  "TO": "ca", // Toronto
  "V":  "ca", // TSX Venture
  "SA": "br", // São Paulo
  "MX": "mx", // Mexico
  "JK": "id", // Jakarta
  "NS": "in", // NSE India
  "BO": "in", // BSE India
}

const STOOQ_SUFFIX_TO_YAHOO: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [yh, st] of Object.entries(YAHOO_SUFFIX_TO_STOOQ)) {
    if (!out[st]) out[st] = yh // first wins; .ca prefers .TO over .V
  }
  return out
})()

// Convert Yahoo Finance symbol → Stooq symbol used by /api/market/prices
export function yahooToStooq(yahoo: string): string {
  const map: Record<string, string> = {
    "GC=F": "xauusd", "SI=F": "xagusd", "CL=F": "cl.f",
    "NG=F": "ng.f",   "HG=F": "hg.f",   "DX=F": "dx.f",
    "^GSPC": "^spx",  "^DJI": "^dji",   "^IXIC": "^ndq",
    "^VIX": "^vix",   "^TNX": "^tnx",   "^RUT": "^rut",
    "BTC-USD": "btc.v", "ETH-USD": "eth.v",
  };
  if (map[yahoo]) return map[yahoo];
  // Forex pairs from Yahoo: "EURUSD=X" → "eurusd"
  if (/^[A-Z]{6}=X$/.test(yahoo)) return yahoo.slice(0, -2).toLowerCase();
  // International equity with Yahoo suffix: "BMW.DE" → "bmw.de", "7203.T" → "7203.jp"
  const dotIdx = yahoo.lastIndexOf(".")
  if (dotIdx > 0) {
    const base = yahoo.slice(0, dotIdx)
    const suffix = yahoo.slice(dotIdx + 1).toUpperCase()
    if (YAHOO_SUFFIX_TO_STOOQ[suffix]) {
      return `${base.toLowerCase()}.${YAHOO_SUFFIX_TO_STOOQ[suffix]}`
    }
  }
  // US equity / no suffix: "NVDA" → "nvda.us"
  if (/^[A-Z][A-Z0-9.-]*$/.test(yahoo) && !yahoo.includes(".")) {
    return yahoo.toLowerCase() + ".us"
  }
  return yahoo.toLowerCase();
}

// Reverse: Stooq symbol → Yahoo symbol (for /api/market/chart, since Stooq's CSV API now requires a paid key)
export function stooqToYahoo(stooq: string): string {
  const reverseMap: Record<string, string> = {
    "xauusd": "GC=F", "xagusd": "SI=F", "cl.f": "CL=F",
    "ng.f": "NG=F",   "hg.f": "HG=F",   "dx.f": "DX=F",
    "^spx": "^GSPC",  "^dji": "^DJI",   "^ndq": "^IXIC",
    "^vix": "^VIX",   "^tnx": "^TNX",   "^rut": "^RUT",
    "btc.v": "BTC-USD", "eth.v": "ETH-USD",
  };
  if (reverseMap[stooq]) return reverseMap[stooq];
  // Forex: 6 lowercase letters → uppercase + "=X"
  if (/^[a-z]{6}$/.test(stooq)) return stooq.toUpperCase() + "=X";
  if (stooq.endsWith(".us")) return stooq.slice(0, -3).toUpperCase();
  // International: "bmw.de" → "BMW.DE", "7203.jp" → "7203.T"
  const dotIdx = stooq.lastIndexOf(".")
  if (dotIdx > 0) {
    const base = stooq.slice(0, dotIdx).toUpperCase()
    const suffix = stooq.slice(dotIdx + 1).toLowerCase()
    if (STOOQ_SUFFIX_TO_YAHOO[suffix]) {
      return `${base}.${STOOQ_SUFFIX_TO_YAHOO[suffix]}`
    }
  }
  return stooq.toUpperCase();
}
