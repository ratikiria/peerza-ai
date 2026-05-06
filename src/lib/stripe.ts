import Stripe from "stripe"

let cached: Stripe | null = null

// Returns the Stripe SDK instance, or null if no API key is configured.
// Callers should treat null as "feature not available — show a coming-soon".
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === "sk_test_placeholder" || key.startsWith("your-")) return null
  if (!cached) {
    cached = new Stripe(key, { apiVersion: "2025-04-30.basil" as any })
  }
  return cached
}

export function isStripeConfigured(): boolean {
  return !!getStripe()
}

// Map our internal plan id → recurring billing config that Stripe Checkout
// can charge. Pricing comes from src/lib/pro.ts.
export type StripePriceConfig = {
  amount: number   // cents
  interval: "month" | "year"
  intervalCount: number
}

export const STRIPE_PRICE_BY_PLAN: Record<"monthly" | "quarterly" | "yearly", StripePriceConfig> = {
  monthly:   { amount: 1000, interval: "month", intervalCount: 1 },
  quarterly: { amount: 2700, interval: "month", intervalCount: 3 },
  yearly:    { amount: 9900, interval: "year",  intervalCount: 1 },
}
