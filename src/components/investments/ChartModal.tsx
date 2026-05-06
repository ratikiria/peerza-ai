"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import TradingViewChart from "@/components/workspace/TradingViewChart";
import { toTvSymbol } from "@/lib/tv-symbols";

interface Props {
  source: "crypto" | "stock";
  id: string;            // CoinGecko id (crypto) or Stooq symbol (stock)
  symbol: string;
  name: string;
  onClose: () => void;
}

function detectTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export default function ChartModal({ source, id, symbol, name, onClose }: Props) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Resolve our internal source+id to a TradingView symbol once on mount.
  // Using TV here (instead of the inline AssetChart) so users get pan/zoom/scroll
  // and the full toolbar when they explicitly expand the chart.
  const tvSymbol = toTvSymbol({
    source,
    cgId:        source === "crypto" ? id : undefined,
    stooqSymbol: source === "stock"  ? id : undefined,
    symbol,
  });

  useEffect(() => {
    setTheme(detectTheme());
    const obs = new MutationObserver(() => setTheme(detectTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          height: "min(85vh, 800px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>
                {symbol}
              </h3>
              <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{name}</p>
            </div>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
            >
              TradingView
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={`/workspace?tv=${encodeURIComponent(tvSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-base)] transition-colors"
              style={{ color: "var(--text-secondary)" }}
              title="Open in Workspace"
            >
              <ExternalLink size={12} /> Workspace
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TradingView fills the remaining height. The widget supports pan,
            zoom, multi-timeframe, drawings, etc — much richer than the inline
            AssetChart preview shown in the trade form. */}
        <div className="flex-1 min-h-0">
          <TradingViewChart symbol={tvSymbol} interval="60" theme={theme} />
        </div>
      </div>
    </div>
  );
}
