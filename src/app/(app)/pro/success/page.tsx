import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import ProBadge from "@/components/shared/ProBadge"

export const dynamic = "force-dynamic"

export default async function ProSuccessPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Webhooks are async — there's a small race where the user lands here before
  // their isPro flag has flipped. We re-read from DB on every render so a refresh
  // picks up the latest state.
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      isPro: true,
      proExpiresAt: true,
      proMembership: { select: { billingCycle: true, paymentMethod: true } },
    },
  })

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full"
        style={{ background: "rgba(16,185,129,0.18)", border: "2px solid rgba(16,185,129,0.5)" }}>
        <ProBadge size="lg" />
      </div>

      {me?.isPro ? (
        <>
          <h1 className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
            Welcome to Pro
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Your Pro badge is now visible across Peerza.ai. Thanks for supporting the platform.
          </p>
          {me.proMembership && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {me.proMembership.billingCycle.charAt(0) + me.proMembership.billingCycle.slice(1).toLowerCase()} ·
              {" "}{me.proMembership.paymentMethod === "CARD" ? "Card" : "Crypto"} ·
              {" "}Renews{" "}
              {me.proExpiresAt ? new Date(me.proExpiresAt).toLocaleDateString() : "—"}
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>
            Payment received — finalizing…
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Crypto confirmations and Stripe webhooks usually take 10–30 seconds.
            Refresh in a moment, or check <Link href="/settings" className="text-emerald-400 underline">settings</Link>.
          </p>
        </>
      )}

      <div className="flex justify-center gap-3 pt-4">
        <Link href={`/profile/${session.user.username}`}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "#10b981", color: "#0f1117" }}>
          View my profile
        </Link>
        <Link href="/feed"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          Back to feed
        </Link>
      </div>
    </div>
  )
}
