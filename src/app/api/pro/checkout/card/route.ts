import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStripe, STRIPE_PRICE_BY_PLAN } from "@/lib/stripe"
import { PRO_PLANS, type ProPlanId } from "@/lib/pro"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: "Card payments not configured. Add STRIPE_SECRET_KEY in .env to enable." },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: ProPlanId }
  const plan = body.plan
  if (!plan || !(plan in PRO_PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, isPro: true, proMembership: { select: { stripeCustomerId: true } } },
  })
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (me.isPro) return NextResponse.json({ error: "Already Pro" }, { status: 409 })

  const priceCfg = STRIPE_PRICE_BY_PLAN[plan]
  const proPlan = PRO_PLANS[plan]
  const origin = new URL(req.url).origin

  // Reuse existing Stripe customer if we have one.
  let customerId = me.proMembership?.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: me.email,
      name: me.name,
      metadata: { userId: session.user.id },
    })
    customerId = customer.id
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Peerza.ai Pro · ${proPlan.label}`,
          description: "Pro membership — Pro badge, longer posts, profile themes, priority support.",
        },
        unit_amount: priceCfg.amount,
        recurring: { interval: priceCfg.interval, interval_count: priceCfg.intervalCount },
      },
      quantity: 1,
    }],
    metadata: {
      userId: session.user.id,
      plan,
      cycle: proPlan.cycle,
    },
    subscription_data: {
      metadata: {
        userId: session.user.id,
        plan,
        cycle: proPlan.cycle,
      },
    },
    success_url: `${origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pro?cancelled=1`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id })
}
