import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { getTranslations } from "next-intl/server"
import { Hash, TrendingUp, UserPlus } from "lucide-react"
import { ink } from "@/lib/ink"
import { claimedCount, inviterFor, nextNumberPreview } from "@/lib/genesis"
import { GENESIS_COOKIE } from "@/lib/genesis-cookie"
import { GENESIS_LIMIT, PIONEER_LIMIT, formatMemberNo } from "@/lib/peerz"
import LogoAnimated from "@/components/brand/LogoAnimated"
import ForceDarkTheme from "@/components/layout/ForceDarkTheme"
import LocaleSwitcher from "@/components/settings/LocaleSwitcher"
import PeerzCoin from "@/components/peerz/PeerzCoin"
import GenesisJoinForm from "@/components/genesis/GenesisJoinForm"

type Search = Promise<{ ref?: string; error?: string }>

function cleanRef(ref?: string) {
  return ref ? ref.replace(/[^a-z0-9]/gi, "").slice(0, 16) || null : null
}

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const t = await getTranslations("Genesis")
  const ref = cleanRef((await searchParams).ref)
  // Invite links preview as the inviter's own card on X, Telegram, iMessage…
  const image = ref ? `/api/genesis/card/${ref}` : undefined
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    openGraph: { title: t("meta_title"), description: t("meta_description"), images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", images: image ? [image] : undefined },
  }
}

export default async function GenesisPage({ searchParams }: { searchParams: Search }) {
  const t = await getTranslations("Genesis")
  const params = await searchParams
  const ref = cleanRef(params.ref)
  const [claimed, next, inviter, store] = await Promise.all([
    claimedCount(), nextNumberPreview(), ref ? inviterFor(ref) : null, cookies(),
  ])
  const hasPage = !!store.get(GENESIS_COOKIE)?.value

  // The stage follows the number the next person would get, so the page never
  // promises Genesis when the sequence has already moved into Pioneer.
  const stage = next <= GENESIS_LIMIT ? "genesis" : next <= PIONEER_LIMIT ? "pioneer" : "closed"
  const cap = stage === "genesis" ? GENESIS_LIMIT : PIONEER_LIMIT
  const inStage = Math.min(claimed, cap)
  const pct = Math.round((inStage / cap) * 100)
  const fmt = (n: number) => n.toLocaleString("en-US")

  const perks = [
    { icon: Hash, title: stage === "pioneer" ? t("perk_number_pioneer") : t("perk_number_genesis"), sub: t("perk_number_sub") },
    { icon: TrendingUp, title: stage === "pioneer" ? t("perk_boost_pioneer") : t("perk_boost_genesis"), sub: t("perk_boost_sub") },
    { icon: UserPlus, title: t("perk_invite"), sub: t("perk_invite_sub") },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#070b12", color: "#e8f1f8" }}>
      <ForceDarkTheme />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
        backgroundImage: "linear-gradient(rgba(148,190,220,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(148,190,220,.06) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="absolute -right-40 top-16 w-[760px] h-[760px] rounded-full pointer-events-none" aria-hidden="true"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,.16) 0%, rgba(251,191,36,0) 62%)" }} />

      <nav className="relative max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center"><LogoAnimated size={32} /></Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher variant="compact" />
          <Link href="/login" className="text-sm font-semibold px-3 py-2 rounded-xl hover:bg-white/5" style={{ color: "#e8f1f8" }}>
            {t("sign_in")}
          </Link>
        </div>
      </nav>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-16 flex flex-col-reverse lg:flex-row lg:items-center gap-10 lg:gap-16">
        <section className="flex-1 min-w-0 max-w-xl space-y-6">
          <p className="flex items-center gap-2.5 font-mono text-[11px] sm:text-xs tracking-[0.16em] uppercase" style={{ color: "#fbbf24" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.04]">
            {stage === "genesis" ? t("headline_genesis") : stage === "pioneer" ? t("headline_pioneer") : t("headline_closed")}
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#a3b1c2" }}>{t("intro")}</p>

          {stage !== "closed" && (
            <ul className="space-y-3.5">
              {perks.map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                    style={{ background: "rgba(251,191,36,.12)", color: "#fcd34d" }}>
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block font-bold text-[15px]">{title}</span>
                    <span className="block text-[13px]" style={{ color: "#7f8ea3" }}>{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {ref && (
            <p className="text-sm font-semibold" style={{ color: ink("#2ee6a8") }}>
              {inviter?.username ? t("invited_by", { name: `@${inviter.username}` }) : t("invited_by_someone")}
            </p>
          )}
          {params.error === "link" && (
            <p role="alert" className="text-sm" style={{ color: "#ff5c7a" }}>{t("link_error")}</p>
          )}

          <GenesisJoinForm refCode={ref} stage={stage} />

          {hasPage && (
            <Link href="/genesis/me" className="inline-block text-sm font-semibold underline" style={{ color: "#fde68a" }}>
              {t("view_mine")} →
            </Link>
          )}
        </section>

        <aside className="w-full lg:w-[440px] flex-none flex flex-col items-center gap-8">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center">
            <PeerzCoin size={200} orbit float />
          </div>

          {stage !== "closed" && (
            <div className="w-full rounded-2xl p-5 space-y-3" style={{ background: "rgba(26,37,54,.55)", border: "1px solid rgba(148,190,220,.14)" }}>
              <div className="flex justify-between items-baseline gap-3">
                <span className="text-sm font-bold">{stage === "genesis" ? t("counter_genesis") : t("counter_pioneer")}</span>
                <span className="font-mono font-bold text-xl tabular-nums">
                  {fmt(inStage)} <span className="text-sm" style={{ color: "#7f8ea3" }}>/ {fmt(cap)}</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#172131" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: "#fbbf24" }} />
              </div>
              <div className="flex justify-between font-mono text-[11px]" style={{ color: "#7f8ea3" }}>
                <span>{t("next_number", { n: formatMemberNo(next) })}</span>
                <span>{t("left", { n: fmt(Math.max(0, cap - next + 1)) })}</span>
              </div>
            </div>
          )}

          <div className="w-full grid grid-cols-2 gap-2.5">
            <div className="rounded-xl px-3.5 py-3" style={{
              border: `1px solid ${stage === "genesis" ? "rgba(251,191,36,.5)" : "rgba(148,190,220,.12)"}`,
              background: stage === "genesis" ? "rgba(251,191,36,.08)" : "transparent",
            }}>
              <p className="font-mono text-[11px]" style={{ color: "#fcd34d" }}>#0001–1,000</p>
              <p className="font-bold text-sm mt-0.5">{t("tier_genesis")}</p>
            </div>
            <div className="rounded-xl px-3.5 py-3" style={{
              border: `1px solid ${stage === "pioneer" ? "rgba(34,195,238,.5)" : "rgba(148,190,220,.12)"}`,
              background: stage === "pioneer" ? "rgba(34,195,238,.08)" : "transparent",
            }}>
              <p className="font-mono text-[11px]" style={{ color: "#67e8f9" }}>#1,001–5,000</p>
              <p className="font-bold text-sm mt-0.5">{t("tier_pioneer")}</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
