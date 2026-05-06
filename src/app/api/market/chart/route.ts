import { NextRequest, NextResponse } from "next/server";
import { stooqToYahoo } from "@/lib/market";

interface OHLCPoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

interface CachedChart {
  data: { points: OHLCPoint[] };
  ts: number;
}

const cache = new Map<string, CachedChart>();
const TTL_MS = 5 * 60 * 1000; // 5 min

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source"); // crypto | stock
  const id = searchParams.get("id");
  const days = Number(searchParams.get("days") ?? "30");

  if (!source || !id) return NextResponse.json({ error: "source + id required" }, { status: 400 });

  const cacheKey = `${source}:${id}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    if (source === "crypto") {
      const points = await fetchCryptoHistory(id, days);
      const result = { points };
      cache.set(cacheKey, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    }
    if (source === "stock") {
      const points = await fetchStockHistory(id, days);
      const result = { points };
      cache.set(cacheKey, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 502 }
    );
  }
}

async function fetchCryptoHistory(coinGeckoId: string, days: number): Promise<OHLCPoint[]> {
  // CoinGecko OHLC: 4h candles for ≤2 days, daily for ≥3 days. Free tier requires standard `days` values.
  const allowed = [1, 7, 14, 30, 90, 180, 365];
  const clamped = allowed.reduce((p, c) => Math.abs(c - days) < Math.abs(p - days) ? c : p, allowed[0]);
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinGeckoId)}/ohlc?vs_currency=usd&days=${clamped}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  // Returns [[timestamp, open, high, low, close], ...]
  const rows: [number, number, number, number, number][] = await res.json();
  return rows.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

async function fetchStockHistory(stooqSymbol: string, days: number): Promise<OHLCPoint[]> {
  // Stooq's free CSV history endpoint now requires an API key, so use Yahoo Finance v8 chart instead.
  // Convert stooq symbol → yahoo (e.g. "nvda.us" → "NVDA", "^spx" → "^GSPC")
  const yahooSymbol = stooqToYahoo(stooqSymbol);
  const { range, interval } = daysToRange(days);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("No chart data");

  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  const opens: (number | null)[]   = q?.open   ?? [];
  const highs: (number | null)[]   = q?.high   ?? [];
  const lows: (number | null)[]    = q?.low    ?? [];
  const closes: (number | null)[]  = q?.close  ?? [];
  const volumes: (number | null)[] = q?.volume ?? [];

  const points: OHLCPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    points.push({
      t: ts[i] * 1000,
      o: opens[i]  ?? c,
      h: highs[i]  ?? c,
      l: lows[i]   ?? c,
      c,
      v: volumes[i] ?? null,
    });
  }
  return points;
}

function daysToRange(days: number): { range: string; interval: string } {
  if (days <= 7) return { range: "7d", interval: "1h" };
  if (days <= 30) return { range: "1mo", interval: "1d" };
  if (days <= 90) return { range: "3mo", interval: "1d" };
  if (days <= 180) return { range: "6mo", interval: "1d" };
  if (days <= 365) return { range: "1y", interval: "1d" };
  return { range: "2y", interval: "1wk" };
}
