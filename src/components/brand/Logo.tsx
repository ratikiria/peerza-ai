import type { CSSProperties } from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSuffix?: boolean;
  tagline?: boolean;
  style?: CSSProperties;
}

const sizeClass = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

const taglineSize = {
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-xs",
  xl: "text-sm",
};

export const TAGLINE = "The AI community for Finance & Investing";

export default function Logo({
  size = "lg",
  className = "",
  showSuffix = true,
  tagline = false,
  style,
}: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${className}`} style={style}>
      <span
        className={`inline-flex items-center font-bold tracking-tight ${sizeClass[size]}`}
        style={{ color: "var(--text-primary)", lineHeight: 1 }}
      >
        <PeerzaP />
        <span>eerza</span>
        {showSuffix && (
          <span style={{ color: "var(--text-secondary)", marginLeft: "0.05em" }}>.ai</span>
        )}
      </span>
      {tagline && (
        <span
          className={`${taglineSize[size]} mt-1 font-medium tracking-wide`}
          style={{ color: "var(--text-secondary)" }}
        >
          {TAGLINE}
        </span>
      )}
    </span>
  );
}

function PeerzaP() {
  return (
    <svg
      viewBox="0 0 22 36"
      width="0.85em"
      height="1.25em"
      style={{
        display: "inline-block",
        marginRight: "0.06em",
        verticalAlign: "-0.18em",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pz-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pz-stem" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9668" />
        </linearGradient>
      </defs>

      {/* Flame trail centered under the rocket stem (stem spans x=2..8, center x=5) */}
      <path d="M2 30 L5 36 L8 30 L6 32 L5 30 L4 32 Z" fill="url(#pz-flame)" />

      {/* Emerald bowl disk — forms the round P bowl, fused with stem on its left side */}
      <circle cx="10" cy="10" r="7.5" fill="url(#pz-stem)" />

      {/* Clean full circle ("O") inside the bowl — no craters, no halo */}
      <circle cx="12.7" cy="10" r="4.7" fill="#fbbf24" />

      {/* Rocket stem (drawn ON TOP so it fuses with bowl on the left side) */}
      <rect x="2" y="3" width="6" height="27" rx="0.9" fill="url(#pz-stem)" />
      {/* Nose cone */}
      <path d="M2 3 L8 3 L5 -0.5 Z" fill="#10b981" />
      {/* Right fin (lower stem only — below the bowl) */}
      <path d="M8 22 L11 28 L8 26 Z" fill="#047857" />
      {/* Porthole on the lower stem */}
      <circle cx="5" cy="20" r="1.7" fill="#0f1117" />
      <circle cx="5" cy="20" r="1.05" fill="#34d399" />
      <circle cx="4.55" cy="19.55" r="0.45" fill="rgba(255,255,255,0.75)" />
    </svg>
  );
}

/**
 * Square brand mark (favicon, navbar, auth panels).
 * Uses the same rocket-stem + moon-bowl P composition, centered on an emerald gradient tile.
 */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl shadow-lg shadow-emerald-500/30 ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
      }}
    >
      <svg
        viewBox="0 0 22 36"
        width={size * 0.72}
        height={size * 1.05}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="pz-mark-flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Flame — centered under the rocket stem */}
        <path d="M2 30 L5 36 L8 30 L6 32 L5 30 L4 32 Z" fill="url(#pz-mark-flame)" />

        {/* Bowl (white — fuses with stem) */}
        <circle cx="10" cy="10" r="7.5" fill="#ffffff" />

        {/* Clean full circle ("O") inside the bowl */}
        <circle cx="12.7" cy="10" r="4.5" fill="#fbbf24" />

        {/* Stem (white) */}
        <rect x="2" y="3" width="6" height="27" rx="0.9" fill="#ffffff" />
        <path d="M2 3 L8 3 L5 -0.5 Z" fill="#ffffff" />
        <path d="M8 22 L11 28 L8 26 Z" fill="rgba(255,255,255,0.75)" />
        {/* Porthole */}
        <circle cx="5" cy="20" r="1.6" fill="#047857" />
        <circle cx="5" cy="20" r="0.95" fill="#34d399" />
        <circle cx="4.55" cy="19.55" r="0.4" fill="rgba(255,255,255,0.85)" />
      </svg>
    </div>
  );
}
