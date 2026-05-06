import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyCoinbaseSignature } from "@/lib/coinbase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CoinbaseEvent {
  id: string
  type: string
  data: {
    id: string
    code: string
    metadata?: { userId?: string; plan?: string; cycle?: string; months?: string }
    pricing?: { local: { amount: string; currency: string } }
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get("x-cc-webhook-signature")

  if (!verifyCoinbaseSignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: { event: CoinbaseEvent }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 })
  }

  const evt = payload.event
  if (!evt) return NextResponse.json({ error: "No event" }, { status: 400 })

  // We only care about successful payments. Coinbase fires both "charge:confirmed"
  // (zero-confirmation, near-instant) and "charge:resolved" (fully settled). We
  // grant on confirmed and ignore resolved if already granted.
  if (evt.type !== "charge:confirmed" && evt.type !== "charge:resolved") {
    return NextResponse.json({ received: true, ignored: true })
  }

  const userId = evt.data.metadata?.userId
  const cycle = (evt.data.metadata?.cycle as "MONTHLY" | "QUARTERLY" | "YEARLY") ?? "QUARTERLY"
  const months = parseInt(evt.data.metadata?.months ?? "3", 10)
  const priceUSD = parseFloat(evt.data.pricing?.local.amount ?? "0")

  if (!userId) {
    console.warn("[coinbase webhook] no userId in metadata, ignoring")
    return NextResponse.json({ received: true, ignored: true })
  }

  // Idempotency: if we've already processed this charge, do nothing.
  const existing = await db.proMembership.findUnique({ where: { cryptoChargeId: evt.data.id } })
  if (existing) return NextResponse.json({ received: true, dedup: true })

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + months)

  await db.proMembership.upsert({
    where: { userId },
    create: {
      userId,
      status: "ACTIVE",
      billingCycle: cycle,
      paymentMethod: "CRYPTO",
      priceUSD,
      currentPeriodEnd: periodEnd,
      cryptoChargeId: evt.data.id,
    },
    update: {
      status: "ACTIVE",
      billingCycle: cycle,
      paymentMethod: "CRYPTO",
      priceUSD,
      currentPeriodEnd: periodEnd,
      cryptoChargeId: evt.data.id,
      cancelAtPeriodEnd: false,
    },
  })

  await db.user.update({
    where: { id: userId },
    data: { isPro: true, proExpiresAt: periodEnd },
  })

  return NextResponse.json({ received: true })
}
