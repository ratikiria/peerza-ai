"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Target, LineChart, PenLine, BarChart3, Camera, Sparkles, ChevronRight, X } from "lucide-react"
import { haptic } from "@/lib/haptics"
import { COMPOSE_EVENT, type ComposeMode } from "@/lib/compose"

const DISMISS_PX = 110

/** Phone bottom sheet behind the tab bar's + button. Only rendered after a tap,
 *  so `document` is always there for the portal. */
export default function CreateSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Nav")
  const router = useRouter()
  const pathname = usePathname()
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close() }
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    setShown(false)
    setTimeout(onClose, 220)
  }

  function pick(mode: ComposeMode | "aria") {
    haptic()
    close()
    if (mode === "aria") { router.push("/ai-tutor"); return }
    if (pathname === "/feed") {
      window.dispatchEvent(new CustomEvent(COMPOSE_EVENT, { detail: { mode } }))
    } else {
      router.push(`/feed?compose=${mode}`)
    }
  }

  const tile = "flex flex-col gap-2.5 p-4 rounded-[18px] text-left min-h-[96px] transition-transform active:scale-[0.97]"
  const tileStyle = { background: "var(--bg-elevated)", color: "var(--text-primary)" }

  return createPortal(
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label={t("create_title")}>
      <button
        type="button"
        aria-label={t("close")}
        onClick={close}
        className="absolute inset-0 w-full h-full transition-opacity duration-200"
        style={{ background: "rgba(3,6,10,0.62)", opacity: shown ? 1 : 0 }}
      />
      <section
        className="absolute left-0 right-0 bottom-0 rounded-t-[30px] px-[18px] pt-2.5 flex flex-col gap-3.5"
        style={{
          background: "var(--bg-card)",
          borderTop: "1px solid var(--glass-border)",
          boxShadow: "0 -30px 60px -20px rgba(0,0,0,0.8)",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          transform: shown ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: startY.current === null ? "transform 260ms cubic-bezier(.2,.9,.3,1)" : "none",
        }}
        onTouchStart={(e) => { startY.current = e.touches[0].clientY }}
        onTouchMove={(e) => {
          if (startY.current === null) return
          setDragY(Math.max(0, e.touches[0].clientY - startY.current))
        }}
        onTouchEnd={() => {
          const far = dragY > DISMISS_PX
          startY.current = null
          setDragY(0)
          if (far) close()
        }}
      >
        <div aria-hidden="true" className="self-center w-10 h-[5px] rounded-full" style={{ background: "var(--glass-border)" }} />
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>{t("create_title")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--glass)", color: "var(--text-secondary)" }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => pick("ranked")}
          className="flex items-center gap-3.5 p-4 rounded-[20px] text-left transition-transform active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, rgba(46,230,168,0.16), rgba(34,195,238,0.10))",
            border: "1px solid rgba(46,230,168,0.4)",
            color: "var(--text-primary)",
          }}
        >
          <span className="w-12 h-12 rounded-[15px] flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #2ee6a8, #22c3ee)", color: "#04110c" }}>
            <Target size={24} strokeWidth={2.4} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-bold">{t("create_ranked")}</span>
            <span className="block text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("create_ranked_sub")}</span>
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => pick("idea")} className={tile} style={tileStyle}>
            <LineChart size={24} style={{ color: "#22c3ee" }} />
            <span><span className="block text-sm font-semibold">{t("create_idea")}</span><span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("create_idea_sub")}</span></span>
          </button>
          <button type="button" onClick={() => pick("post")} className={tile} style={tileStyle}>
            <PenLine size={24} style={{ color: "var(--text-primary)" }} />
            <span><span className="block text-sm font-semibold">{t("create_post")}</span><span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("create_post_sub")}</span></span>
          </button>
          <button type="button" onClick={() => pick("poll")} className={tile} style={tileStyle}>
            <BarChart3 size={24} style={{ color: "#f5b84a" }} />
            <span><span className="block text-sm font-semibold">{t("create_poll")}</span><span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("create_poll_sub")}</span></span>
          </button>
          <button type="button" onClick={() => pick("story")} className={tile} style={tileStyle}>
            <Camera size={24} style={{ color: "#c49bff" }} />
            <span><span className="block text-sm font-semibold">{t("create_story")}</span><span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("create_story_sub")}</span></span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => pick("aria")}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
          style={{ border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(196,155,255,0.15)", color: "#c49bff" }}>
            <Sparkles size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{t("create_aria")}</span>
            <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("create_aria_sub")}</span>
          </span>
          <ChevronRight size={16} style={{ color: "var(--text-secondary)" }} />
        </button>
      </section>
    </div>,
    document.body,
  )
}
