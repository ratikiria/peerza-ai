"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, X } from "lucide-react"

// Bump the version suffix to re-prompt all users after meaningful tour edits.
const STORAGE_KEY = "peerza:tour-v1-completed"
const REPLAY_EVENT = "peerza:open-tour"

type Step = {
  target?: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: "Welcome to Peerza 👋",
    body:
      "Quick 90-second tour of where everything lives. You can replay this anytime from Settings.",
  },
  {
    target: "[data-tour='search']",
    title: "Search anything",
    body:
      "Find people, posts, brands, dictionary terms, and more. Click here or press Ctrl/Cmd + K from anywhere.",
  },
  {
    target: "[data-tour='nav-feed']",
    title: "Feed — your home stream",
    body:
      "Posts from people you follow plus trending picks from the wider community. Create posts here too.",
  },
  {
    target: "[data-tour='messages']",
    title: "Messages",
    body:
      "Chats, voice notes, and calls (audio, video, screen share). A pulsing dot means a new message landed.",
  },
  {
    target: "[data-tour='notifications']",
    title: "Notifications",
    body:
      "Likes, comments, mentions, follows, and connection updates. Toasts also surface inline so you never miss anything important.",
  },
  {
    target: "[data-tour='nav-investments']",
    title: "Investments",
    body:
      "A simulated portfolio with real-time prices. Practice trading and learn the markets without risking real money.",
  },
  {
    target: "[data-tour='nav-calendar']",
    title: "Economic Calendar",
    body:
      "Upcoming macro events that move markets — rate decisions, CPI, NFP, major earnings. Plan your week around them.",
  },
  {
    target: "[data-tour='nav-ai-tutor']",
    title: "AI Tutor",
    body:
      "Ask anything about finance — concepts, strategies, glossary terms. Pro members get higher daily quotas.",
  },
  {
    target: "[data-tour='nav-games']",
    title: "Games",
    body:
      "Quick learning games and the Prediction League. Play, learn, and climb the leaderboard.",
  },
  {
    target: "[data-tour='requests']",
    title: "Connection requests",
    body:
      "Incoming connection requests appear here. Accept or decline without leaving the page.",
  },
  {
    target: "[data-tour='profile']",
    title: "Your profile menu",
    body:
      "Profile, settings, theme, Pro membership, and sign out. Upgrade to Pro for $10/mo right from this menu.",
  },
  {
    title: "You're all set 🚀",
    body:
      "Explore at your own pace. You can replay this tour anytime from Settings. Welcome to the community!",
  },
]

const POPOVER_W = 340
const POPOVER_H_ESTIMATE = 220
const SPOT_PAD = 6
const TARGET_OFFSET = 14

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export default function GuidedTour() {
  const [step, setStep] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    function openReplay() { setStep(0) }
    window.addEventListener(REPLAY_EVENT, openReplay)

    let firstRunTimer: ReturnType<typeof setTimeout> | undefined
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        firstRunTimer = setTimeout(() => setStep(0), 800)
      }
    } catch {}

    return () => {
      window.removeEventListener(REPLAY_EVENT, openReplay)
      if (firstRunTimer) clearTimeout(firstRunTimer)
    }
  }, [])

  const measure = useCallback(() => {
    if (step == null) return
    const sel = STEPS[step]?.target
    if (!sel) { setRect(null); return }
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    // Hidden-on-mobile elements collapse to a 0×0 rect — fall back to a
    // centered popover so the user still gets the explanation.
    if (r.width === 0 && r.height === 0) { setRect(null); return }
    setRect(r)
  }, [step])

  useEffect(() => {
    if (step == null) return
    measure()
    const settle = setTimeout(measure, 60)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      clearTimeout(settle)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [step, measure])

  useEffect(() => {
    if (step == null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false)
      else if (e.key === "ArrowRight" || e.key === "Enter") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (step == null) return null

  const current = STEPS[step]
  const total = STEPS.length
  const isFirst = step === 0
  const isLast = step === total - 1

  function close(complete: boolean) {
    if (complete) {
      try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
    }
    setStep(null)
    setRect(null)
  }

  function next() {
    if (isLast) close(true)
    else setStep((s) => (s ?? 0) + 1)
  }

  function prev() {
    setStep((s) => Math.max(0, (s ?? 0) - 1))
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024
  const vh = typeof window !== "undefined" ? window.innerHeight : 768

  let popStyle: React.CSSProperties
  if (rect) {
    const flipAbove = rect.bottom + TARGET_OFFSET + POPOVER_H_ESTIMATE > vh
    const top = flipAbove
      ? Math.max(8, rect.top - POPOVER_H_ESTIMATE - TARGET_OFFSET)
      : rect.bottom + TARGET_OFFSET
    const rawLeft = rect.left + rect.width / 2 - POPOVER_W / 2
    const left = clamp(rawLeft, 8, vw - POPOVER_W - 8)
    popStyle = { position: "fixed", top, left, width: POPOVER_W }
  } else {
    popStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(380, vw - 32),
    }
  }

  const spotStyle: React.CSSProperties | null = rect
    ? {
        position: "fixed",
        top: rect.top - SPOT_PAD,
        left: rect.left - SPOT_PAD,
        width: rect.width + SPOT_PAD * 2,
        height: rect.height + SPOT_PAD * 2,
        borderRadius: 14,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px #10b981, 0 0 24px 4px rgba(16,185,129,0.45)",
        pointerEvents: "none",
        transition: "top 0.3s cubic-bezier(0.4,0,0.2,1), left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 9998,
      }
    : null

  return (
    <>
      {/* Click-blocker — when no spotlight target, this also provides the dim. */}
      <div
        onClick={() => close(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9996,
          background: rect ? "transparent" : "rgba(0,0,0,0.7)",
          cursor: "default",
        }}
        aria-hidden
      />

      {spotStyle && <div style={spotStyle} aria-hidden />}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="peerza-tour-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...popStyle,
          zIndex: 9999,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 20px 48px rgba(0,0,0,0.45)",
        }}
      >
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Close tour"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
          }}
          className="hover:bg-[var(--bg-base)]"
        >
          <X size={14} />
        </button>

        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "#10b981" }}
        >
          Step {step + 1} of {total}
        </div>

        <h3
          id="peerza-tour-title"
          className="text-base font-bold mb-1.5 pr-6"
          style={{ color: "var(--text-primary)" }}
        >
          {current.title}
        </h3>

        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mb-4" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 9999,
                background: i === step ? "#10b981" : "var(--border)",
                transition: "width 0.25s ease",
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={prev}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors hover:bg-[var(--bg-base)]"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }}
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-colors"
            >
              {isLast ? "Done" : "Next"} {!isLast && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
