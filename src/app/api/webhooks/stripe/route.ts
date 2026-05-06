import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { db } from "@/lib/db"

export const runtime = "nodejs"
// Stripe sends a raw body — we MUST not let Next parse it.
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session
        if (sess.mode === "subscription" && sess.subscription) {
          await grantProFromSubscription(sess.subscription as string, sess.customer as string, stripe)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await grantProFromSubscription(sub.id, sub.customer as string, stripe, sub)
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await db.proMembership.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELLED", cancelAtPeriodEnd: true },
        })
        // Flip the user.isPro flag iff this was the active membership.
        const mem = await db.proMembership.findUnique({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true, currentPeriodEnd: true },
        })
        if (mem && mem.currentPeriodEnd <= new Date()) {
          await db.user.update({ where: { id: mem.userId }, data: { isPro: false, proExpiresAt: null } })
        }
        break
      }
    }
  } catch (e: any) {
    console.error("[stripe webhook] handler error", e)
    return NextResponse.json({ error: e?.message ?? "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function grantProFromSubscription(
  subId: string,
  customerId: string,
  stripe: Stripe,
  preloaded?: Stripe.Subscription,
) {
  const sub = preloaded ?? await stripe.subscriptions.retrieve(subId)
  const userId = (sub.metadata?.userId as string) ?? null
  const cycle = (sub.metadata?.cycle as "MONTHLY" | "QUARTERLY" | "YEARLY") ?? "MONTHLY"
  if (!userId) {
    // Fallback: look up by customer id from prior membership row
    const existing = await db.proMembership.findFirst({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    })
    if (!existing) {
      console.warn("[stripe webhook] no userId in metadata or existing membership")
      return
    }
  }
  const finalUserId = userId ?? (await db.proMembership.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  }))?.userId
  if (!finalUserId) return

  const periodEnd = new Date(((sub as any).current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000)
  const isActive = sub.status === "active" || sub.status === "trialing"

  await db.proMembership.upsert({
    where: { userId: finalUserId },
    create: {
      userId: finalUserId,
      status: isActive ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : "CANCELLED",
      billingCycle: cycle,
      paymentMethod: "CARD",
      priceUSD: ((sub.items.data[0]?.price.unit_amount ?? 0) / 100),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
    },
    update: {
      status: isActive ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : "CANCELLED",
      billingCycle: cycle,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
    },
  })

  await db.user.update({
    where: { id: finalUserId },
    data: { isPro: isActive, proExpiresAt: periodEnd },
  })
}
