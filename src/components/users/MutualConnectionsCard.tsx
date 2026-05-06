import Link from "next/link"
import { Users, User as UserIcon } from "lucide-react"
import type { MutualUser } from "@/lib/profile-data"

interface Props {
  users: MutualUser[]
  total: number
  partnerName: string
}

export default function MutualConnectionsCard({ users, total, partnerName }: Props) {
  if (users.length === 0) return null
  const visible = users.slice(0, 5)
  const remaining = total - visible.length

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5"
        style={{ color: "var(--text-secondary)" }}>
        <Users size={12} /> Followed by both
      </h3>

      <div className="space-y-2">
        {visible.map((u) => (
          <Link key={u.id} href={`/profile/${u.username}`}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              {u.image
                ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                : <UserIcon size={14} className="text-emerald-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.name}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>@{u.username}</p>
            </div>
          </Link>
        ))}
      </div>

      {remaining > 0 && (
        <p className="text-[11px] mt-3" style={{ color: "var(--text-secondary)" }}>
          +{remaining} more you and @{partnerName} both follow
        </p>
      )}
    </div>
  )
}
