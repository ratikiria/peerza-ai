import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ChevronRight, User as UserIcon, Bell, Award, Globe, Languages, Star, Palette, HelpCircle, FileText } from "lucide-react"
import ChatSoundToggle from "@/components/settings/ChatSoundToggle"
import NotificationPreferences from "@/components/settings/NotificationPreferences"
import ThemeToggle from "@/components/settings/ThemeToggle"
import TrackRecordToggle from "@/components/settings/TrackRecordToggle"
import FollowListToggle from "@/components/settings/FollowListToggle"
import CountrySelect from "@/components/settings/CountrySelect"
import LocaleSwitcher from "@/components/settings/LocaleSwitcher"
import ProMembershipCard from "@/components/settings/ProMembershipCard"
import ReplayTourButton from "@/components/settings/ReplayTourButton"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations("Settings")

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      isPro: true,
      proExpiresAt: true,
      proMembership: {
        select: {
          status: true,
          billingCycle: true,
          paymentMethod: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          priceUSD: true,
        },
      },
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Star size={14} className="text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_pro")}</h2>
        </header>
        <ProMembershipCard
          isPro={!!me?.isPro}
          membership={me?.proMembership ?? null}
        />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Palette size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_appearance")}</h2>
        </header>
        <ThemeToggle />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Languages size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_language")}</h2>
        </header>
        <LocaleSwitcher variant="row" />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Bell size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_notifications")}</h2>
        </header>
        <ChatSoundToggle />
        <NotificationPreferences />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Globe size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_region")}</h2>
        </header>
        <CountrySelect />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <Award size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_privacy")}</h2>
        </header>
        <TrackRecordToggle />
        <FollowListToggle />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <UserIcon size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_account")}</h2>
        </header>
        <Link href="/settings/profile"
          className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-base)]">
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("edit_profile")}</span>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </Link>
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <HelpCircle size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_help")}</h2>
        </header>
        <ReplayTourButton />
      </section>

      <section className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <header className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <FileText size={14} style={{ color: "var(--text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}>{t("section_legal")}</h2>
        </header>
        <Link href="/legal/terms"
          className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-base)]"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("terms_of_service")}</span>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <Link href="/legal/privacy"
          className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-base)]"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("privacy_policy")}</span>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </Link>
        <Link href="/legal/disclaimer"
          className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-base)]">
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("financial_disclaimer")}</span>
          <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
        </Link>
      </section>
    </div>
  )
}
