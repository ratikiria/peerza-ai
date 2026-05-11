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
        <linearGradient id="pz-static-stem" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="55%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="pz-static-stem-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="pz-static-flame-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#fb923c" stopOpacity="0.95" />
          <stop offset="75%" stopColor="#ea580c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pz-static-flame-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="pz-static-flame-core" cx="0.5" cy="0.15" r="0.5">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Moon (bowl) — gradient with craters and highlight */}
      <circle cx="10" cy="10" r="7.5" fill="url(#pz-static-stem)" />
      <circle cx="12.7" cy="10" r="4.7" fill="#fbbf24" />
      <circle cx="14.3" cy="8.3"  r="0.55" fill="rgba(180,83,9,0.3)" />
      <circle cx="11.8" cy="11.6" r="0.4"  fill="rgba(180,83,9,0.24)" />
      <circle cx="14.0" cy="11.2" r="0.32" fill="rgba(180,83,9,0.2)" />
      <circle cx="11.7" cy="9" r="1.4" fill="rgba(255,255,255,0.38)" />

      {/* Layered flame */}
      <path
        d="M2.0 29.8 Q1.6 33.5 5 37.2 Q8.4 33.5 8.0 29.8 Q7 31 6 30.2 Q5 31.5 4 30.2 Q3 31 2.0 29.8 Z"
        fill="url(#pz-static-flame-outer)"
      />
      <path
        d="M2.9 29.9 Q2.7 32.5 5 35.6 Q7.3 32.5 7.1 29.9 Q6.4 30.7 5.7 30.1 Q5 31 4.3 30.1 Q3.6 30.7 2.9 29.9 Z"
        fill="url(#pz-static-flame-mid)"
      />
      <ellipse cx="5" cy="31" rx="1.1" ry="2.4" fill="url(#pz-static-flame-core)" />

      {/* Rocket stem with highlight strip */}
      <rect x="2" y="3" width="6" height="27" rx="1" fill="url(#pz-static-stem)" />
      <rect x="2.4" y="3.4" width="1.2" height="26.2" rx="0.6" fill="url(#pz-static-stem-light)" />
      <path d="M2 3 L8 3 L5 -1.2 Z" fill="#10b981" />

      {/* Two fins */}
      <path d="M8 22 L11 28.6 L8 26 Z" fill="#047857" />
      <path d="M2 22 L-1 28.6 L2 26 Z" fill="#047857" />

      {/* Porthole — layered */}
      <circle cx="5" cy="20" r="1.7" fill="#0f1117" />
      <circle cx="5" cy="20" r="1.05" fill="#34d399" />
      <circle cx="4.55" cy="19.55" r="0.45" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

/**
 * Square brand mark (favicon, navbar, auth panels).
 * White rocket on emerald-gradient rounded tile — matches the PWA icon.
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
          <linearGradient id="pz-mark-flame-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#fb923c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pz-mark-flame-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Moon (bowl) — white with subtle crater shading */}
        <circle cx="10" cy="10" r="7.5" fill="#ffffff" />
        <circle cx="12.7" cy="10" r="4.5" fill="#fbbf24" />
        <circle cx="14.3" cy="8.3"  r="0.5"  fill="rgba(180,83,9,0.32)" />
        <circle cx="11.8" cy="11.6" r="0.36" fill="rgba(180,83,9,0.26)" />
        <circle cx="11.7" cy="9" r="1.3" fill="rgba(255,255,255,0.5)" />

        {/* Layered flame */}
        <path
          d="M2.0 29.8 Q1.6 33.2 5 36.6 Q8.4 33.2 8.0 29.8 Q7 31 6 30.2 Q5 31.5 4 30.2 Q3 31 2.0 29.8 Z"
          fill="url(#pz-mark-flame-outer)"
        />
        <ellipse cx="5" cy="31" rx="1" ry="2" fill="url(#pz-mark-flame-mid)" />

        {/* Stem (white) */}
        <rect x="2" y="3" width="6" height="27" rx="1" fill="#ffffff" />
        <path d="M2 3 L8 3 L5 -1.2 Z" fill="#ffffff" />

        {/* Two fins */}
        <path d="M8 22 L11 28.6 L8 26 Z" fill="rgba(255,255,255,0.78)" />
        <path d="M2 22 L-1 28.6 L2 26 Z" fill="rgba(255,255,255,0.78)" />

        {/* Porthole */}
        <circle cx="5" cy="20" r="1.6" fill="#047857" />
        <circle cx="5" cy="20" r="0.95" fill="#34d399" />
        <circle cx="4.55" cy="19.55" r="0.4" fill="rgba(255,255,255,0.85)" />
      </svg>
    </div>
  );
}
