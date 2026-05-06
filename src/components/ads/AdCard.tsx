"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Building2, ExternalLink, X, Info, ShieldCheck } from "lucide-react"

export interface AdCardData {
  id: string
  headline: string
  body: string
  imageUrl?: string | null
  ctaLabel: string
  topics: string[]
  disclaimer?: string | null
  brand: {
    id: string
    name: string
    slug: string
    logoUrl?: string | null
    verifiedAt?: Date | string | null
  }
}

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

export default function AdCard({ ad }: { ad: AdCardData }) {
  const [hidden, setHidden] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const seenRef = useRef(false)
  const cardRef = useRef<HTMLElement>(null)

  // Hide ads the user previously dismissed
  useEffect(() => {
    if (isHidden(ad.id)) setHidden(true)
  }, [ad.id])

  // Log impression once when the card scrolls into view
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

  return (
    <article
      ref={cardRef}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid rgba(245,158,11,0.4)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/brands/${ad.brand.slug}`}
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 hover:opacity-90"
          style={{ background: "white" }}>
          {ad.brand.logoUrl
            ? <img src={ad.brand.logoUrl} alt="" className="w-full h-full object-contain" />
            : <Building2 size={16} style={{ color: "var(--text-secondary)" }} />}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/brands/${ad.brand.slug}`}
              className="text-sm font-semibold hover:text-emerald-400 transition-colors"
              style={{ color: "var(--text-primary)" }}>
              {ad.brand.name}
            </Link>
            {ad.brand.verifiedAt && (
              <ShieldCheck size={12} className="text-emerald-400" />
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              Sponsored
            </span>
          </div>
          <p className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>
            {ad.headline}
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {ad.body}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setShowWhy(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            title="Why am I seeing this?">
            <Info size={13} />
          </button>
          <button onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            title="Hide this ad">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Image */}
      {ad.imageUrl && (
        <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="noopener sponsored noreferrer"
          className="block">
          <img src={ad.imageUrl} alt="" className="w-full max-h-80 object-cover" />
        </a>
      )}

      {/* Footer with CTA + disclaimer */}
      <div className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[10px] flex-1 min-w-0" style={{ color: "var(--text-secondary)" }}>
          {ad.disclaimer ?? "Sponsored content. Not financial advice."}
        </p>
        <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="noopener sponsored noreferrer"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ background: "#10b981", color: "#0f1117" }}>
          {ad.ctaLabel} <ExternalLink size={11} />
        </a>
      </div>

      {/* "Why am I seeing this?" overlay */}
      {showWhy && (
        <div className="px-4 pb-4 pt-2 text-[11px] space-y-1"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-base)" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Why this ad?</span>
            {" "}From <Link href={`/brands/${ad.brand.slug}`} className="text-emerald-400 hover:underline">{ad.brand.name}</Link>
            {ad.topics.length > 0 ? `, targeting the ${ad.topics.join(", ")} ${ad.topics.length === 1 ? "topic" : "topics"} on your feed.` : "."}
          </p>
          <button onClick={() => setShowWhy(false)}
            className="text-[10px] font-semibold mt-1"
            style={{ color: "var(--text-secondary)" }}>
            Close
          </button>
        </div>
      )}
    </article>
  )
}
