"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Newspaper } from "lucide-react";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  thumbnail: string | null;
}

interface Props {
  q: string;
  limit?: number;
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  const d = Math.floor(sec / 86400);
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m}mo ago`;
}

export default function AssetNews({ q, limit = 5 }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market/news?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setNews(data.news ?? []);
      })
      .catch(() => { if (!cancelled) setNews([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className="rounded-lg" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <Newspaper size={12} className="text-white/40" />
        <span className="text-xs font-semibold text-white/60">News · {q}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin text-white/30" />
        </div>
      ) : news.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-white/30">No recent news</div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {news.slice(0, limit).map((item) => (
            <a
              key={item.uuid}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors group"
            >
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-14 h-14 rounded object-cover shrink-0 border"
                  style={{ borderColor: "var(--border)" }}
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded shrink-0 flex items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <Newspaper size={16} className="text-white/20" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-emerald-300 transition-colors">
                  {item.title}
                </p>
                <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                  <span className="truncate">{item.publisher}</span>
                  <span>·</span>
                  <span className="shrink-0">{timeAgo(item.publishedAt)}</span>
                  <ExternalLink size={9} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
