import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { Check } from "lucide-react"
import { getWaitlistStatus, RECRUITER_MIN, REFERRAL_PEERZ, REFERRAL_MAX } from "@/lib/genesis"
import { GENESIS_COOKIE } from "@/lib/genesis-cookie"
import { formatMemberNo, tierLabel } from "@/lib/peerz"
import LogoAnimated from "@/components/brand/LogoAnimated"
import ForceDarkTheme from "@/components/layout/ForceDarkTheme"
import PeerzCoin from "@/components/peerz/PeerzCoin"
import GenesisInvite from "@/components/genesis/GenesisInvite"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Genesis")
  return { title: t("me_title"), robots: { index: false } }
}

const card = { background: "rgba(26,37,54,.5)", border: "1px solid rgba(148,190,220,.14)" }

export default async function GenesisMePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = await getTranslations("Genesis")
  // The link in the "you're in" email carries ?t=; after confirming, the cookie does.
  const token = (await searchParams).t ?? (await cookies()).get(GENESIS_COOKIE)?.value
  const status = token ? await getWaitlistStatus(token) : null
  if (!status) redirect("/genesis")

  const h = await headers()
  const base = process.env.NEXTAUTH_URL || `https://${h.get("host") ?? "www.peerza.ai"}`
  const inviteUrl = `${base}/g/${status.refCode}`
  const label = status.number != null && status.tier ? `${tierLabel(status.tier)} ${formatMemberNo(status.number)}` : null
  const waiting = Math.min(status.confirmedFriends, REFERRAL_MAX) * REFERRAL_PEERZ
  const toBadge = Math.max(0, RECRUITER_MIN - status.confirmedFriends)

  return (
    <div className="relative min-h-screen" style={{ background: "#070b12", color: "#e8f1f8" }}>
      <ForceDarkTheme />
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <nav className="flex items-center justify-between h-10">
          <Link href="/genesis" className="flex items-center"><LogoAnimated size={28} /></Link>
          <span className="font-mono text-[11px]" style={{ color: "#7f8ea3" }}>Launch · Q1 2027</span>
        </nav>

        <section className="flex flex-col items-center gap-2 pt-2 text-center">
          <PeerzCoin size={84} orbit float />
          <p className="mt-4 text-sm" style={{ color: "#a3b1c2" }}>
            {status.username ? t("me_hello_user", { username: status.username }) : t("me_hello")}
          </p>
          {status.number != null ? (
            <>
              <p className="font-mono font-bold text-6xl tracking-tight leading-none" style={{ color: "#fcd34d" }}>
                {formatMemberNo(status.number)}
              </p>
              <p className="font-mono text-xs tracking-[0.18em] uppercase" style={{ color: "#fbbf24" }}>{tierLabel(status.tier)}</p>
            </>
          ) : (
            <p className="text-base font-semibold">{t("me_launch_list")}</p>
          )}
        </section>

        <p className="flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: "#2ee6a8" }}>
          <Check size={14} strokeWidth={3} />
          {status.username ? t("me_locked_user") : t("me_locked")}
        </p>

        {status.hasAccount && (
          <Link href="/peerz" className="block rounded-2xl p-4 text-sm font-semibold text-center"
            style={{ background: "rgba(46,230,168,.08)", border: "1px solid rgba(46,230,168,.35)", color: "#2ee6a8" }}>
            {t("me_has_account")} {t("me_open_wallet")} →
          </Link>
        )}

        <GenesisInvite
          inviteUrl={inviteUrl}
          cardUrl={`/api/genesis/card/${status.refCode}?format=story`}
          shareText={t("me_share_text", { label: label ?? "on the Peerza launch list" })}
          waitingLabel={waiting > 0 ? t("me_waiting", { n: waiting.toLocaleString("en-US") }) : null}
        />

        <section className="rounded-2xl p-4 space-y-2.5" style={card}>
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm">{t("me_recruiter")}</h2>
            <span className="font-mono text-xs" style={{ color: "#a3b1c2" }}>
              {t("me_recruiter_progress", { n: Math.min(status.confirmedFriends, RECRUITER_MIN), total: RECRUITER_MIN })}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#172131" }}>
            <div className="h-full rounded-full" style={{
              width: `${Math.min(100, (status.confirmedFriends / RECRUITER_MIN) * 100)}%`, background: "#2ee6a8",
            }} />
          </div>
          <p className="text-xs" style={{ color: "#7f8ea3" }}>
            {toBadge > 0 ? t("me_recruiter_hint", { n: toBadge }) : t("me_recruiter_done")}
          </p>
          {status.friends.length === 0 ? (
            <p className="text-sm pt-1" style={{ color: "#a3b1c2" }}>{t("me_no_friends")}</p>
          ) : (
            <ul className="pt-1">
              {status.friends.map((f, i) => (
                <li key={i} className="flex items-center gap-2 py-2 text-[13px]" style={{ borderTop: "1px solid rgba(148,190,220,.08)" }}>
                  <span className="flex-1 truncate" style={{ color: f.confirmed ? "#e8f1f8" : "#a3b1c2" }}>{f.label}</span>
                  <span className="font-semibold" style={{ color: f.confirmed ? "#2ee6a8" : "#7f8ea3" }}>
                    {f.confirmed ? t("me_friend_joined") : t("me_friend_waiting")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center font-mono text-[11px] leading-relaxed" style={{ color: "#7f8ea3" }}>{t("me_footer")}</p>
      </div>
    </div>
  )
}
