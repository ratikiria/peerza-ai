import { Calendar, Globe } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AboutCardProps {
  user: {
    bio?: string | null
    interests: string[]
    country?: string | null
    createdAt: Date | string
  }
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", CH: "🇨🇭", NL: "🇳🇱",
  ES: "🇪🇸", IT: "🇮🇹", AU: "🇦🇺", CA: "🇨🇦", JP: "🇯🇵", HK: "🇭🇰",
  SG: "🇸🇬", AE: "🇦🇪", GE: "🇬🇪", IN: "🇮🇳", BR: "🇧🇷", MX: "🇲🇽", TR: "🇹🇷",
}

export default function AboutCard({ user }: AboutCardProps) {
  if (!user.bio && user.interests.length === 0 && !user.country) return null
  const joined = typeof user.createdAt === "string" ? new Date(user.createdAt) : user.createdAt

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
        About
      </h3>

      {user.bio && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>{user.bio}</p>
      )}

      <div className="space-y-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
        {user.country && (
          <div className="flex items-center gap-2">
            <Globe size={12} />
            <span>
              <span className="mr-1">{COUNTRY_FLAGS[user.country.toUpperCase()] ?? ""}</span>
              {user.country.toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={12} />
          <span>Joined {formatDate(joined)}</span>
        </div>
      </div>

      {user.interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {user.interests.map((i) => (
            <span key={i}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
