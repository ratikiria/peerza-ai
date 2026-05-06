import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Building2, ShieldCheck, ShieldAlert, ExternalLink, Plus, Eye, MousePointerClick } from "lucide-react"
import { formatDate } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "var(--text-secondary)",
  PENDING_REVIEW: "#f59e0b",
  HUMAN_QUEUE: "#fb923c",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  PAUSED: "#a78bfa",
  COMPLETED: "var(--text-secondary)",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  HUMAN_QUEUE: "Human review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  COMPLETED: "Completed",
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  const { slug } = await params

  const brand = await db.brand.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      ads: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { impressions: true, clicks: true } } },
      },
    },
  })
  if (!brand) notFound()

  const isOwner = brand.ownerId === session!.user.id

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Brand header */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="h-24"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(59,130,246,0.2) 100%)" }} />
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-3 relative z-10">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: "white", border: "4px solid var(--bg-card)" }}>
              {brand.logoUrl
                ? <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain" />
                : <Building2 size={28} style={{ color: "var(--text-secondary)" }} />}
            </div>
            {isOwner && (
              <Link href={`/brands/${brand.slug}/ads/new`}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: "#10b981", color: "#0f1117" }}>
                <Plus size={14} /> New ad
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{brand.name}</h1>
            {brand.verifiedAt
              ? <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  <ShieldCheck size={11} /> Verified
                </span>
              : <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                  <ShieldAlert size={11} /> Unverified — pending review
                </span>
            }
          </div>
          {brand.legalName && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{brand.legalName}</p>
          )}

          {brand.bio && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{brand.bio}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
            style={{ color: "var(--text-secondary)" }}>
            <span>📍 {brand.country}</span>
            {brand.regulator && <span>🛡️ {brand.regulator}{brand.licenseNumber ? ` · ${brand.licenseNumber}` : ""}</span>}
            {brand.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <ExternalLink size={11} /> {brand.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
            <span>Created {formatDate(brand.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Ads */}
      {isOwner && (
        <div>
          <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: "var(--text-primary)" }}>
            Campaigns
          </h2>
          {brand.ads.length === 0 ? (
            <div className="rounded-2xl p-10 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No ads yet — create one to start reaching the community.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {brand.ads.map((ad) => (
                <div key={ad.id} className="rounded-2xl p-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{ad.headline}</p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{ad.body}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                      style={{ background: "var(--bg-base)", color: STATUS_COLORS[ad.status] ?? "var(--text-secondary)" }}>
                      {STATUS_LABEL[ad.status] ?? ad.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span className="flex items-center gap-1"><Eye size={11} /> {ad._count.impressions}</span>
                    <span className="flex items-center gap-1"><MousePointerClick size={11} /> {ad._count.clicks}</span>
                    {ad.topics.length > 0 && (
                      <span>· {ad.topics.join(", ")}</span>
                    )}
                  </div>
                  {ad.reviewNotes && ad.status === "REJECTED" && (
                    <p className="mt-2 text-[11px] p-2 rounded-md"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                      Review note: {ad.reviewNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
