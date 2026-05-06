import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// Dev-only: grant 30 days of Pro to the current user. Lets us iterate on the
// badge UI without setting up Stripe test mode locally. Hard-blocked in prod.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  await db.proMembership.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      paymentMethod: "CARD",
      priceUSD: 10,
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { isPro: true, proExpiresAt: periodEnd },
  })

  revalidatePath("/", "layout")
  return NextResponse.json({ ok: true, expiresAt: periodEnd })
}

// DELETE = revoke for testing the "free tier" UI
export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.user.update({
    where: { id: session.user.id },
    data: { isPro: false, proExpiresAt: null },
  })
  await db.proMembership.deleteMany({ where: { userId: session.user.id } })

  revalidatePath("/", "layout")
  return NextResponse.json({ ok: true })
}
