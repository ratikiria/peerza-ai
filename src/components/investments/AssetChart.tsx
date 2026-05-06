"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Loader2, Maximize2, CandlestickChart, LineChart as LineIcon, AreaChart, RotateCcw } from "lucide-react";

interface OHLC {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

type ChartType = "line" | "candle" | "area";
type Indicator = "sma20" | "sma50" | "ema12" | "vol";

interface Props {
  source: "crypto" | "stock";
  id: string;
  symbol: string;
  height?: number;
  onExpand?: () => void;
}

const RANGES: { label: string; days: number }[] = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

const INDICATOR_META: Record<Indicator, { label: string; color: string }> = {
  sma20: { label: "SMA 20", color: "#fbbf24" },
  sma50: { label: "SMA 50", color: "#a855f7" },
  ema12: { label: "EMA 12", color: "#3b82f6" },
  vol:   { label: "Vol",    color: "#64748b" },
};

// ─── Indicator math ────────────────────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    return sum / period;
  });
}

function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += values[j];
      prev = sum / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AssetChart({ source, id, symbol, height = 200, onExpand }: Props) {
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set());
  const [points, setPoints] = useState<OHLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  // Visible window into `points`. -1 means "show everything from this end".
  // Reset whenever the data changes (range button click, asset change).
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd]     = useState(-1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startClientX: number; startStart: number; startEnd: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/market/chart?source=${source}&id=${encodeURIComponent(id)}&days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) { setError(data.error); setPoints([]); }
        else setPoints(data.points ?? []);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, id, days]);

  // Reset the visible window whenever new data arrives so the user always
  // starts looking at the full requested range.
  useEffect(() => {
    setViewStart(0);
    setViewEnd(-1);
    setHover(null);
  }, [points]);

  const effEnd = viewEnd < 0 ? Math.max(0, points.length - 1) : viewEnd;
  const isZoomed = viewStart > 0 || (viewEnd >= 0 && viewEnd < points.length - 1);

  const visiblePoints = useMemo(
    () => points.slice(viewStart, effEnd + 1),
    [points, viewStart, effEnd]
  );

  function resetView() {
    setViewStart(0);
    setViewEnd(-1);
    setHover(null);
  }

  const hasVolData = visiblePoints.some((p) => p.v != null && p.v > 0);
  const showVol = indicators.has("vol") && hasVolData;

  const chart = useMemo(() => {
    if (visiblePoints.length < 2) return null;
    const w = 600;
    const h = height;
    const pad = { l: 6, r: 6, t: 8, b: 8 };
    const volH = showVol ? Math.round(h * 0.22) : 0;
    const gap = showVol ? 8 : 0;
    const priceTop = pad.t;
    const priceBot = h - pad.b - volH - gap;
    const volTop = priceBot + gap;
    const volBot = h - pad.b;

    const closes = visiblePoints.map((p) => p.c);
    const lows = visiblePoints.map((p) => p.l);
    const highs = visiblePoints.map((p) => p.h);
    const vols = visiblePoints.map((p) => p.v ?? 0);

    const yMin = Math.min(...lows);
    const yMax = Math.max(...highs);
    const yPad = (yMax - yMin) * 0.05 || yMax * 0.01 || 1;

    const xScale = (i: number) =>
      pad.l + (i / (visiblePoints.length - 1 || 1)) * (w - pad.l - pad.r);
    const yScale = (p: number) =>
      priceBot - ((p - (yMin - yPad)) / (yMax + yPad - (yMin - yPad))) * (priceBot - priceTop);

    // candle width (70% of slot)
    const slot = (w - pad.l - pad.r) / visiblePoints.length;
    const candleW = Math.max(1.2, slot * 0.7);

    // line/area path on closes
    const linePath = visiblePoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(2)} ${yScale(pt.c).toFixed(2)}`).join(" ");
    const areaPath =
      `M ${xScale(0).toFixed(2)} ${priceBot.toFixed(2)} ` +
      visiblePoints.map((pt, i) => `L ${xScale(i).toFixed(2)} ${yScale(pt.c).toFixed(2)}`).join(" ") +
      ` L ${xScale(visiblePoints.length - 1).toFixed(2)} ${priceBot.toFixed(2)} Z`;

    // indicator series
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const ema12 = ema(closes, 12);
    const seriesPath = (series: (number | null)[]) => {
      let path = "";
      let lastNull = true;
      series.forEach((v, i) => {
        if (v == null) { lastNull = true; return; }
        path += `${lastNull ? "M" : "L"} ${xScale(i).toFixed(2)} ${yScale(v).toFixed(2)} `;
        lastNull = false;
      });
      return path.trim();
    };

    // volume bars
    const vMax = Math.max(...vols, 1);
    const volScale = (v: number) => volBot - (v / vMax) * (volBot - volTop);

    return {
      w, h, pad, priceTop, priceBot, volTop, volBot,
      xScale, yScale, candleW,
      linePath, areaPath,
      sma20Path: seriesPath(sma20),
      sma50Path: seriesPath(sma50),
      ema12Path: seriesPath(ema12),
      volScale,
    };
  }, [visiblePoints, height, showVol]);

  const first = visiblePoints[0]?.c ?? 0;
  const last = visiblePoints[visiblePoints.length - 1]?.c ?? 0;
  const change = last - first;
  const changePct = first > 0 ? (change / first) * 100 : 0;
  const isUp = change >= 0;
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    // While dragging, suppress the hover crosshair and instead pan the window.
    if (dragRef.current && svgRef.current && points.length > 1) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startClientX;
      const startSize = dragRef.current.startEnd - dragRef.current.startStart;
      // Convert pixel delta to "points" delta so 1px == 1px regardless of window size
      const ptsPerPx = (startSize + 1) / rect.width;
      const deltaPts = Math.round(-dx * ptsPerPx);
      let newStart = dragRef.current.startStart + deltaPts;
      let newEnd = dragRef.current.startEnd + deltaPts;
      // Clamp into [0, points.length-1] preserving window size
      if (newStart < 0) { newEnd -= newStart; newStart = 0; }
      if (newEnd > points.length - 1) {
        const over = newEnd - (points.length - 1);
        newEnd -= over;
        newStart -= over;
        if (newStart < 0) newStart = 0;
      }
      setViewStart(newStart);
      setViewEnd(newEnd);
      return;
    }

    if (!chart || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * chart.w;
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < visiblePoints.length; i++) {
      const dist = Math.abs(chart.xScale(i) - xRel);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }
    setHover({ idx: nearest, x: chart.xScale(nearest), y: chart.yScale(visiblePoints[nearest].c) });
  }

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    // Only left button. Right/middle reserved for browser/UA defaults.
    if (e.button !== 0 || points.length < 2) return;

    // If we're at full range there's nothing to pan to. Auto-narrow the window
    // to 70% of the data on the first drag so the user immediately sees
    // movement, then pan from there. Keeps drag-to-pan working from any state.
    let startStart = viewStart;
    let startEnd = effEnd;
    const fullSize = points.length - 1;
    if (startEnd - startStart >= fullSize) {
      const newSize = Math.max(5, Math.round(fullSize * 0.7));
      // Center the new window around the right edge so most-recent stays visible
      startEnd = fullSize;
      startStart = Math.max(0, fullSize - newSize);
      setViewStart(startStart);
      setViewEnd(startEnd);
    }

    dragRef.current = {
      startClientX: e.clientX,
      startStart,
      startEnd,
    };
    setHover(null);
  }
  function endDrag() { dragRef.current = null; }

  // Wheel zoom — bound via native listener so we can preventDefault
  // (React's onWheel is passive and can't stop page scroll).
  const onWheelNative = useCallback((e: WheelEvent) => {
    if (points.length < 2 || !svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const xRel = (e.clientX - rect.left) / rect.width;
    const curStart = viewStart;
    const curEnd = viewEnd < 0 ? points.length - 1 : viewEnd;
    const curSize = curEnd - curStart;
    if (curSize < 1) return;
    const cursorIdx = curStart + xRel * curSize;
    // 0.85 = zoom in, 1.18 = zoom out (gentler than 0.8/1.25 for finer control)
    const factor = e.deltaY < 0 ? 0.85 : 1.18;
    const minSize = 5;
    const maxSize = points.length - 1;
    let newSize = Math.round(curSize * factor);
    newSize = Math.max(minSize, Math.min(maxSize, newSize));
    if (newSize === curSize) return;
    const leftPortion = curSize > 0 ? (cursorIdx - curStart) / curSize : 0.5;
    let newStart = Math.round(cursorIdx - leftPortion * newSize);
    let newEnd = newStart + newSize;
    if (newStart < 0) { newEnd -= newStart; newStart = 0; }
    if (newEnd > points.length - 1) {
      const over = newEnd - (points.length - 1);
      newEnd -= over;
      newStart = Math.max(0, newStart - over);
    }
    setViewStart(newStart);
    setViewEnd(newEnd === points.length - 1 ? -1 : newEnd);
  }, [points.length, viewStart, viewEnd]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [onWheelNative]);

  const toggleInd = (k: Indicator) => {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const hoveredPt = hover ? visiblePoints[hover.idx] : null;
  const fmtPrice = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 });
  const fmtVol = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
  };

  return (
    <div className="rounded-lg" style={{ background: "var(--bg-base)" }}>
      {/* Header — symbol + price + change */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="min-w-0">
          <div className="text-xs text-white/40 truncate">{symbol} · {RANGES.find(r => r.days === days)?.label} chart</div>
          {points.length >= 2 && (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-semibold">
                ${fmtPrice(hoveredPt?.c ?? last)}
              </span>
              <span className="text-xs font-medium" style={{ color: isUp ? "#4ade80" : "#f87171" }}>
                {isUp ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isZoomed && (
            <button
              type="button"
              onClick={resetView}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}
              title="Reset pan/zoom"
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
              style={{
                background: days === r.days ? "var(--accent)" : "transparent",
                color: days === r.days ? "#fff" : "var(--text-secondary)",
              }}
            >
              {r.label}
            </button>
          ))}
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 ml-1 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title="Expand chart"
              type="button"
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar — chart type + indicators */}
      <div className="px-3 mt-2 flex items-center gap-2 flex-wrap">
        <div className="flex p-0.5 rounded" style={{ background: "var(--bg-card)" }}>
          {([
            { type: "line" as ChartType, Icon: LineIcon },
            { type: "candle" as ChartType, Icon: CandlestickChart },
            { type: "area" as ChartType, Icon: AreaChart },
          ]).map(({ type, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setChartType(type)}
              className="px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 capitalize transition-colors"
              style={{
                background: chartType === type ? "var(--accent)" : "transparent",
                color: chartType === type ? "#fff" : "var(--text-secondary)",
              }}
              title={type}
            >
              <Icon size={11} />
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {(["sma20", "sma50", "ema12", "vol"] as Indicator[]).map((k) => {
            const meta = INDICATOR_META[k];
            const active = indicators.has(k);
            const isVol = k === "vol";
            const disabled = isVol && !hasVolData;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => toggleInd(k)}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: active ? `${meta.color}25` : "var(--bg-card)",
                  color: active ? meta.color : "var(--text-secondary)",
                  border: `1px solid ${active ? meta.color : "var(--border)"}`,
                }}
                title={disabled ? "Volume not available" : meta.label}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 py-2 relative" style={{ minHeight: height }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 size={16} className="animate-spin text-white/30" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center text-xs text-white/40" style={{ height }}>{error}</div>
        ) : !chart ? (
          <div className="flex items-center justify-center text-xs text-white/40" style={{ height }}>No chart data</div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chart.w} ${chart.h}`}
            preserveAspectRatio="none"
            className="w-full select-none"
            style={{
              height,
              display: "block",
              cursor: dragRef.current ? "grabbing" : "grab",
              touchAction: "none",
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { setHover(null); endDrag(); }}
            onMouseDown={onMouseDown}
            onMouseUp={endDrag}
          >
            <defs>
              <linearGradient id={`area-${source}-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Volume sub-pane (rendered first so price overlays it) */}
            {showVol && visiblePoints.map((pt, i) => {
              const v = pt.v ?? 0;
              if (v <= 0) return null;
              const x = chart.xScale(i) - chart.candleW / 2;
              const y = chart.volScale(v);
              const barH = chart.volBot - y;
              const up = pt.c >= pt.o;
              return (
                <rect
                  key={`v-${i}`}
                  x={x}
                  y={y}
                  width={chart.candleW}
                  height={Math.max(0.5, barH)}
                  fill={up ? "#22c55e" : "#ef4444"}
                  opacity="0.5"
                />
              );
            })}

            {/* Price chart */}
            {chartType === "area" && <path d={chart.areaPath} fill={`url(#area-${source}-${id})`} />}
            {chartType !== "candle" && (
              <path d={chart.linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Candles */}
            {chartType === "candle" && visiblePoints.map((pt, i) => {
              const x = chart.xScale(i);
              const up = pt.c >= pt.o;
              const fill = up ? "#22c55e" : "#ef4444";
              const bodyTop = chart.yScale(Math.max(pt.o, pt.c));
              const bodyBot = chart.yScale(Math.min(pt.o, pt.c));
              const wickTop = chart.yScale(pt.h);
              const wickBot = chart.yScale(pt.l);
              const bodyH = Math.max(0.5, bodyBot - bodyTop);
              return (
                <g key={`k-${i}`}>
                  <line x1={x} x2={x} y1={wickTop} y2={wickBot} stroke={fill} strokeWidth="1" />
                  <rect x={x - chart.candleW / 2} y={bodyTop} width={chart.candleW} height={bodyH} fill={fill} />
                </g>
              );
            })}

            {/* Indicator overlays */}
            {indicators.has("sma20") && (
              <path d={chart.sma20Path} fill="none" stroke={INDICATOR_META.sma20.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {indicators.has("sma50") && (
              <path d={chart.sma50Path} fill="none" stroke={INDICATOR_META.sma50.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {indicators.has("ema12") && (
              <path d={chart.ema12Path} fill="none" stroke={INDICATOR_META.ema12.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
            )}

            {/* Volume sub-pane separator */}
            {showVol && (
              <line
                x1={chart.pad.l} x2={chart.w - chart.pad.r}
                y1={chart.priceBot + 4} y2={chart.priceBot + 4}
                stroke="var(--border)" strokeWidth="1"
              />
            )}

            {/* Hover crosshair */}
            {hover && (
              <>
                <line
                  x1={hover.x} x2={hover.x}
                  y1={chart.priceTop} y2={showVol ? chart.volBot : chart.priceBot}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="2 2"
                />
                {chartType !== "candle" && (
                  <circle cx={hover.x} cy={hover.y} r="3" fill={lineColor} stroke="#0f1117" strokeWidth="1.5" />
                )}
              </>
            )}
          </svg>
        )}

        {/* Hover OHLC tooltip */}
        {hover && hoveredPt && chart && (
          <div
            className="absolute pointer-events-none px-2 py-1.5 rounded text-[10px] leading-tight"
            style={{
              left: `${(hover.x / chart.w) * 100}%`,
              top: 4,
              transform: hover.x > chart.w * 0.6 ? "translateX(-100%)" : "translateX(0)",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              minWidth: 130,
            }}
          >
            <div className="font-semibold mb-0.5">
              {new Date(hoveredPt.t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0">
              <span className="text-white/40">O</span><span className="text-right">${fmtPrice(hoveredPt.o)}</span>
              <span className="text-white/40">H</span><span className="text-right">${fmtPrice(hoveredPt.h)}</span>
              <span className="text-white/40">L</span><span className="text-right">${fmtPrice(hoveredPt.l)}</span>
              <span className="text-white/40">C</span><span className="text-right" style={{ color: hoveredPt.c >= hoveredPt.o ? "#4ade80" : "#f87171" }}>${fmtPrice(hoveredPt.c)}</span>
              {hoveredPt.v != null && (<>
                <span className="text-white/40">Vol</span><span className="text-right">{fmtVol(hoveredPt.v)}</span>
              </>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
