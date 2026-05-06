// Pro membership pricing + plan helpers. Single source of truth — both the
// /pro page and the checkout APIs read from this.

export type ProPlanId = "monthly" | "quarterly" | "yearly"

export interface ProPlan {
  id: ProPlanId
  label: string
  priceUSD: number       // Total charge for the cycle
  monthlyEquivalent: number
  cycle: "MONTHLY" | "QUARTERLY" | "YEARLY"
  months: number
  savePct?: number       // % saved vs monthly
}

export const PRO_PLANS: Record<ProPlanId, ProPlan> = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    priceUSD: 10,
    monthlyEquivalent: 10,
    cycle: "MONTHLY",
    months: 1,
  },
  quarterly: {
    id: "quarterly",
    label: "3 months",
    priceUSD: 27,
    monthlyEquivalent: 9,
    cycle: "QUARTERLY",
    months: 3,
    savePct: 10,
  },
  yearly: {
    id: "yearly",
    label: "1 year",
    priceUSD: 99,
    monthlyEquivalent: 8.25,
    cycle: "YEARLY",
    months: 12,
    savePct: 17,
  },
}

export const PRO_FEATURES = [
  { icon: "★", title: "Pro badge", body: "Emerald star next to your name everywhere on Peerza.ai" },
  { icon: "🎨", title: "Profile themes", body: "Custom username color and accent — coming soon" },
  { icon: "📝", title: "Longer posts", body: "Up to 2,000 characters per post (vs. 1,000 free)" },
  { icon: "🤖", title: "Higher AI Tutor quota", body: "When AI Tutor ships, Pro members get 3× the daily questions" },
  { icon: "📊", title: "Pro analytics", body: "Detailed views/engagement breakdown on your posts" },
  { icon: "💬", title: "Priority support", body: "Direct line to our team for issues and feature requests" },
]

export function planFromCycle(cycle: "MONTHLY" | "QUARTERLY" | "YEARLY"): ProPlan {
  if (cycle === "MONTHLY")  return PRO_PLANS.monthly
  if (cycle === "QUARTERLY") return PRO_PLANS.quarterly
  return PRO_PLANS.yearly
}

export function periodEndFromNow(cycle: "MONTHLY" | "QUARTERLY" | "YEARLY"): Date {
  const months = cycle === "MONTHLY" ? 1 : cycle === "QUARTERLY" ? 3 : 12
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}
