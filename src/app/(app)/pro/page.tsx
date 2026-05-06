import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import ProPricingClient from "@/components/pro/ProPricingClient"
import { PRO_FEATURES } from "@/lib/pro"

export const metadata = {
  title: "Peerza.ai Pro — $10/mo",
  description: "Support Peerza.ai and unlock the Pro badge, longer posts, profile themes, higher AI Tutor quota, and priority support.",
}

export default async function ProPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      isPro: true,
      proExpiresAt: true,
      proMembership: {
        select: { status: true, billingCycle: true, paymentMethod: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      },
    },
  })

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated hero blobs — same treatment as games / investments */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 60%)", animation: "pz-blob 12s ease-in-out infinite" }} />
        <div className="absolute top-40 right-0 w-[460px] h-[460px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 60%)", animation: "pz-blob 14s ease-in-out infinite reverse" }} />
        <div className="absolute -bottom-32 left-1/3 w-[460px] h-[460px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 60%)", animation: "pz-blob 16s ease-in-out infinite" }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PEERZA.AI PRO
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Support the platform. <br />
            <span style={{ color: "#10b981" }}>Wear the badge.</span>
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Pro is a $10/month supporter membership. You get a visible Pro badge on your profile and posts, plus useful perks. It&apos;s not identity-verification — that&apos;s coming separately as a free KYC flow.
          </p>
        </section>

        {/* Already Pro state */}
        {me?.isPro && (
          <section
            className="rounded-3xl p-6 max-w-2xl mx-auto text-center space-y-3"
            style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)", border: "1px solid rgba(16,185,129,0.4)" }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">You&apos;re Pro · thank you</p>
            {me.proMembership && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {me.proMembership.billingCycle.charAt(0) + me.proMembership.billingCycle.slice(1).toLowerCase()} plan ·{" "}
                {me.proMembership.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                {new Date(me.proMembership.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            <a href="/settings" className="inline-block text-xs font-semibold text-emerald-400 hover:underline">
              Manage in settings →
            </a>
          </section>
        )}

        {/* Pricing */}
        <ProPricingClient isPro={!!me?.isPro} />

        {/* Features grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRO_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{f.body}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="space-y-3 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center" style={{ color: "var(--text-primary)" }}>FAQ</h2>
          <Faq q="Is Pro the same as &quot;Verified&quot;?"
            a="No. Pro is a supporter membership — anyone who pays gets it. True identity verification (gold check) will be a separate, free KYC flow we ship later. We deliberately don&apos;t use a checkmark for the Pro badge so the difference stays clear, especially in a finance context where misleading verification could hurt users." />
          <Faq q="Can I cancel anytime?"
            a="Yes. Cancel from /settings — you keep Pro until the end of your current billing period." />
          <Faq q="How do crypto payments work?"
            a="Crypto subscriptions don&apos;t auto-renew. You pay 1, 3, or 12 months upfront and your Pro status is granted for that exact window. We accept BTC, ETH, USDC, and a few others via Coinbase Commerce." />
          <Faq q="Where does the money go?"
            a="Hosting, AI usage (Claude API), and keeping the platform free for the majority of users. We don&apos;t sell user data — Pro and ads are the entire revenue model." />
        </section>
      </div>

      <style>{`
        @keyframes pz-blob {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
        }
      `}</style>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details
      className="rounded-2xl p-4 group"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <summary className="cursor-pointer text-sm font-semibold list-none flex items-center justify-between"
        style={{ color: "var(--text-primary)" }}>
        {q}
        <span className="text-xs transition-transform group-open:rotate-180" style={{ color: "var(--text-secondary)" }}>▼</span>
      </summary>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: a }} />
    </details>
  )
}
