import type { ReactNode } from "react"
import { ink } from "@/lib/ink"
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
  /** Highlights the matching shortcut (e.g. "/feed"). */
  active?: string
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

export default async function LeftPanel({ user, active }: LeftPanelProps) {
  const t = await getTranslations("Nav")
  return (
    <aside
      className="w-64 flex-shrink-0 hidden lg:block sticky overflow-y-auto"
      style={{ top: "var(--chrome-h)", height: "calc(100vh - var(--chrome-h))", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
    >
      <div className="space-y-3 py-4 pb-8">
        {/* Profile mini card */}
        <div
          className="pz-glass rounded-2xl overflow-hidden"
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
                style={{ background: "rgba(16,185,129,0.08)", color: ink("#10b981"), border: "1px dashed rgba(16,185,129,0.4)" }}
              >
                {t("get_pro_cta")}
              </Link>
            )}
          </div>
        </div>

        {/* Navigation shortcuts — Glass Terminal: floating list with icon tiles,
            active item gets a filled emerald tile + glow (no card around it). */}
        <nav className="flex flex-col gap-0.5">
          {shortcuts.map((item) => {
            const Icon = item.icon
            const badge = "badge" in item ? item.badge : undefined
            const on = item.href === active
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--glass)]"
                style={on
                  ? { color: "var(--text-primary)", background: "rgba(46,230,168,0.10)" }
                  : { color: "var(--text-secondary)" }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={on
                    ? { background: "linear-gradient(135deg, #2ee6a8, #22c3ee)", color: "#04110c", boxShadow: "0 0 14px var(--glow)" }
                    : { background: "var(--glass)", border: "1px solid var(--glass-border)" }}
                >
                  <Icon size={15} />
                </span>
                <span>{t(item.tKey)}</span>
                {badge && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Pro upsell */}
        {!user.isPro && (
          <div className="pz-glass rounded-2xl p-4">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("pro_card_title")}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("pro_card_text")}</p>
            <Link
              href="/pro"
              className="mt-3 inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-xs font-bold transition-transform hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #2ee6a8, #22c3ee)", color: "#04110c", boxShadow: "0 4px 18px var(--glow)" }}
            >
              {t("pro_card_cta")}
            </Link>
          </div>
        )}

        {/* Mobile apps — coming soon */}
        <div
          className="relative rounded-2xl p-3 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid rgba(16,185,129,0.3)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0) 70%)" }}
          />
          <div className="relative flex items-center gap-2 mb-2.5">
            <span className="relative flex w-2 h-2 flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
              {t("mobile_apps_title")}
            </p>
            <Smartphone size={14} className="ml-auto flex-shrink-0" style={{ color: ink("#10b981") }} />
          </div>
          <div className="relative grid grid-cols-2 gap-2">
            <StoreBadge label={t("mobile_apps_soon_on")} store="App Store" icon={<AppleLogo />} />
            <StoreBadge label={t("mobile_apps_soon_on")} store="Google Play" icon={<AndroidLogo />} />
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

// Store-style badge — always dark, like the official App Store / Play badges.
function StoreBadge({ label, store, icon }: { label: string; store: string; icon: ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-transform hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(180deg, #1a1f2b 0%, #0b0e14 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        color: "#ffffff",
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="min-w-0 leading-none">
        <span className="block text-[8px] uppercase tracking-wide truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
          {label}
        </span>
        <span className="block text-[11px] font-semibold mt-0.5 whitespace-nowrap" style={{ color: "#ffffff" }}>
          {store}
        </span>
      </span>
    </div>
  )
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function AndroidLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7.6 10.6 5.6 7.2M16.4 10.6l2-3.4" stroke="#3ddc84" strokeWidth="1.4" strokeLinecap="round" />
      <path
        fillRule="evenodd"
        fill="#3ddc84"
        d="M2.5 18.5a9.5 9.5 0 0 1 19 0z M7.2 14.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z M14.6 14.8a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0z"
      />
    </svg>
  )
}
