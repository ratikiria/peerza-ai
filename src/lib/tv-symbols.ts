// Mapping helpers for TradingView Advanced Charts widget symbols.
// We accept either an explicit Stooq/CoinGecko id from our watchlist, or a
// raw display ticker, and produce a TradingView-compatible symbol string.

const INDEX_MAP: Record<string, string> = {
  "^spx":   "TVC:SPX",
  "^ndx":   "TVC:NDX",
  "^dji":   "TVC:DJI",
  "^vix":   "TVC:VIX",
  "^ftse":  "TVC:UKX",
  "^gdaxi": "TVC:DAX",
  "^n225":  "TVC:NI225",
  "dx.f":   "TVC:DXY",
}

const COMMODITY_MAP: Record<string, string> = {
  "xauusd": "OANDA:XAUUSD",
  "xagusd": "OANDA:XAGUSD",
  "xauusd.f": "OANDA:XAUUSD",
  "cl.f":   "TVC:USOIL",
  "ng.f":   "TVC:NATURALGAS",
}

const FX_MAP: Record<string, string> = {
  "eurusd": "OANDA:EURUSD",
  "gbpusd": "OANDA:GBPUSD",
  "usdjpy": "OANDA:USDJPY",
  "usdchf": "OANDA:USDCHF",
  "audusd": "OANDA:AUDUSD",
  "usdcad": "OANDA:USDCAD",
  "nzdusd": "OANDA:NZDUSD",
}

export interface TvSymbolInput {
  source?: "crypto" | "stock"
  /** CoinGecko id (e.g. "bitcoin", "ethereum") */
  cgId?: string
  /** Stooq symbol (e.g. "nvda.us", "^spx", "xauusd") */
  stooqSymbol?: string
  /** Display ticker (e.g. "BTC", "AAPL") — used as last-resort fallback. */
  symbol?: string
}

const CRYPTO_BY_CG: Record<string, string> = {
  "bitcoin":       "BTC",
  "ethereum":      "ETH",
  "solana":        "SOL",
  "ripple":        "XRP",
  "cardano":       "ADA",
  "dogecoin":      "DOGE",
  "polkadot":      "DOT",
  "binancecoin":   "BNB",
  "matic-network": "MATIC",
  "avalanche-2":   "AVAX",
  "chainlink":     "LINK",
  "litecoin":      "LTC",
  "shiba-inu":     "SHIB",
}

export function toTvSymbol(input: TvSymbolInput): string {
  const { source, cgId, stooqSymbol, symbol } = input

  if (source === "crypto" || cgId) {
    const ticker = (cgId && CRYPTO_BY_CG[cgId]) ?? (symbol ?? "BTC").toUpperCase()
    return `BINANCE:${ticker}USDT`
  }

  if (stooqSymbol) {
    const s = stooqSymbol.toLowerCase()
    if (INDEX_MAP[s])     return INDEX_MAP[s]
    if (COMMODITY_MAP[s]) return COMMODITY_MAP[s]
    if (FX_MAP[s])        return FX_MAP[s]
    // US stocks like "nvda.us" → "NVDA"
    if (s.endsWith(".us")) return s.slice(0, -3).toUpperCase()
    return s.toUpperCase()
  }

  if (symbol) return symbol.toUpperCase()
  return "BINANCE:BTCUSDT"
}

/**
 * Reduce a TradingView symbol to the bare ticker that users tag posts with.
 * Examples:
 *   BINANCE:BTCUSDT  → BTC
 *   NASDAQ:NVDA      → NVDA
 *   OANDA:XAUUSD     → XAUUSD
 *   TVC:SPX          → SPX
 *   AAPL             → AAPL
 */
export function tvToTicker(tv: string): string {
  const after = tv.includes(":") ? tv.split(":")[1] : tv
  if (tv.toUpperCase().startsWith("BINANCE:") && after.toUpperCase().endsWith("USDT")) {
    return after.slice(0, -4).toUpperCase()
  }
  if (tv.toUpperCase().startsWith("BINANCE:") && after.toUpperCase().endsWith("USD")) {
    return after.slice(0, -3).toUpperCase()
  }
  return after.toUpperCase()
}

export interface QuickPick {
  label: string
  tv: string
}

export const QUICK_PICKS: { group: string; items: QuickPick[] }[] = [
  {
    group: "Crypto",
    items: [
      { label: "BTC",  tv: "BINANCE:BTCUSDT" },
      { label: "ETH",  tv: "BINANCE:ETHUSDT" },
      { label: "SOL",  tv: "BINANCE:SOLUSDT" },
      { label: "BNB",  tv: "BINANCE:BNBUSDT" },
    ],
  },
  {
    group: "Stocks",
    items: [
      { label: "AAPL", tv: "NASDAQ:AAPL" },
      { label: "NVDA", tv: "NASDAQ:NVDA" },
      { label: "TSLA", tv: "NASDAQ:TSLA" },
      { label: "MSFT", tv: "NASDAQ:MSFT" },
    ],
  },
  {
    group: "Indices",
    items: [
      { label: "S&P 500", tv: "TVC:SPX" },
      { label: "Nasdaq",  tv: "TVC:NDX" },
      { label: "Dow",     tv: "TVC:DJI" },
      { label: "DXY",     tv: "TVC:DXY" },
    ],
  },
  {
    group: "FX",
    items: [
      { label: "EUR/USD", tv: "OANDA:EURUSD" },
      { label: "GBP/USD", tv: "OANDA:GBPUSD" },
      { label: "USD/JPY", tv: "OANDA:USDJPY" },
      { label: "USD/CHF", tv: "OANDA:USDCHF" },
    ],
  },
  {
    group: "Commodities",
    items: [
      { label: "Gold",   tv: "OANDA:XAUUSD" },
      { label: "Silver", tv: "OANDA:XAGUSD" },
      { label: "Oil",    tv: "TVC:USOIL" },
      { label: "Gas",    tv: "TVC:NATURALGAS" },
    ],
  },
]
