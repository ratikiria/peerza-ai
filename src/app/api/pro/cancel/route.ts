import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"

// POST = cancel at period end
// DELETE = resume (undo cancel)
async function handle(action: "cancel" | "resume") {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const mem = await db.proMembership.findUnique({
    where: { userId: session.user.id },
    select: { stripeSubscriptionId: true, paymentMethod: true },
  })
  if (!mem) return NextResponse.json({ error: "No active membership" }, { status: 404 })
  if (mem.paymentMethod === "CRYPTO") {
    return NextResponse.json(
      { error: "Crypto subscriptions don't auto-renew — nothing to cancel." },
      { status: 400 },
    )
  }
  if (!mem.stripeSubscriptionId) {
    return NextResponse.json({ error: "No Stripe subscription on file" }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })

  await stripe.subscriptions.update(mem.stripeSubscriptionId, {
    cancel_at_period_end: action === "cancel",
  })

  await db.proMembership.update({
    where: { userId: session.user.id },
    data: { cancelAtPeriodEnd: action === "cancel" },
  })

  revalidatePath("/settings")
  revalidatePath("/pro")
  return NextResponse.json({ ok: true })
}

export async function POST()   { return handle("cancel") }
export async function DELETE() { return handle("resume") }
