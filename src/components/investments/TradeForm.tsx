"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { yahooToStooq, stooqToYahoo, flagForYahoo } from "@/lib/market";
import AssetChart from "./AssetChart";
import AssetNews from "./AssetNews";
import ChartModal from "./ChartModal";

interface AssetResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  // We'll add priceKey + assetType based on our logic
  priceKey: string;
  assetType: string;
}

interface SearchAPIResult {
  id: string;
  symbol: string;
  name: string;
  source: "crypto" | "yahoo";
  type?: string;
  cgId?: string;
  yahooSymbol?: string;
}

interface Props {
  challengeId: string;
  allowedAssetClasses: string[];
  onTraded: () => void;
}

export default function TradeForm({ challengeId, allowedAssetClasses, onTraded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AssetResult | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"chart" | "news">("chart");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Popular crypto defaults for quick select
  const POPULAR_CRYPTO: AssetResult[] = [
    { symbol: "BTC", name: "Bitcoin", priceKey: "bitcoin", assetType: "crypto" },
    { symbol: "ETH", name: "Ethereum", priceKey: "ethereum", assetType: "crypto" },
    { symbol: "SOL", name: "Solana", priceKey: "solana", assetType: "crypto" },
    { symbol: "BNB", name: "BNB", priceKey: "binancecoin", assetType: "crypto" },
  ];

  const POPULAR_STOCKS: AssetResult[] = [
    { symbol: "NVDA", name: "NVIDIA Corp", priceKey: "nvda.us", assetType: "stock" },
    { symbol: "AAPL", name: "Apple Inc", priceKey: "aapl.us", assetType: "stock" },
    { symbol: "TSLA", name: "Tesla Inc", priceKey: "tsla.us", assetType: "stock" },
    { symbol: "MSFT", name: "Microsoft Corp", priceKey: "msft.us", assetType: "stock" },
  ];

  const POPULAR_FOREX: AssetResult[] = [
    { symbol: "EUR/USD", name: "Euro / US Dollar",     priceKey: "eurusd", assetType: "forex" },
    { symbol: "GBP/USD", name: "British Pound / USD",  priceKey: "gbpusd", assetType: "forex" },
    { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", priceKey: "usdjpy", assetType: "forex" },
    { symbol: "AUD/USD", name: "Australian / US Dollar", priceKey: "audusd", assetType: "forex" },
  ];

  const POPULAR_COMMODITIES: AssetResult[] = [
    { symbol: "GOLD", name: "Gold",     priceKey: "xauusd", assetType: "commodity" },
    { symbol: "SILVER", name: "Silver", priceKey: "xagusd", assetType: "commodity" },
    { symbol: "OIL",  name: "Crude Oil", priceKey: "cl.f",  assetType: "commodity" },
    { symbol: "GAS",  name: "Natural Gas", priceKey: "ng.f", assetType: "commodity" },
  ];

  const fetchPrice = useCallback(async (asset: AssetResult) => {
    setPriceLoading(true);
    setCurrentPrice(null);
    try {
      const param =
        asset.assetType === "crypto"
          ? `?crypto=${encodeURIComponent(asset.priceKey)}`
          : `?stooq=${encodeURIComponent(asset.priceKey)}`;
      const res = await fetch(`/api/market/prices${param}`);
      const data = await res.json();
      // API now returns array of { id, symbol, name, price, ... } — match by id
      const list: { id: string; price: number }[] = Array.isArray(data) ? data : [];
      const entry = list.find((e) => e.id === asset.priceKey) ?? list[0];
      if (entry?.price) setCurrentPrice(entry.price);
    } catch {
      // ignore
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) fetchPrice(selected);
  }, [selected, fetchPrice]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
      // API returns array directly, not { results: [...] }
      const data: SearchAPIResult[] = await res.json();
      const list = Array.isArray(data) ? data : [];
      const mapped: AssetResult[] = list.slice(0, 10).map((r) => {
        if (r.source === "crypto") {
          return {
            symbol: r.symbol,
            name: r.name,
            assetType: "crypto",
            priceKey: r.cgId ?? r.id,
          };
        }
        // Yahoo result → convert to Stooq symbol
        const stooqSymbol = yahooToStooq(r.yahooSymbol ?? r.id);
        // Detect asset class from Yahoo's quoteType
        let assetType = "stock";
        if (r.type === "CURRENCY") assetType = "forex";
        else if (r.type === "FUTURE") assetType = "commodity";
        return {
          symbol: r.symbol,
          name: r.name,
          assetType,
          priceKey: stooqSymbol,
        };
      });
      setResults(mapped);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQuery = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(q), 400);
  };

  const selectAsset = (asset: AssetResult) => {
    setSelected(asset);
    setQuery(asset.name);
    setResults([]);
    setError("");
    setSuccess("");
    setQuantity("");
  };

  const total = currentPrice && quantity ? currentPrice * Number(quantity) : null;

  const executeTrade = async () => {
    if (!selected || !quantity || Number(quantity) <= 0) {
      return setError("Enter a valid quantity");
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/challenges/${challengeId}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selected.symbol,
          name: selected.name,
          assetType: selected.assetType,
          priceKey: selected.priceKey,
          side,
          quantity: Number(quantity),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade failed");
      setSuccess(`${side} ${quantity} ${selected.symbol} @ $${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      setQuantity("");
      onTraded();
      fetchPrice(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  const showCrypto = allowedAssetClasses.includes("crypto");
  const showStocks = allowedAssetClasses.includes("stocks");
  const showForex  = allowedAssetClasses.includes("forex");
  const showCommodities = allowedAssetClasses.includes("commodities");

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-semibold mb-4">Execute Trade</h3>

      {/* Quick selects */}
      {!selected && (
        <div className="mb-4 space-y-2">
          {showCrypto && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Popular Crypto</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CRYPTO.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => selectAsset(a)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    {a.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showStocks && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Popular Stocks</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_STOCKS.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => selectAsset(a)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    {a.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showForex && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Popular Forex</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_FOREX.map((a) => (
                  <button
                    key={a.priceKey}
                    onClick={() => selectAsset(a)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    {a.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showCommodities && (
            <div>
              <p className="text-xs text-white/40 mb-1.5">Popular Commodities</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_COMMODITIES.map((a) => (
                  <button
                    key={a.priceKey}
                    onClick={() => selectAsset(a)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    {a.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => selected && setSelected(null)}
          placeholder="Search assets (BTC, AAPL, ETH...)"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        />
        {searching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" />
        )}

        {results.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {results.map((r) => {
              const flag =
                r.assetType === "crypto" ? "🪙"
                : r.assetType === "commodity" ? "🛢️"
                : flagForYahoo(stooqToYahoo(r.priceKey), r.assetType.toUpperCase())
              return (
                <button
                  key={`${r.symbol}-${r.assetType}`}
                  onClick={() => selectAsset(r)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-base flex-shrink-0" aria-hidden="true">{flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{r.symbol}</span>
                    <span className="text-xs text-white/40 ml-2">{r.name}</span>
                  </div>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}
                  >
                    {r.assetType}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected asset + price */}
      {selected && (
        <>
          <div className="flex items-center justify-between mb-2 p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
            <div>
              <span className="font-semibold">{selected.symbol}</span>
              <span className="text-xs text-white/40 ml-2">{selected.name}</span>
            </div>
            <div className="text-right">
              {priceLoading ? (
                <Loader2 size={14} className="animate-spin text-white/40" />
              ) : currentPrice ? (
                <span className="font-semibold text-green-400">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}
                </span>
              ) : (
                <span className="text-white/30 text-xs">Price unavailable</span>
              )}
            </div>
          </div>

          {/* Chart / News tabs */}
          <div className="mb-4 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="flex" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setActivePanel("chart")}
                className="flex-1 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: activePanel === "chart" ? "var(--bg-base)" : "transparent",
                  color: activePanel === "chart" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                Chart
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("news")}
                className="flex-1 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: activePanel === "news" ? "var(--bg-base)" : "transparent",
                  color: activePanel === "news" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                News
              </button>
            </div>
            {activePanel === "chart" ? (
              <AssetChart
                source={selected.assetType === "crypto" ? "crypto" : "stock"}
                id={selected.priceKey}
                symbol={selected.symbol}
                onExpand={() => setChartModalOpen(true)}
              />
            ) : (
              <AssetNews q={selected.symbol} limit={6} />
            )}
          </div>

          {/* BUY / SELL toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSide("BUY")}
              className="py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: side === "BUY" ? "#16a34a" : "var(--bg-base)",
                color: side === "BUY" ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <TrendingUp size={14} /> Buy
            </button>
            <button
              onClick={() => setSide("SELL")}
              className="py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: side === "SELL" ? "#dc2626" : "var(--bg-base)",
                color: side === "SELL" ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <TrendingDown size={14} /> Sell
            </button>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="block text-xs text-white/50 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            />
          </div>

          {/* Total */}
          {total !== null && (
            <div className="flex justify-between text-sm mb-4">
              <span className="text-white/50">Estimated total</span>
              <span className="font-semibold">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          {success && <p className="text-green-400 text-xs mb-3">✓ {success}</p>}

          <button
            onClick={executeTrade}
            disabled={loading || !currentPrice}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: side === "BUY" ? "#16a34a" : "#dc2626",
              color: "#fff",
            }}
          >
            {loading ? "Processing..." : `${side} ${selected.symbol}`}
          </button>
        </>
      )}

      {chartModalOpen && selected && (
        <ChartModal
          source={selected.assetType === "crypto" ? "crypto" : "stock"}
          id={selected.priceKey}
          symbol={selected.symbol}
          name={selected.name}
          onClose={() => setChartModalOpen(false)}
        />
      )}
    </div>
  );
}
