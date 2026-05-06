"use client";

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";

interface LogoAnimatedProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  showSuffix?: boolean;
  /** When true, the full landing animation replays automatically on an interval. */
  loop?: boolean;
  /** Interval between auto-replays in ms. Default 7000. */
  loopInterval?: number;
  style?: CSSProperties;
}

export default function LogoAnimated({
  size = 140,
  className = "",
  showWordmark = true,
  showSuffix = true,
  loop = false,
  loopInterval = 7000,
  style,
}: LogoAnimatedProps) {
  const [replayKey, setReplayKey] = useState(0);
  const replay = () => setReplayKey((k) => k + 1);

  useEffect(() => {
    if (!loop) return;
    const id = window.setInterval(replay, loopInterval);
    return () => window.clearInterval(id);
  }, [loop, loopInterval]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      replay();
    }
  };

  const markH = size;
  const markW = size * (17.5 / 38);
  const wordSize = size * 0.5;

  return (
    <div
      className={`inline-flex items-end select-none ${className}`}
      onMouseEnter={replay}
      onClick={replay}
      onKeyDown={onKey}
      tabIndex={0}
      role="img"
      aria-label="Peerza.ai"
      style={{
        cursor: "pointer",
        lineHeight: 1,
        outline: "none",
        ["--pza-drop" as string]: `${size * 0.4}px`,
        ["--pza-rise" as string]: `${size * 0.24}px`,
        ...style,
      } as CSSProperties}
    >
      <svg
        key={`mark-${replayKey}`}
        viewBox="0 0 17.5 38"
        width={markW}
        height={markH}
        aria-hidden="true"
        style={{
          overflow: "visible",
          display: "block",
          flexShrink: 0,
          marginBottom: -size * 0.09,
        }}
      >
        <defs>
          {/* Layered flame gradients */}
          <linearGradient id="pza-flame-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="35%"  stopColor="#fb923c" stopOpacity="0.95" />
            <stop offset="75%"  stopColor="#ea580c" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pza-flame-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" />
            <stop offset="40%"  stopColor="#fde047" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="pza-flame-core" cx="0.5" cy="0.15" r="0.5">
            <stop offset="0%"   stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pza-stem" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0%"   stopColor="#34d399" />
            <stop offset="55%"  stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="pza-stem-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <radialGradient id="pza-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="rgba(52,211,153,0.55)" />
            <stop offset="55%"  stopColor="rgba(52,211,153,0.12)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
        </defs>

        {/* Glow ring — pulses on impact */}
        <circle cx="10" cy="10" r="13" fill="url(#pza-glow)" className="pza-glow" />

        {/* Landing pad — thin guide line */}
        <line
          x1="0" y1="30.4" x2="13" y2="30.4"
          stroke="rgba(52,211,153,0.4)"
          strokeWidth="0.3"
          strokeLinecap="round"
          className="pza-pad"
        />

        {/* Moon (bowl) — rises from below */}
        <g className="pza-moon">
          <circle cx="10" cy="10" r="7.5" fill="url(#pza-stem)" />
          <circle cx="12.7" cy="10" r="4.7" fill="#fbbf24" />
          {/* Craters */}
          <circle cx="14.3" cy="8.3"  r="0.55" fill="rgba(180,83,9,0.3)" />
          <circle cx="11.8" cy="11.6" r="0.4"  fill="rgba(180,83,9,0.24)" />
          <circle cx="14.0" cy="11.2" r="0.32" fill="rgba(180,83,9,0.2)" />
          {/* Highlight */}
          <circle cx="11.7" cy="9" r="1.4" fill="rgba(255,255,255,0.38)" />
        </g>

        {/* Rocket */}
        <g className="pza-rocket">
          {/* Flame stack: drop-shaped, three layers, with continuous flicker */}
          <g className="pza-flame-shell">
            <g className="pza-flame-flicker">
              {/* Outer plume */}
              <path
                d="M2.0 29.8 Q1.6 33.5 5 37.2 Q8.4 33.5 8.0 29.8 Q7 31 6 30.2 Q5 31.5 4 30.2 Q3 31 2.0 29.8 Z"
                fill="url(#pza-flame-outer)"
              />
              {/* Mid yellow */}
              <path
                d="M2.9 29.9 Q2.7 32.5 5 35.6 Q7.3 32.5 7.1 29.9 Q6.4 30.7 5.7 30.1 Q5 31 4.3 30.1 Q3.6 30.7 2.9 29.9 Z"
                fill="url(#pza-flame-mid)"
              />
              {/* White-hot core */}
              <ellipse cx="5" cy="31" rx="1.1" ry="2.4" fill="url(#pza-flame-core)" />
            </g>
          </g>
          {/* Stem body */}
          <rect x="2" y="3" width="6" height="27" rx="1" fill="url(#pza-stem)" />
          {/* Highlight strip */}
          <rect x="2.4" y="3.4" width="1.2" height="26.2" rx="0.6" fill="url(#pza-stem-light)" />
          {/* Nosecone */}
          <path d="M2 3 L8 3 L5 -1.2 Z" fill="#10b981" />
          {/* Fins */}
          <path d="M8 22 L11 28.6 L8 26 Z" fill="#047857" />
          <path d="M2 22 L-1 28.6 L2 26 Z" fill="#047857" />
          {/* Porthole */}
          <circle cx="5" cy="20" r="1.7" fill="#0f1117" />
          <circle cx="5" cy="20" r="1.05" fill="#34d399" />
          <circle cx="4.55" cy="19.55" r="0.45" fill="rgba(255,255,255,0.85)" />
        </g>
      </svg>

      {showWordmark && (
        <span
          key={`word-${replayKey}`}
          className="font-bold tracking-tight"
          style={{
            color: "var(--text-primary)",
            fontSize: wordSize,
            lineHeight: 1,
            marginLeft: -size * 0.05,
            display: "inline-flex",
            alignItems: "baseline",
          }}
        >
          {WORDMARK.map((c, i) => (
            <span
              key={i}
              className="pza-letter"
              style={{ animationDelay: `${1.05 + i * 0.045}s`, display: "inline-block" }}
            >
              {c}
            </span>
          ))}
          {showSuffix && (
            <span
              className="pza-letter"
              style={{
                color: "var(--text-secondary)",
                marginLeft: "0.05em",
                animationDelay: `${1.05 + WORDMARK.length * 0.045}s`,
                display: "inline-block",
              }}
            >
              .ai
            </span>
          )}
        </span>
      )}
    </div>
  );
}

const WORDMARK = ["e", "e", "r", "z", "a"];
