"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Briefcase, Brain, Gamepad2, Users } from "lucide-react"
import LogoAnimated from "@/components/brand/LogoAnimated"
import CountryFlag from "@/components/layout/CountryFlag"

const HEADLINE_WORDS = [
  { word: "Connect.",  color: "text-pink-400" },
  { word: "Trade.",    color: "text-emerald-400" },
  { word: "Compete.",  color: "text-amber-400" },
  { word: "Learn.",    color: "text-indigo-400" },
  { word: "Play.",     color: "text-rose-400" },
]


interface Slide {
  id: string
  title: string
  caption: string
  pillar: string
  preview: React.ReactNode
}

export default function AuthShowcase() {
  const [wordIdx, setWordIdx] = useState(0)
  const [slideIdx, setSlideIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  // Cycle headline words
  useEffect(() => {
    const id = setInterval(() => {
      setWordIdx((i) => (i + 1) % HEADLINE_WORDS.length)
    }, 1400)
    return () => clearInterval(id)
  }, [])

  // Cycle slides
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % SLIDES.length)
    }, 4500)
    return () => clearInterval(id)
  }, [paused])

  const slide = SLIDES[slideIdx]
  const word = HEADLINE_WORDS[wordIdx]

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Main */}
      <div className="relative flex-1 flex flex-col justify-between p-8 gap-5">
        {/* Logo + your country flag */}
        <div className="flex items-center justify-between gap-3">
          <LogoAnimated size={44} loop loopInterval={9000} />
          <CountryFlag />
        </div>

        {/* Center — emotional positioning + cycling headline + carousel */}
        <div className="flex flex-col gap-5">
          {/* The big emotional positioning line */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              World's first
            </span>
            <h1 className="text-[1.85rem] sm:text-[2.1rem] font-black leading-[1.05] tracking-tight text-gray-50">
              The first <span className="text-emerald-400">financial</span><br />
              social media platform.
            </h1>
          </div>

          <div className="flex items-baseline gap-3">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gray-500">
              A place to
            </p>
            <h2 className="text-3xl font-black leading-none tracking-tight">
              <span
                key={word.word}
                className={`inline-block ${word.color} animate-[pz-word_1400ms_ease-in-out_forwards]`}
              >
                {word.word}
              </span>
            </h2>
          </div>

          {/* Carousel preview */}
          <div
            className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/80 to-black/60 border border-white/10 backdrop-blur-md"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-black/40">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
                {slide.pillar}
              </span>
              <span className="ml-auto flex gap-1.5">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slideIdx ? "w-6 bg-emerald-400" : "w-1.5 bg-gray-600 hover:bg-gray-500"
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </span>
            </div>
            <div key={slide.id} className="p-5 animate-[pz-fade-in_500ms_ease-out_forwards]">
              <div className="mb-3 h-10">
                <p className="text-sm font-bold text-gray-50 leading-tight">{slide.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight line-clamp-1">
                  {slide.caption}
                </p>
              </div>
              <div className="rounded-lg bg-black/40 border border-white/5 p-3 h-[200px] flex items-start overflow-hidden">
                <div className="w-full">{slide.preview}</div>
              </div>
            </div>
          </div>

          {/* Pillar pills */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { Icon: Users,      label: "Connect",  color: "text-pink-400" },
              { Icon: TrendingUp, label: "Trade",    color: "text-emerald-400" },
              { Icon: Briefcase,  label: "Compete",  color: "text-amber-400" },
              { Icon: Brain,      label: "Learn",    color: "text-indigo-400" },
              { Icon: Gamepad2,   label: "Play",     color: "text-rose-400" },
            ].map(({ Icon, label, color }) => (
              <div
                key={label}
                className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 flex items-center gap-1.5 backdrop-blur-sm"
              >
                <Icon size={13} className={color} />
                <span className="text-[11px] font-semibold text-gray-200">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>© 2026 Peerza.ai</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · Markets open
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pz-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.1); }
        }
        @keyframes pz-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.08); }
        }
        @keyframes pz-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -25px) scale(0.92); }
        }
        @keyframes pz-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes pz-rocket-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes pz-word {
          0%   { opacity: 0; transform: translateY(12px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes pz-fade-in {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pz-chart-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pz-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Slide previews
// ────────────────────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    id: "social",
    pillar: "💬 Social Feed",
    title: "Share trades. Talk shop. Make friends.",
    caption: "Voice DMs, audio calls, and a feed where ideas turn into outcomes.",
    preview: <SocialPreview />,
  },
  {
    id: "guess",
    pillar: "🎯 Guess the Direction",
    title: "Read the moment. Call the move.",
    caption: '"Russia invades Ukraine — what happens to oil?"',
    preview: <GuessChartPreview />,
  },
  {
    id: "build",
    pillar: "💼 Build the Portfolio",
    title: "Allocate. Diversify. Outperform 60/40.",
    caption: "Spread $10k across 5 asset classes before each macro shock.",
    preview: <PortfolioPreview />,
  },
  {
    id: "challenges",
    pillar: "🏆 Investment Challenges",
    title: "Compete with friends. Live leaderboard.",
    caption: "Real prices. Simulated capital. Real bragging rights.",
    preview: <LeaderboardPreview />,
  },
  {
    id: "ai",
    pillar: "🎓 AI Tutor",
    title: "Learn the markets in plain language.",
    caption: 'Premium memory: "Pick up where we left off last time."',
    preview: <AIChatPreview />,
  },
]

function GuessChartPreview() {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-auto">
      <defs>
        <linearGradient id="gd-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M5 80 L25 76 L45 78 L65 70 L85 72 L100 65 L115 70 L130 60 L150 50"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.6"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "pz-chart-draw 1500ms ease-out forwards",
        }}
      />
      <line x1="150" y1="10" x2="150" y2="110" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <text x="150" y="8" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fbbf24">EVENT</text>
      <path
        d="M150 50 L170 38 L190 30 L215 22 L240 18 L270 12"
        fill="none"
        stroke="#10b981"
        strokeWidth="2.2"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "pz-chart-draw 1800ms ease-out 800ms forwards",
          filter: "drop-shadow(0 0 4px rgba(16,185,129,0.6))",
        }}
      />
      <path
        d="M150 50 L170 38 L190 30 L215 22 L240 18 L270 12 L270 110 L150 110 Z"
        fill="url(#gd-grad)"
        opacity="0.8"
      />
      <circle cx="150" cy="50" r="3" fill="#fbbf24">
        <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="270" cy="12" r="3.5" fill="#10b981" />
      <text x="262" y="10" textAnchor="end" fontSize="8" fontWeight="bold" fill="#10b981">+36%</text>
    </svg>
  )
}

function PortfolioPreview() {
  const segs = [
    { label: "Stocks", pct: 30, color: "#10b981" },
    { label: "Bonds",  pct: 25, color: "#3b82f6" },
    { label: "Gold",   pct: 20, color: "#fbbf24" },
    { label: "Oil",    pct: 15, color: "#a855f7" },
    { label: "Cash",   pct: 10, color: "#9ca3af" },
  ]
  let cum = 0
  const segments = segs.map((s) => {
    const start = cum
    cum += s.pct
    return { ...s, start, end: cum }
  })
  const r = 38, cx = 50, cy = 50
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        {segments.map((s, i) => {
          const startAngle = (s.start / 100) * 360 - 90
          const endAngle = (s.end / 100) * 360 - 90
          const sx = cx + r * Math.cos((startAngle * Math.PI) / 180)
          const sy = cy + r * Math.sin((startAngle * Math.PI) / 180)
          const ex = cx + r * Math.cos((endAngle * Math.PI) / 180)
          const ey = cy + r * Math.sin((endAngle * Math.PI) / 180)
          const large = s.pct > 50 ? 1 : 0
          return (
            <path
              key={i}
              d={`M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`}
              fill={s.color}
              opacity="0.9"
            />
          )
        })}
        <circle cx={cx} cy={cy} r="22" fill="#0f1117" />
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#10b981">+8.4%</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="6" fill="#6b7280">return</text>
      </svg>
      <div className="flex-1 space-y-1">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-300 flex-1">{s.label}</span>
            <span className="font-mono text-gray-400 tabular-nums">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeaderboardPreview() {
  const rows = [
    { rank: 1, name: "@sarah_stocks", ret: "+24.8%", color: "text-emerald-400", medal: "🥇" },
    { rank: 2, name: "@alexchen_fx",  ret: "+19.3%", color: "text-emerald-400", medal: "🥈" },
    { rank: 3, name: "@marcus_trades",ret: "+15.7%", color: "text-emerald-400", medal: "🥉" },
    { rank: 4, name: "@emma_defi",    ret: "+12.1%", color: "text-emerald-400", medal: "" },
    { rank: 5, name: "@you",          ret: "+9.4%",  color: "text-emerald-400", medal: "", you: true },
  ]
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div
          key={r.rank}
          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs ${
            r.you ? "bg-emerald-500/15 border border-emerald-500/30" : ""
          }`}
        >
          <span className="w-5 text-center font-mono text-[11px] text-gray-500">
            {r.medal || `#${r.rank}`}
          </span>
          <span className="w-5 h-5 rounded-full bg-gray-700 flex-shrink-0" />
          <span className={`flex-1 truncate ${r.you ? "font-bold text-emerald-300" : "text-gray-300"}`}>
            {r.name}
          </span>
          <span className={`font-mono font-bold tabular-nums ${r.color}`}>{r.ret}</span>
        </div>
      ))}
    </div>
  )
}

function SocialPreview() {
  return (
    <div className="space-y-2.5">
      {/* Mock post */}
      <div className="rounded-lg bg-gray-900/60 border border-gray-700/50 p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-100 truncate">Sarah Mitchell</p>
            <p className="text-[10px] text-gray-500">@sarah_stocks · 2h</p>
          </div>
          <span className="rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 uppercase">
            ✓ Target hit +9.8%
          </span>
        </div>
        <p className="text-[11px] text-gray-200 leading-relaxed mb-2">
          NVDA breaking out of consolidation. AI demand still ripping. Holding through earnings 🚀
        </p>
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 mb-2 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-emerald-400">$NVDA · BULLISH</span>
          <span className="text-[9px] text-gray-500">·</span>
          <span className="text-[9px] text-gray-400">Target $920 · 1W</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">❤️ 47</span>
          <span className="flex items-center gap-1">💬 12</span>
          <span className="flex items-center gap-1">🔁 3</span>
        </div>
      </div>
      {/* Voice message bubble preview */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-800/80 border border-gray-700/50 px-2 py-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px]">
          🎙
        </div>
        <div className="flex items-center gap-[2px] flex-1 h-4">
          {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.5, 0.6, 0.8, 0.5, 0.9, 0.4, 0.6, 0.7, 0.5].map((h, i) => (
            <span
              key={i}
              className={`w-[2px] rounded-full ${i < 8 ? "bg-emerald-400" : "bg-gray-600"}`}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <span className="text-[10px] font-mono text-gray-400 tabular-nums">0:42</span>
      </div>
    </div>
  )
}

function AIChatPreview() {
  return (
    <div className="flex items-start gap-3 h-full">
      {/* Tutor avatar — human silhouette + AI halo */}
      <div className="relative flex-shrink-0 w-[88px] h-[150px]">
        {/* Soft glow halo behind */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" />

        {/* AI orbit ring */}
        <svg viewBox="0 0 88 150" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="ai-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde6c4" />
              <stop offset="100%" stopColor="#e2b48a" />
            </linearGradient>
            <linearGradient id="ai-shirt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <radialGradient id="ai-cheek" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#f4a89c" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f4a89c" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Orbit ring (rotating) */}
          <g style={{ transformOrigin: "44px 50px", animation: "pz-orbit 8s linear infinite" }}>
            <ellipse cx="44" cy="50" rx="40" ry="14" fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="0.6" strokeDasharray="2 3" />
            <circle cx="84" cy="50" r="2" fill="#818cf8">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="4" cy="50" r="1.5" fill="#10b981">
              <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Shoulders / shirt */}
          <path d="M10 150 C 10 110, 30 95, 44 95 C 58 95, 78 110, 78 150 Z" fill="url(#ai-shirt)" />
          {/* Collar accent */}
          <path d="M36 100 L44 110 L52 100" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

          {/* Neck */}
          <rect x="38" y="78" width="12" height="18" rx="2" fill="url(#ai-skin)" />

          {/* Head */}
          <ellipse cx="44" cy="56" rx="20" ry="24" fill="url(#ai-skin)" />

          {/* Hair */}
          <path d="M24 50 C 24 36, 34 28, 44 28 C 54 28, 64 36, 64 50 C 62 44, 56 40, 44 40 C 32 40, 26 44, 24 50 Z" fill="#3f2a1d" />

          {/* Cheek blush */}
          <ellipse cx="32" cy="62" rx="4" ry="3" fill="url(#ai-cheek)" />
          <ellipse cx="56" cy="62" rx="4" ry="3" fill="url(#ai-cheek)" />

          {/* Glasses */}
          <g stroke="#0f172a" strokeWidth="1.4" fill="none">
            <circle cx="36" cy="56" r="5" fill="rgba(255,255,255,0.08)" />
            <circle cx="52" cy="56" r="5" fill="rgba(255,255,255,0.08)" />
            <line x1="41" y1="56" x2="47" y2="56" />
          </g>

          {/* Eyes (behind glasses) */}
          <circle cx="36" cy="56" r="1.4" fill="#0f172a" />
          <circle cx="52" cy="56" r="1.4" fill="#0f172a" />

          {/* Smile */}
          <path d="M38 68 Q 44 72 50 68" fill="none" stroke="#7c3a2d" strokeWidth="1.4" strokeLinecap="round" />

          {/* Headset band */}
          <path d="M24 48 Q 44 30 64 48" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          {/* Headset earpiece */}
          <rect x="22" y="52" width="5" height="9" rx="2" fill="#10b981" />
          {/* Headset mic */}
          <path d="M27 60 Q 32 64 32 70" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="32" cy="70" r="1.5" fill="#34d399" />

          {/* Online / live dot */}
          <circle cx="64" cy="80" r="3.5" fill="#0f1117" />
          <circle cx="64" cy="80" r="2.5" fill="#10b981">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Name tag below */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-black/70 border border-indigo-500/30 px-2 py-0.5 text-[8px] font-bold text-indigo-300 uppercase tracking-wider">
          Aria · AI Tutor
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-tr-sm bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] text-gray-100 max-w-[90%]">
            What's a short squeeze?
          </div>
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-[11px] text-gray-200 leading-snug">
          When short sellers are <span className="text-emerald-400 font-semibold">forced to buy back</span> a stock as it rises — pushing it higher still. GameStop, 2021.
          <span className="inline-block w-1.5 h-2.5 ml-0.5 bg-indigo-400 align-middle animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-gray-500 pt-0.5">
          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
          Aria is typing the next example…
        </div>
      </div>
    </div>
  )
}
