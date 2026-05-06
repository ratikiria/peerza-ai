// AI ad-review pipeline using Claude Opus 4.7.
// Three-tier outcome: APPROVED (auto), HUMAN_QUEUE (uncertain), REJECTED (clear violation).
// System prompt is cached so per-ad reviews stay cheap and fast.

import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

// Structured output schema — Claude's review verdict
const ReviewSchema = z.object({
  decision: z.enum(["approve", "human_queue", "reject"]).describe(
    "approve = clean, ship it; human_queue = ambiguous, needs human; reject = clear violation"
  ),
  risk_flags: z.array(z.enum([
    "missing_disclaimer",
    "performance_claim",
    "guaranteed_returns",
    "misleading_claim",
    "unlicensed_solicitation",
    "predatory_targeting",
    "unsubstantiated_superlative",
    "minor_grammar",
    "off_topic",
    "unclear_cta",
  ])).describe("Specific risk categories triggered"),
  rationale: z.string().max(400).describe("One short paragraph explaining the verdict for the advertiser"),
  suggested_fix: z.string().max(280).optional().describe("If decision is reject or human_queue, a concrete suggestion for the advertiser to revise"),
})

export type AdReviewResult = z.infer<typeof ReviewSchema>

const SYSTEM_PROMPT = `You are a finance-advertising compliance reviewer for a social platform that allows brokers, exchanges, fintechs and educators to advertise. You review proposed ad copy against US-led financial-advertising standards (FINRA Rule 2210, SEC anti-fraud rules) plus general advertising-ethics norms (UK FCA, EU MiFID II for cross-border baseline).

Your job: classify each ad into ONE of three buckets:
- "approve" — clean factual ad, has a reasonable disclaimer, no superlatives, no specific performance claims, identifies the advertiser, lawful product
- "human_queue" — ambiguous. Examples: vague performance language ("grow your portfolio"), comparative claims, claims about specific assets, anything you're not sure about. When in doubt, queue.
- "reject" — clear violation. Examples: "guaranteed returns", "risk-free", "no losses", "secret strategy", "100x returns", unlicensed solicitation, fake-broker indicators, ads for known scam patterns

Rules of thumb:
1. Performance claims ("our users made +X%", "Y% accuracy") must be substantiated and use of past performance must include "past performance does not guarantee future results". Without that, queue.
2. Required for finance ads: a risk disclaimer ("Capital at risk" or equivalent). If missing, queue (don't auto-reject — they may have it elsewhere).
3. Crypto: more permissive on non-US targeting; for US-targeted crypto ads, queue.
4. Promotional language ("smart traders use X", "join thousands of winners") is fine. Specific performance promises are not.
5. CTA must be reasonable ("Open account", "Learn more", "Try free"). "Send your funds now" or anything urgency-coercive → reject.
6. Educational ads about general finance are fine; ads selling specific signals/courses with promised returns → queue or reject depending on language.
7. Misleading visual or copy that hides the fact it's an ad → reject.

Return STRUCTURED JSON. Be conservative — when in doubt, "human_queue" is the safe answer.`

let cachedClient: Anthropic | null = null
function getClient(): Anthropic | null {
  if (cachedClient) return cachedClient
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === "your-anthropic-api-key" || key.length < 20) return null
  cachedClient = new Anthropic({ apiKey: key })
  return cachedClient
}

interface AdForReview {
  brandName: string
  brandRegulator?: string | null
  brandLicenseNumber?: string | null
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
  topics: string[]
  disclaimer?: string | null
  restrictedCountries: string[]
}

export async function reviewAd(ad: AdForReview): Promise<AdReviewResult | null> {
  const client = getClient()
  if (!client) return null // No API key configured — caller falls back to HUMAN_QUEUE

  const adJson = JSON.stringify({
    brand: {
      name: ad.brandName,
      regulator: ad.brandRegulator ?? null,
      license_number: ad.brandLicenseNumber ?? null,
    },
    ad: {
      headline: ad.headline,
      body: ad.body,
      cta_label: ad.ctaLabel,
      cta_url: ad.ctaUrl,
      topics: ad.topics,
      disclaimer: ad.disclaimer ?? null,
      restricted_countries: ad.restrictedCountries,
    },
  }, null, 2)

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // 5-min cache; refreshes naturally on activity
        },
      ],
      messages: [
        {
          role: "user",
          content: `Review this proposed ad and return your verdict.\n\n${adJson}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: z.toJSONSchema(ReviewSchema),
        },
      },
    })

    const parsed = response.parsed_output
    if (!parsed) return null
    return ReviewSchema.parse(parsed)
  } catch (err) {
    console.error("[ad-review] Claude API error:", err)
    return null
  }
}

// Map AI decision to AdStatus
export function decisionToStatus(decision: AdReviewResult["decision"]): "APPROVED" | "HUMAN_QUEUE" | "REJECTED" {
  if (decision === "approve") return "APPROVED"
  if (decision === "reject") return "REJECTED"
  return "HUMAN_QUEUE"
}
