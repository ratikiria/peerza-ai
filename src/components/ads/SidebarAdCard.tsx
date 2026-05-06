"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Building2, ExternalLink, X, ShieldCheck } from "lucide-react"
import type { AdCardData } from "./AdCard"

const HIDDEN_KEY = "peerza-hidden-ads-v1"

function loadHidden(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function isHidden(adId: string): boolean {
  return loadHidden().includes(adId)
}

function hide(adId: string) {
  try {
    const list = loadHidden()
    if (!list.includes(adId)) list.push(adId)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(list))
  } catch {}
}

interface Props {
  ad: AdCardData
  variant?: "sidebar" | "workspace"
}

export default function SidebarAdCard({ ad, variant = "sidebar" }: Props) {
  const [hidden, setHidden] = useState(false)
  const seenRef = useRef(false)
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isHidden(ad.id)) setHidden(true)
  }, [ad.id])

  useEffect(() => {
    if (hidden || seenRef.current || !cardRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !seenRef.current) {
        seenRef.current = true
        fetch(`/api/ads/${ad.id}/impression`, { method: "POST" }).catch(() => {})
      }
    }, { threshold: 0.5 })
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [ad.id, hidden])

  if (hidden) return null

  function dismiss() {
    hide(ad.id)
    setHidden(true)
  }

  const compact = variant === "workspace"

  return (
    <article
      ref={cardRef}
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(245,158,11,0.35)",
      }}
    >
      <div className={compact ? "p-2.5" : "p-3"}>
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          <Link
            href={`/brands/${ad.brand.slug}`}
            className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 hover:opacity-90"
            style={{ background: "white" }}
          >
            {ad.brand.logoUrl
              ? <img src={ad.brand.logoUrl} alt="" className="w-full h-full object-contain" />
              : <Building2 size={12} style={{ color: "var(--text-secondary)" }} />}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <Link
                href={`/brands/${ad.brand.slug}`}
                className="text-[11px] font-semibold truncate hover:text-emerald-400 transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {ad.brand.name}
              </Link>
              {ad.brand.verifiedAt && (
                <ShieldCheck size={10} className="text-emerald-400 flex-shrink-0" />
              )}
            </div>
            <span
              className="text-[8px] font-bold uppercase tracking-wider"
              style={{ color: "#f59e0b" }}
            >
              Sponsored
            </span>
          </div>
          <button
            onClick={dismiss}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-base)] flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Hide this ad"
            aria-label="Hide ad"
          >
            <X size={10} />
          </button>
        </div>

        {/* Headline + body */}
        <p
          className={`${compact ? "text-xs" : "text-[13px]"} font-bold leading-tight mb-1`}
          style={{ color: "var(--text-primary)" }}
        >
          {ad.headline}
        </p>
        <p
          className="text-[10.5px] leading-snug mb-2 line-clamp-3"
          style={{ color: "var(--text-secondary)" }}
        >
          {ad.body}
        </p>

        {/* CTA */}
        <a
          href={`/api/ads/${ad.id}/click`}
          target="_blank"
          rel="noopener sponsored noreferrer"
          className="flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg w-full transition-all hover:opacity-90"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          {ad.ctaLabel} <ExternalLink size={10} />
        </a>

        {/* Disclaimer */}
        <p
          className="text-[8.5px] mt-1.5 leading-tight"
          style={{ color: "var(--text-secondary)", opacity: 0.7 }}
        >
          {ad.disclaimer ?? "Sponsored. Not financial advice."}
        </p>
      </div>
    </article>
  )
}
