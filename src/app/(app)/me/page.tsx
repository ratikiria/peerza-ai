import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import type { LucideIcon } from "lucide-react"
import {
  Briefcase, TrendingUp, CandlestickChart, CalendarDays, Brain, Gamepad2, Swords, BookOpen,
  Bell, Moon, Gift, Sparkles, Building2, Search, Settings, Star, ChevronRight, User,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatPeerz } from "@/lib/peerz"
import ProBadge from "@/components/shared/ProBadge"
import ThemeQuickToggle from "@/components/layout/ThemeQuickToggle"
import LocaleSwitcher from "@/components/settings/LocaleSwitcher"
import SignOutButton from "@/components/layout/SignOutButton"

type Tile = { href: string; icon: LucideIcon; label: string; color: string }

// The phone "You" tab: profile at the top, then every feature on the platform.
export default async function MePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations("Nav")

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, image: true, isPro: true, genesisNo: true, peerzBalance: true },
  })
  if (!me) redirect("/login")

  const sections: { title: string; tiles: Tile[] }[] = [
    {
      title: t("me_invest"),
      tiles: [
        { href: "/portfolio", icon: Briefcase, label: t("portfolio"), color: "#22c3ee" },
        { href: "/investments", icon: TrendingUp, label: t("simulator"), color: "#2ee6a8" },
        { href: "/workspace", icon: CandlestickChart, label: t("charts"), color: "#22c3ee" },
        { href: "/calendar", icon: CalendarDays, label: t("calendar_short"), color: "#f5b84a" },
      ],
    },
    {
      title: t("me_learn"),
      tiles: [
        { href: "/ai-tutor", icon: Brain, label: t("ai_tutor"), color: "#c49bff" },
        { href: "/games", icon: Gamepad2, label: t("games"), color: "#ff7d95" },
        { href: "/games/duels", icon: Swords, label: t("duels"), color: "#ff7d95" },
        { href: "/dictionary", icon: BookOpen, label: t("dictionary"), color: "#c49bff" },
      ],
    },
    {
      title: t("me_community"),
      tiles: [
        { href: "/notifications", icon: Bell, label: t("notifications"), color: "#2ee6a8" },
        { href: "/peerz", icon: Moon, label: t("peerz"), color: "#f5b84a" },
        { href: "/genesis/me", icon: Gift, label: t("invite"), color: "#2ee6a8" },
        { href: "/web3", icon: Sparkles, label: t("web3"), color: "#c49bff" },
        { href: "/brands", icon: Building2, label: t("brands"), color: "#22c3ee" },
        { href: "/search", icon: Search, label: t("search"), color: "#9aa9bd" },
      ],
    },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-6 flex flex-col gap-5">
      {/* Profile */}
      <Link href={`/profile/${me.username}`} className="pz-glass rounded-3xl p-4 flex items-center gap-3.5">
        <span className="w-16 h-16 rounded-full p-[2.5px] flex-shrink-0" style={{ background: "linear-gradient(135deg, #2ee6a8, #22c3ee)" }}>
          <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
            {me.image ? <img src={me.image} alt="" className="w-full h-full object-cover" /> : <User size={24} style={{ color: "var(--text-primary)" }} />}
          </span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>{me.name}</span>
            {me.isPro && <ProBadge size="xs" />}
          </span>
          <span className="block text-sm truncate" style={{ color: "var(--text-secondary)" }}>
            @{me.username}
            {me.genesisNo != null && (
              <> · Genesis <span className="font-mono font-bold" style={{ color: "var(--accent-hi)" }}>#{String(me.genesisNo).padStart(4, "0")}</span></>
            )}
          </span>
          <span className="block text-xs mt-1 font-semibold" style={{ color: "var(--accent-hi)" }}>{t("view_profile")}</span>
        </span>
        <span className="text-right flex-shrink-0">
          <span className="block font-mono text-lg font-bold" style={{ color: "var(--text-primary)" }}>{formatPeerz(me.peerzBalance)}</span>
          <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{t("peerz")}</span>
        </span>
      </Link>

      {sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-[0.08em] uppercase px-1" style={{ color: "var(--text-secondary)" }}>{s.title}</h2>
          <div className="grid grid-cols-4 gap-2">
            {s.tiles.map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 py-1 min-h-[84px] transition-transform active:scale-95">
                <span className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center" style={{ background: `${color}22`, color }}>
                  <Icon size={24} />
                </span>
                <span className="text-xs font-semibold text-center leading-tight" style={{ color: "var(--text-primary)" }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Account */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-[0.08em] uppercase px-1" style={{ color: "var(--text-secondary)" }}>{t("me_account")}</h2>
        <div className="pz-glass rounded-2xl overflow-hidden divide-y" style={{ borderColor: "var(--glass-border)" }}>
          <Link href="/settings" className="flex items-center gap-3 px-4 min-h-[52px] text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            <Settings size={18} style={{ color: "var(--text-secondary)" }} />
            <span className="flex-1">{t("settings")}</span>
            <ChevronRight size={16} style={{ color: "var(--text-secondary)" }} />
          </Link>
          <Link href="/pro" className="flex items-center gap-3 px-4 min-h-[52px] text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            <Star size={18} style={{ color: "var(--accent-hi)" }} />
            <span className="flex-1">{t("pro_card_title")}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--accent-hi)" }}>{me.isPro ? t("pro_active") : t("upgrade_cta")}</span>
          </Link>
          <div className="flex items-center justify-between gap-3 px-4 min-h-[52px]">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("language")}</span>
            <LocaleSwitcher variant="compact" />
          </div>
          <div className="min-h-[48px] flex items-center"><ThemeQuickToggle variant="menu" /></div>
          <SignOutButton label={t("sign_out")} />
        </div>
      </section>
    </div>
  )
}
