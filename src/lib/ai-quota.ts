import { db } from "@/lib/db"

// Free 5/day, Pro 15/day, AI Tutor Premium unlimited.
// Pro tier matches the marketing copy on /pro ("3× the daily questions").
const QUOTA_FREE = 5
const QUOTA_PRO = 15

export type QuotaTier = "free" | "pro" | "premium"

export interface QuotaStatus {
  tier: QuotaTier
  used: number
  limit: number | null   // null = unlimited
  remaining: number | null
  resetAt: Date          // when the daily counter rolls over
}

function nextReset(from: Date = new Date()): Date {
  // Reset at the next midnight UTC. Simple, predictable, no per-user TZ math.
  const d = new Date(from)
  d.setUTCHours(24, 0, 0, 0)
  return d
}

async function readUserAndPlan(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isPro: true,
      aiQuestionsToday: true,
      aiQuotaResetAt: true,
      subscription: {
        select: { status: true, endDate: true },
      },
    },
  })
  if (!user) throw new Error("User not found")

  const hasPremium =
    user.subscription?.status === "ACTIVE" &&
    user.subscription.endDate > new Date()

  const tier: QuotaTier = hasPremium ? "premium" : user.isPro ? "pro" : "free"
  return { user, tier }
}

function limitFor(tier: QuotaTier): number | null {
  if (tier === "premium") return null
  if (tier === "pro") return QUOTA_PRO
  return QUOTA_FREE
}

export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  const { user, tier } = await readUserAndPlan(userId)
  const now = new Date()

  // If reset window has passed, treat counter as 0 for display.
  const reset = user.aiQuotaResetAt ?? nextReset(now)
  const expired = reset <= now
  const used = expired ? 0 : user.aiQuestionsToday
  const limit = limitFor(tier)

  return {
    tier,
    used,
    limit,
    remaining: limit == null ? null : Math.max(0, limit - used),
    resetAt: expired ? nextReset(now) : reset,
  }
}

// Atomic-ish "check + increment". We do an optimistic read, then write.
// Concurrency is fine for this use case — at worst a user briefly exceeds the
// quota by 1–2 if they hammer the endpoint. Keeping the implementation simple.
export async function checkAndIncrementQuota(
  userId: string,
): Promise<{ ok: true; status: QuotaStatus } | { ok: false; status: QuotaStatus; reason: string }> {
  const { user, tier } = await readUserAndPlan(userId)
  const now = new Date()

  const limit = limitFor(tier)

  // Reset window expired? Roll the counter back to 0 atomically.
  const currentReset = user.aiQuotaResetAt ?? nextReset(now)
  let used = user.aiQuestionsToday
  let resetAt = currentReset
  if (currentReset <= now) {
    used = 0
    resetAt = nextReset(now)
  }

  if (limit != null && used >= limit) {
    return {
      ok: false,
      reason: tier === "free"
        ? "Free plan: 5 questions per day. Upgrade to Pro for 15/day or Premium for unlimited."
        : tier === "pro"
        ? "Pro plan: 15 questions per day. Upgrade to AI Tutor Premium for unlimited."
        : "Daily quota reached.",
      status: { tier, used, limit, remaining: 0, resetAt },
    }
  }

  const next = used + 1
  await db.user.update({
    where: { id: userId },
    data: { aiQuestionsToday: next, aiQuotaResetAt: resetAt },
  })

  return {
    ok: true,
    status: {
      tier,
      used: next,
      limit,
      remaining: limit == null ? null : Math.max(0, limit - next),
      resetAt,
    },
  }
}
