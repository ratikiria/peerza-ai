import { Globe } from "lucide-react"

interface Links {
  twitter?: string
  linkedin?: string
  youtube?: string
  instagram?: string
  facebook?: string
  website?: string
}

// Build a full URL given a raw handle/value plus a base URL the platform expects.
// If the user already pasted a full https:// URL, we use it verbatim.
function buildUrl(raw: string, base: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  // Drop leading @ and slashes from the handle
  const handle = trimmed.replace(/^[@/]+/, "")
  return `${base}${encodeURIComponent(handle)}`
}

function buildWebsite(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `https://${trimmed}`
}

export default function SocialLinks({ links }: { links: Links | null | undefined }) {
  if (!links) return null
  const items: { label: string; href: string; icon: React.ReactNode; bg: string; fg: string }[] = []

  if (links.twitter) {
    const handle = links.twitter.replace(/^@/, "")
    items.push({
      label: `@${handle}`,
      href: buildUrl(handle, "https://x.com/"),
      icon: <span className="font-bold text-[10px]">𝕏</span>,
      bg: "#000", fg: "#fff",
    })
  }
  if (links.linkedin) {
    items.push({
      label: "LinkedIn",
      href: buildUrl(links.linkedin, "https://www.linkedin.com/in/"),
      icon: <span className="font-bold text-[9px]">in</span>,
      bg: "#0a66c2", fg: "#fff",
    })
  }
  if (links.youtube) {
    items.push({
      label: "YouTube",
      href: buildUrl(links.youtube, "https://www.youtube.com/@"),
      icon: <span className="font-bold text-[10px]">▶</span>,
      bg: "#ff0033", fg: "#fff",
    })
  }
  if (links.instagram) {
    items.push({
      label: "Instagram",
      href: buildUrl(links.instagram, "https://www.instagram.com/"),
      icon: <span className="font-bold text-[10px]">📷</span>,
      bg: "linear-gradient(45deg, #f09433, #dc2743 50%, #bc1888)", fg: "#fff",
    })
  }
  if (links.facebook) {
    items.push({
      label: "Facebook",
      href: buildUrl(links.facebook, "https://www.facebook.com/"),
      icon: <span className="font-bold text-[10px]">f</span>,
      bg: "#1877f2", fg: "#fff",
    })
  }
  if (links.website) {
    const url = buildWebsite(links.website)
    const display = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
    items.push({
      label: display || "Website",
      href: url,
      icon: <Globe size={10} />,
      bg: "#10b981", fg: "#000",
    })
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {items.map((it) => (
        <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-base)]"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <span className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
            style={{ background: it.bg, color: it.fg }}>
            {it.icon}
          </span>
          {it.label}
        </a>
      ))}
    </div>
  )
}
