import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isCoinbaseConfigured, createCoinbaseCharge } from "@/lib/coinbase"
import { PRO_PLANS, type ProPlanId } from "@/lib/pro"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isCoinbaseConfigured()) {
    return NextResponse.json(
      { error: "Crypto payments not configured. Add COINBASE_COMMERCE_API_KEY in .env to enable." },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: ProPlanId }
  const plan = body.plan
  if (!plan || !(plan in PRO_PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }
  if (plan === "monthly") {
    return NextResponse.json(
      { error: "Crypto requires 3-month or 1-year prepay (no auto-renew on chain)." },
      { status: 400 },
    )
  }

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isPro: true, name: true },
  })
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (me.isPro) return NextResponse.json({ error: "Already Pro" }, { status: 409 })

  const proPlan = PRO_PLANS[plan]
  const origin = new URL(req.url).origin

  try {
    const charge = await createCoinbaseCharge({
      name: `Peerza.ai Pro · ${proPlan.label}`,
      description: `Pro membership for ${proPlan.months} month${proPlan.months > 1 ? "s" : ""} — Pro badge, longer posts, priority support.`,
      priceUSD: proPlan.priceUSD,
      metadata: {
        userId: session.user.id,
        plan,
        cycle: proPlan.cycle,
        months: String(proPlan.months),
      },
      redirectUrl: `${origin}/pro/success?charge={{CODE}}`.replace("{{CODE}}", "pending"),
      cancelUrl:   `${origin}/pro?cancelled=1`,
    })

    return NextResponse.json({ url: charge.hostedUrl, chargeId: charge.id })
  } catch (e: any) {
    console.error("[crypto checkout] charge create failed", e)
    return NextResponse.json({ error: e?.message ?? "Coinbase charge failed" }, { status: 502 })
  }
}
