"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HelpCircle } from "lucide-react"

interface Props {
  text: string
  label?: string
  // Initial alignment preference. Final position is clamped to the viewport
  // so this is a hint, not a guarantee.
  align?: "left" | "right"
}

const TOOLTIP_WIDTH = 240
const VIEWPORT_PADDING = 8
const HOVER_CLOSE_DELAY = 120

export default function WidgetHelp({ text, label, align = "right" }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  function openNow() {
    clearCloseTimer()
    setOpen(true)
  }
  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY)
  }

  useEffect(() => () => clearCloseTimer(), [])

  // Click/touch outside the trigger or tooltip closes the popover.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (tooltipRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("touchstart", onDoc)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("touchstart", onDoc)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className="w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-base)]"
        style={{ color: "var(--text-secondary)" }}
        aria-label={label ? `About ${label}` : "Widget help"}
        aria-expanded={open}
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <PortalTooltip
          tooltipRef={tooltipRef}
          anchorRef={buttonRef}
          text={text}
          align={align}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  )
}

// Portal-rendered tooltip pinned to the trigger button's viewport rect.
// Rendering to document.body sidesteps any ancestor `overflow: hidden`,
// transforms, or stacking contexts that would otherwise clip the tooltip.
function PortalTooltip({
  tooltipRef,
  anchorRef,
  text,
  align,
  onMouseEnter,
  onMouseLeave,
}: {
  tooltipRef: React.RefObject<HTMLDivElement | null>
  anchorRef: React.RefObject<HTMLButtonElement | null>
  text: string
  align: "left" | "right"
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useLayoutEffect(() => {
    function compute() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const top = rect.bottom + 6
      const preferred = align === "right" ? rect.right - TOOLTIP_WIDTH : rect.left
      const maxLeft = window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING
      const left = Math.max(VIEWPORT_PADDING, Math.min(preferred, maxLeft))
      setPos({ top, left })
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
      ref={tooltipRef}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: TOOLTIP_WIDTH,
        background: "var(--bg-elevated, #1b1d24)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 1000,
      }}
      className="text-[11px] leading-snug rounded-xl px-3 py-2 shadow-xl"
    >
      {text}
    </div>,
    document.body,
  )
}
