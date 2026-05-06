import { NextResponse } from "next/server"

// Cache logos for 24h — they don't change often.
const cache = new Map<string, { url: string | null; ts: number }>()
const TTL = 24 * 60 * 60 * 1000

const FETCH_TIMEOUT_MS = 3500

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms)
    p.then((v) => { clearTimeout(id); resolve(v) }, (e) => { clearTimeout(id); reject(e) })
  })
}

// Crypto via CoinGecko's coin endpoint — returns image.large
async function fetchCryptoLogo(coinId: string): Promise<string | null> {
  try {
    const res = await withTimeout(
      fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`, {
        headers: { accept: "application/json" }, cache: "no-store",
      }),
      FETCH_TIMEOUT_MS
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.image?.large ?? data?.image?.small ?? data?.image?.thumb ?? null
  } catch { return null }
}

// Stocks: use parqet's logo CDN, which has good coverage for US and international
// equities (NESN.SW, BMW.DE, 7203.T, etc.). Skip indices and forex — those don't
// have logos. The URL is deterministic, so we don't need to fetch it server-side;
// the browser tries to load it and the <img> onError handler hides broken results.
function stockLogoUrl(yahooSymbol: string): string | null {
  if (!yahooSymbol) return null
  // Forex pairs (EURUSD=X), futures (GC=F), indices (^GSPC) don't have logos
  if (yahooSymbol.endsWith("=X") || yahooSymbol.endsWith("=F") || yahooSymbol.startsWith("^")) {
    return null
  }
  return `https://assets.parqet.com/logos/symbol/${encodeURIComponent(yahooSymbol)}`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const source = searchParams.get("source")
  const id = searchParams.get("id")
  if (!source || !id) return NextResponse.json({ error: "source + id required" }, { status: 400 })

  const cacheKey = `${source}:${id}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ url: cached.url })
  }

  let url: string | null = null
  if (source === "crypto") url = await fetchCryptoLogo(id)
  else if (source === "yahoo") url = stockLogoUrl(id)

  cache.set(cacheKey, { url, ts: Date.now() })
  return NextResponse.json({ url })
}
