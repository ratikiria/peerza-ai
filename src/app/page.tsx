import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import LogoAnimated from "@/components/brand/LogoAnimated"
import {
  ArrowRight,
  BrainCircuit,
  LineChart,
  Gamepad2,
  MessageSquare,
  Sparkles,
  Calendar,
  BarChart3,
  Building2,
  Users,
  ShieldCheck,
  Globe,
  PlayCircle,
} from "lucide-react"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/feed")

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(99,102,241,0.14) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.08) 0%, transparent 50%), linear-gradient(160deg, #0f2d1f 0%, #0f1117 45%, #0d1a2e 100%)",
      }}
    >
      {/* Floating ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-24 w-[36rem] h-[36rem] rounded-full bg-emerald-500/15 blur-3xl animate-[pz-blob_14s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-0 w-[32rem] h-[32rem] rounded-full bg-indigo-500/12 blur-3xl animate-[pz-blob2_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full bg-amber-500/8 blur-3xl animate-[pz-blob3_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative">
        <Nav />
        <Hero />
        <Pillars />
        <Features />
        <ForEveryone />
        <FinalCTA />
        <Footer />
      </div>

      <style>{`
        @keyframes pz-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 50px) scale(1.1); }
        }
        @keyframes pz-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.08); }
        }
        @keyframes pz-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -50px) scale(0.92); }
        }
        @keyframes pz-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pz-shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl border-b" style={{ background: "rgba(15,17,23,0.6)", borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoAnimated size={32} loop loopInterval={9000} />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 text-center">
      <div className="flex justify-center mb-8">
        <LogoAnimated size={120} />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-7 border" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)", color: "#34d399" }}>
        <Sparkles size={12} />
        <span>Open beta · Free to join</span>
      </div>

      <h1
        className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        style={{
          color: "var(--text-primary)",
          lineHeight: 1.05,
          background: "linear-gradient(180deg, #ffffff 0%, #d1d5db 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Investing,<br />
        <span
          style={{
            background: "linear-gradient(135deg, #34d399 0%, #fbbf24 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          made social.
        </span>
      </h1>

      <p
        className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        Learn with AI tutors. Practice with paper portfolios. Compete in trading games.
        Share with a community that gets it — at every level, from your first question
        to your first portfolio.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-xl text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-xl shadow-emerald-500/30 w-full sm:w-auto justify-center"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
        >
          Start free <ArrowRight size={15} />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-xl border transition-all hover:bg-white/5 w-full sm:w-auto justify-center"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-primary)" }}
        >
          <PlayCircle size={15} /> Try the demo
        </Link>
      </div>

      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        No credit card · Free forever · Pro unlocks at $10/mo
      </p>
    </section>
  )
}

// ─── Four Pillars ────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: BrainCircuit,
    title: "Learn with AI",
    body: "An always-on AI tutor that explains every concept, news headline, and market move in plain language. No textbooks, no jargon walls.",
    accent: "#10b981",
  },
  {
    icon: LineChart,
    title: "Practice without risk",
    body: "Paper-trade with live market data. Join challenges, run multiple portfolios, and learn what works before you put a dollar on the line.",
    accent: "#6366f1",
  },
  {
    icon: Gamepad2,
    title: "Play to learn",
    body: "Trading games and prediction leagues that turn market knowledge into a habit — competitive, social, and surprisingly addictive.",
    accent: "#fbbf24",
  },
  {
    icon: MessageSquare,
    title: "Share what you know",
    body: "A community of investors at every level — from first-timers to portfolio managers — talking about real markets in real time.",
    accent: "#fb7185",
  },
]

function Pillars() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#34d399" }}>
          Four pillars, one place
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Everything you need to grow into the markets.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PILLARS.map((p) => {
          const Icon = p.icon
          return (
            <div
              key={p.title}
              className="rounded-2xl p-7 border backdrop-blur-sm transition-all hover:translate-y-[-2px] hover:shadow-2xl"
              style={{ background: "rgba(22,24,31,0.7)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${p.accent}1a`, border: `1px solid ${p.accent}40` }}
              >
                <Icon size={22} style={{ color: p.accent }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {p.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Features strip ──────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Calendar,    label: "Live Economic Calendar",   sub: "Every release explained, in 5 languages" },
  { icon: BarChart3,   label: "TradingView Charts",       sub: "Embedded, professional-grade, free" },
  { icon: Building2,   label: "Brand Pages",              sub: "For every ticker, ETF, and asset" },
  { icon: Users,       label: "Group Chats & Polls",      sub: "Real conversations, not bot timelines" },
  { icon: Globe,       label: "Multilingual Community",   sub: "English, Español, Türkçe, ქართული" },
  { icon: ShieldCheck, label: "Built for Beginners",      sub: "Paper-trade first. Learn before you risk." },
]

function Features() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div
        className="rounded-3xl p-8 lg:p-12 border backdrop-blur-sm"
        style={{ background: "rgba(22,24,31,0.5)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  <Icon size={16} style={{ color: "#34d399" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                    {f.label}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.sub}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── For Everyone ────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    title: "Brand new to investing?",
    body: "Start with the AI tutor. Practice with $10,000 in paper money. No real risk — just real learning. The community is full of people who started exactly where you are.",
    accent: "#34d399",
  },
  {
    title: "Curious, but never pulled the trigger?",
    body: "Read what active investors are watching. Follow tickers and brands. Learn through conversation, not textbooks. Place your first paper trade when you're ready — no pressure.",
    accent: "#fbbf24",
  },
  {
    title: "Already trading every day?",
    body: "A community where the conversation isn't all bots and shilling. Live calendar, TradingView, brand pages, paper-portfolio competitions — the tools you already use, in one social home.",
    accent: "#a5b4fc",
  },
]

function ForEveryone() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#fbbf24" }}>
          Whoever you are
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl mx-auto" style={{ color: "var(--text-primary)" }}>
          Markets aren't only for people who already know.
        </h2>
        <p className="text-base sm:text-lg mt-5 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Whether you're asking your first question or running a real portfolio, there's a place for you here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PERSONAS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl p-7 border backdrop-blur-sm relative overflow-hidden"
            style={{ background: "rgba(22,24,31,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)` }}
            />
            <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              {p.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 lg:py-28 text-center">
      <h2
        className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #d1d5db 70%, #34d399 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.1,
        }}
      >
        Markets are better with company.
      </h2>
      <p className="text-base sm:text-lg max-w-2xl mx-auto mb-9" style={{ color: "var(--text-secondary)" }}>
        Join the open beta. Free forever. Pro unlocks deeper tools at $10/month — cancel anytime.
      </p>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 text-base font-semibold px-8 py-4 rounded-xl text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl shadow-emerald-500/30"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}
      >
        Join free <ArrowRight size={16} />
      </Link>
      <p className="text-xs mt-5" style={{ color: "var(--text-secondary)" }}>
        Already have an account? <Link href="/login" className="font-semibold underline-offset-2 hover:underline" style={{ color: "#34d399" }}>Sign in</Link>
      </p>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t mt-12" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <LogoAnimated size={28} />
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Peerza.ai © 2026 · Built for everyone curious about markets.
        </p>
        <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <Link href="/legal/terms"      className="hover:text-emerald-400 transition-colors">Terms</Link>
          <Link href="/legal/privacy"    className="hover:text-emerald-400 transition-colors">Privacy</Link>
          <Link href="/legal/disclaimer" className="hover:text-emerald-400 transition-colors">Disclaimer</Link>
        </div>
      </div>
    </footer>
  )
}
