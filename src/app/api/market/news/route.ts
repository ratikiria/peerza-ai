import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  thumbnail: string | null;
}

const cache = new Map<string, { data: { news: NewsItem[] }; ts: number }>();
const TTL = 10 * 60 * 1000; // 10 min

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const cached = cache.get(q.toLowerCase());
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=0&newsCount=10&listsCount=0&enableEnhancedTrivialQuery=true`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const data = await res.json();
    const news: NewsItem[] = (data.news ?? []).map((n: {
      uuid: string;
      title: string;
      publisher: string;
      link: string;
      providerPublishTime: number;
      thumbnail?: { resolutions?: { url: string; width: number }[] };
    }) => {
      const thumbs = n.thumbnail?.resolutions ?? [];
      // Pick a smaller thumbnail to load fast (140-200px wide)
      const small =
        thumbs.find((t) => t.width >= 140 && t.width <= 240) ??
        thumbs[thumbs.length - 1] ??
        null;
      return {
        uuid: n.uuid,
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: (n.providerPublishTime ?? 0) * 1000,
        thumbnail: small?.url ?? null,
      };
    });

    const result = { news };
    cache.set(q.toLowerCase(), { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch news", news: [] },
      { status: 502 }
    );
  }
}
