"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import PeerzCoin from "@/components/peerz/PeerzCoin"

/** Invite link with copy + share buttons on the waitlist status page. */
export default function GenesisInvite({ inviteUrl, cardUrl, shareText, waitingLabel }: {
  inviteUrl: string
  cardUrl: string
  shareText: string
  waitingLabel: string | null
}) {
  const t = useTranslations("Genesis")
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked: the link is visible to select by hand */
    }
  }

  const x = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`
  const share = "h-11 rounded-xl flex items-center justify-center text-[13px] font-semibold transition-colors hover:bg-white/5"
  const shareStyle = { border: "1px solid rgba(148,190,220,.2)", color: "#e8f1f8" }

  return (
    <section className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(26,37,54,.5)", border: "1px solid rgba(148,190,220,.14)" }}>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-sm">{t("me_invite")}</h2>
        {waitingLabel && (
          <span className="flex items-center gap-1.5 font-mono text-xs" style={{ color: "#fde68a" }}>
            <PeerzCoin size={14} /> {waitingLabel}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input readOnly value={inviteUrl} aria-label={t("me_invite")} onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 h-11 rounded-lg px-3 font-mono text-[13px] outline-none"
          style={{ background: "rgba(7,11,18,.7)", border: "1px solid rgba(148,190,220,.2)", color: "#cfe0ee" }} />
        <button type="button" onClick={copy} className="h-11 px-4 rounded-lg font-bold text-[13px] flex-none hover:brightness-105"
          style={{ background: "#fbbf24", color: "#1c1203" }}>
          {copied ? t("me_copied") : t("me_copy")}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <a className={share} style={shareStyle} href={cardUrl} target="_blank" rel="noopener">{t("me_story")}</a>
        <a className={share} style={shareStyle} href={x} target="_blank" rel="noopener noreferrer">{t("me_post_x")}</a>
        <a className={share} style={shareStyle} href={telegram} target="_blank" rel="noopener noreferrer">{t("me_telegram")}</a>
      </div>
    </section>
  )
}
