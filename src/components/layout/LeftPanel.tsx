import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Home, Bell, MessageCircle, TrendingUp, Brain, Gamepad2, Settings, Building2, CalendarDays, BookOpen, Briefcase, Sparkles, Smartphone } from "lucide-react"
import ProfilePhotoButton from "@/components/shared/ProfilePhotoButton"
import ProBadge from "@/components/shared/ProBadge"

const shortcuts = [
  { href: "/feed",          icon: Home,         tKey: "feed" },
  { href: "/notifications", icon: Bell,         tKey: "notifications" },
  { href: "/messages",      icon: MessageCircle, tKey: "messages" },
  { href: "/portfolio",     icon: Briefcase,    tKey: "portfolio" },
  { href: "/investments",   icon: TrendingUp,   tKey: "investments" },
  { href: "/calendar",      icon: CalendarDays, tKey: "calendar" },
  { href: "/dictionary",    icon: BookOpen,     tKey: "dictionary" },
  { href: "/ai-tutor",      icon: Brain,        tKey: "ai_tutor" },
  { href: "/games",         icon: Gamepad2,     tKey: "games" },
  { href: "/web3",          icon: Sparkles,     tKey: "web3", badge: "NEW" as const },
  { href: "/brands",        icon: Building2,    tKey: "brands" },
  { href: "/settings",      icon: Settings,     tKey: "settings" },
] as const

interface LeftPanelProps {
  user: {
    id: string
    name: string
    username: string
    image?: string | null
    coverImage?: string | null
    isPremium: boolean
    isPro?: boolean
  }
}

export default async function LeftPanel({ user }: LeftPanelProps) {
  const t = await getTranslations("Nav")
  return (
    <aside
      className="w-64 flex-shrink-0 hidden lg:block sticky overflow-y-auto"
      style={{ top: "64px", height: "calc(100vh - 64px)", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      <div className="space-y-3 py-4 pb-8">
        {/* Profile mini card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Banner links to profile — uses cover photo if set */}
          <Link href={`/profile/${user.username}`} className="block h-16 hover:opacity-90 transition-opacity overflow-hidden"
            style={
              user.coverImage
                ? { background: "var(--bg-base)" }
                : { background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(59,130,246,0.2) 100%)" }
            }
          >
            {user.coverImage && (
              <img src={user.coverImage} alt="" className="w-full h-full object-cover" />
            )}
          </Link>
          <div className="px-4 pb-4">
            {/* Photo button — NOT inside any <Link> */}
            <div className="-mt-7 mb-3">
              <ProfilePhotoButton user={user} size={48} borderColor="var(--bg-card)" />
            </div>
            {/* Name / username links to profile */}
            <Link href={`/profile/${user.username}`} className="block group">
              <span className="flex items-center gap-1.5">
                <p className="font-semibold text-sm group-hover:text-emerald-400 transition-colors" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                {user.isPro && <ProBadge size="xs" />}
              </span>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
            </Link>
            {user.isPro ? (
              <span className="mt-1.5 inline-block text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                {t("pro_member")}
              </span>
            ) : (
              <Link
                href="/pro"
                className="mt-1.5 inline-block text-[10px] hover:bg-emerald-500/15 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide transition-colors"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px dashed rgba(16,185,129,0.4)" }}
              >
                {t("get_pro_cta")}
              </Link>
            )}
          </div>
        </div>

        {/* Navigation shortcuts */}
        <div
          className="rounded-2xl p-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {shortcuts.map((item) => {
            const Icon = item.icon
            const badge = "badge" in item ? item.badge : undefined
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--bg-base)]"
                style={{ color: "var(--text-secondary)" }}
              >
                <Icon size={17} className="flex-shrink-0" />
                <span>{t(item.tKey)}</span>
                {badge && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Mobile apps — coming soon */}
        <div
          className="rounded-2xl p-3 flex items-center gap-3"
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px dashed rgba(16,185,129,0.35)",
          }}
        >
          <Smartphone size={18} className="flex-shrink-0" style={{ color: "#10b981" }} />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
              {t("mobile_apps_title")}
            </p>
            <p className="text-[10px] tracking-wide mt-0.5" style={{ color: "#10b981" }}>
              {t("mobile_apps_subtitle")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] px-2" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
          {t("footer")}
        </p>
      </div>
    </aside>
  )
}
