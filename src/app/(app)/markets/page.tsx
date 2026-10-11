import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import type { LucideIcon } from "lucide-react"
import { Briefcase, TrendingUp, CandlestickChart, CalendarDays, BookOpen, ChevronRight } from "lucide-react"
import { auth } from "@/lib/auth"

type Card = { href: string; icon: LucideIcon; title: string; sub: string; color: string }

// The phone "Markets" tab: one door to every money tool.
export default async function MarketsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations("Nav")

  const cards: Card[] = [
    { href: "/portfolio", icon: Briefcase, title: t("portfolio"), sub: t("market_portfolio_sub"), color: "#22c3ee" },
    { href: "/investments", icon: TrendingUp, title: t("simulator"), sub: t("market_sim_sub"), color: "#2ee6a8" },
    { href: "/workspace", icon: CandlestickChart, title: t("charts"), sub: t("market_charts_sub"), color: "#22c3ee" },
    { href: "/calendar", icon: CalendarDays, title: t("calendar"), sub: t("market_cal_sub"), color: "#f5b84a" },
    { href: "/dictionary", icon: BookOpen, title: t("dictionary"), sub: t("market_dict_sub"), color: "#c49bff" },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-6 flex flex-col gap-3">
      <h1 className="text-[30px] font-bold tracking-tight px-1" style={{ color: "var(--text-primary)" }}>{t("markets")}</h1>
      {cards.map(({ href, icon: Icon, title, sub, color }) => (
        <Link
          key={href}
          href={href}
          className="pz-glass rounded-[22px] p-4 flex items-center gap-4 transition-transform active:scale-[0.98]"
        >
          <span className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0" style={{ background: `${color}22`, color }}>
            <Icon size={26} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</span>
            <span className="block text-sm leading-snug mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</span>
          </span>
          <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
        </Link>
      ))}
    </div>
  )
}
