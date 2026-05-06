"use client"

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { Globe, Check, ChevronDown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import FlagImage from "@/components/calendar/FlagImage"
import { UI_LOCALES, type UiLocale } from "@/lib/locale"
import { setUiLocale } from "@/lib/locale-actions"

interface Props {
  // "compact" — small globe button (for navbar). "row" — full-width settings row.
  variant?: "compact" | "row"
}

const MENU_WIDTH = 200

export default function LocaleSwitcher({ variant = "compact" }: Props) {
  const t = useTranslations("Locale")
  const active = useLocale() as UiLocale
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Click-outside: close when the user clicks anything that's neither the
  // trigger button nor the portal-rendered menu.
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!open) return
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  function pick(code: UiLocale) {
    setOpen(false)
    if (code === active) return
    startTransition(() => {
      setUiLocale(code)
    })
  }

  const current = UI_LOCALES.find((l) => l.code === active) ?? UI_LOCALES[0]

  if (variant === "row") {
    return (
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {t("interface_language")}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {t("interface_language_hint")}
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <FlagImage code={current.flag} size={13} />
            <span>{current.native}</span>
            <ChevronDown size={13} style={{ color: "var(--text-secondary)" }} />
          </button>
          {open && (
            <PortalMenu
              menuRef={menuRef}
              anchorRef={buttonRef}
              active={active}
              onPick={pick}
              align="right"
            />
          )}
        </div>
      </div>
    )
  }

  // compact
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        title={t("language_button_title")}
        aria-label={t("language_button_title")}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-colors hover:bg-[var(--bg-base)] disabled:opacity-60"
        style={{ color: "var(--text-secondary)" }}
      >
        <Globe size={16} />
        <span className="text-[11px] font-semibold uppercase tracking-wide hidden sm:inline">
          {current.code}
        </span>
      </button>
      {open && (
        <PortalMenu
          menuRef={menuRef}
          anchorRef={buttonRef}
          active={active}
          onPick={pick}
          align="left"
        />
      )}
    </>
  )
}

// Portal-rendered menu pinned to the trigger button's viewport rect. Rendering
// to document.body sidesteps any ancestor `overflow: hidden`, transforms, or
// stacking contexts that would otherwise clip the dropdown.
function PortalMenu({
  menuRef,
  anchorRef,
  active,
  onPick,
  align,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>
  anchorRef: React.RefObject<HTMLButtonElement | null>
  active: UiLocale
  onPick: (code: UiLocale) => void
  align: "left" | "right"
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    function compute() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const top = rect.bottom + 4
      const left = align === "right"
        ? rect.right - MENU_WIDTH
        : rect.left
      // Clamp to viewport so we never render off-screen on narrow widths.
      const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
      setPos({ top, left: clampedLeft })
    }
    compute()
    window.addEventListener("resize", compute)
    window.addEventListener("scroll", compute, true)
    return () => {
      window.removeEventListener("resize", compute)
      window.removeEventListener("scroll", compute, true)
    }
  }, [anchorRef, align])

  if (!mounted || !pos) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        zIndex: 1000,
      }}
      className="rounded-xl shadow-2xl py-1"
    >
      {UI_LOCALES.map((lang) => {
        const isActive = lang.code === active
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onPick(lang.code)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-base)]"
            style={{ color: isActive ? "#10b981" : "var(--text-primary)" }}
          >
            <FlagImage code={lang.flag} size={13} />
            <span className="flex-1 text-left">{lang.native}</span>
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {lang.label}
            </span>
            {isActive && <Check size={13} className="text-emerald-400" />}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
