// User.isPro was only ever switched off by Stripe webhooks, so Pro paid with
// crypto or redeemed with Peerz never ended. This sweep ends Pro once
// proExpiresAt has passed. Active Stripe subscriptions are left to the webhook,
// which moves proExpiresAt forward on each renewal.

import { db } from "@/lib/db"

// Small grace so a renewal webhook that lands a little late doesn't flicker Pro off.
const GRACE_MS = 60 * 60_000

export async function expireLapsedPro(now = new Date()): Promise<number> {
  const res = await db.user.updateMany({
    where: {
      isPro: true,
      proExpiresAt: { lt: new Date(now.getTime() - GRACE_MS) },
      OR: [
        { proMembership: { is: null } },
        { proMembership: { is: { stripeSubscriptionId: null } } },
        { proMembership: { is: { status: { not: "ACTIVE" } } } },
      ],
    },
    data: { isPro: false },
  })
  return res.count
}

/** Start the sweep loop. Idempotent across hot reloads. */
export function startProExpirySync(intervalMs = 10 * 60_000) {
  const g = globalThis as unknown as { __proExpiry?: ReturnType<typeof setInterval> }
  if (g.__proExpiry) return
  const tick = () => { expireLapsedPro().catch((err) => console.error("[pro] expiry sweep failed", err)) }
  g.__proExpiry = setInterval(tick, intervalMs)
  setTimeout(tick, 20_000) // first pass shortly after boot
}
