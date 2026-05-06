import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Building2, Plus, ShieldCheck, ShieldAlert } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function BrandsPage() {
  const session = await auth()
  const brands = await db.brand.findMany({
    where: { ownerId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ads: true } } },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-emerald-400" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your brands</h1>
        </div>
        <Link href="/brands/new"
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: "#10b981", color: "#0f1117" }}>
          <Plus size={14} /> New brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <Building2 size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--text-secondary)" }} />
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            No brand pages yet
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Create one to advertise on Peerza. Brokers, exchanges, fintechs and educators are welcome.
          </p>
          <Link href="/brands/new"
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: "#10b981", color: "#0f1117" }}>
            <Plus size={14} /> Create your first brand
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map((b) => (
            <Link key={b.id} href={`/brands/${b.slug}`}
              className="flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-[var(--bg-base)]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: "white", border: "1px solid var(--border)" }}>
                {b.logoUrl
                  ? <img src={b.logoUrl} alt={b.name} className="w-full h-full object-contain" />
                  : <Building2 size={20} style={{ color: "var(--text-secondary)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.name}</p>
                  {b.verifiedAt
                    ? <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                        <ShieldCheck size={10} /> Verified
                      </span>
                    : <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                        <ShieldAlert size={10} /> Unverified
                      </span>
                  }
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  {b._count.ads} {b._count.ads === 1 ? "ad" : "ads"} · {b.country} · created {formatDate(b.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
