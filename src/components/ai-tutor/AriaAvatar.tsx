interface AriaAvatarProps {
  size?: number
  speaking?: boolean
}

export default function AriaAvatar({ size = 88, speaking = false }: AriaAvatarProps) {
  const height = Math.round((size * 150) / 88)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height }}>
      {/* Soft halo — pulses faster when speaking */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-all"
        style={{
          background: speaking ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.20)",
          animation: speaking ? "pz-aria-pulse 0.9s ease-in-out infinite" : undefined,
        }}
      />
      <svg viewBox="0 0 88 150" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="aria-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde6c4" />
            <stop offset="100%" stopColor="#e2b48a" />
          </linearGradient>
          <linearGradient id="aria-shirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <radialGradient id="aria-cheek" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#f4a89c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f4a89c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Orbit ring (always rotating) */}
        <g
          style={{
            transformOrigin: "44px 50px",
            animation: speaking ? "pz-orbit 3.5s linear infinite" : "pz-orbit 8s linear infinite",
          }}
        >
          <ellipse cx="44" cy="50" rx="40" ry="14" fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="0.6" strokeDasharray="2 3" />
          <circle cx="84" cy="50" r="2" fill="#818cf8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="4" cy="50" r="1.5" fill="#10b981">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        <path d="M10 150 C 10 110, 30 95, 44 95 C 58 95, 78 110, 78 150 Z" fill="url(#aria-shirt)" />
        <path d="M36 100 L44 110 L52 100" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="38" y="78" width="12" height="18" rx="2" fill="url(#aria-skin)" />
        <ellipse cx="44" cy="56" rx="20" ry="24" fill="url(#aria-skin)" />
        <path d="M24 50 C 24 36, 34 28, 44 28 C 54 28, 64 36, 64 50 C 62 44, 56 40, 44 40 C 32 40, 26 44, 24 50 Z" fill="#3f2a1d" />
        <ellipse cx="32" cy="62" rx="4" ry="3" fill="url(#aria-cheek)" />
        <ellipse cx="56" cy="62" rx="4" ry="3" fill="url(#aria-cheek)" />
        <g stroke="#0f172a" strokeWidth="1.4" fill="none">
          <circle cx="36" cy="56" r="5" fill="rgba(255,255,255,0.08)" />
          <circle cx="52" cy="56" r="5" fill="rgba(255,255,255,0.08)" />
          <line x1="41" y1="56" x2="47" y2="56" />
        </g>

        {/* Eyes — blink via animateTransform. Faster blink interval when speaking. */}
        <g>
          <circle cx="36" cy="56" r="1.4" fill="#0f172a">
            <animate
              attributeName="r"
              values="1.4;1.4;0.2;1.4;1.4"
              keyTimes="0;0.45;0.5;0.55;1"
              dur={speaking ? "2.4s" : "4.5s"}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="52" cy="56" r="1.4" fill="#0f172a">
            <animate
              attributeName="r"
              values="1.4;1.4;0.2;1.4;1.4"
              keyTimes="0;0.45;0.5;0.55;1"
              dur={speaking ? "2.4s" : "4.5s"}
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* Mouth — static smile when idle, animated open/close when speaking.
            We swap between two paths to fake a speaking motion (no real lip-sync;
            rough viseme approximation since we don't have phoneme timing). */}
        {speaking ? (
          <path
            fill="#7c3a2d"
            stroke="#7c3a2d"
            strokeWidth="0.6"
            strokeLinejoin="round"
          >
            <animate
              attributeName="d"
              values="
                M38 68 Q 44 70 50 68 Q 44 70.5 38 68 Z;
                M37 68 Q 44 74 51 68 Q 44 73 37 68 Z;
                M38 67 Q 44 69 50 67 Q 44 70 38 67 Z;
                M37 68 Q 44 75 51 68 Q 44 73.5 37 68 Z;
                M38 68 Q 44 70 50 68 Q 44 70.5 38 68 Z
              "
              keyTimes="0;0.25;0.5;0.75;1"
              dur="0.55s"
              repeatCount="indefinite"
            />
          </path>
        ) : (
          <path d="M38 68 Q 44 72 50 68" fill="none" stroke="#7c3a2d" strokeWidth="1.4" strokeLinecap="round" />
        )}

        <path d="M24 48 Q 44 30 64 48" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <rect x="22" y="52" width="5" height="9" rx="2" fill="#10b981" />
        <path d="M27 60 Q 32 64 32 70" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="32" cy="70" r="1.5" fill="#34d399" />
        <circle cx="64" cy="80" r="3.5" fill="#0f1117" />
        <circle cx="64" cy="80" r="2.5" fill="#10b981">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}
