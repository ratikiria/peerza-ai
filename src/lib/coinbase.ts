import crypto from "node:crypto"

const COINBASE_API = "https://api.commerce.coinbase.com"

export function isCoinbaseConfigured(): boolean {
  const key = process.env.COINBASE_COMMERCE_API_KEY
  return !!key && !key.startsWith("your-") && key !== "placeholder"
}

interface CreateChargeInput {
  name: string
  description: string
  priceUSD: number
  metadata: Record<string, string>
  redirectUrl: string
  cancelUrl: string
}

// Returns { id, hostedUrl } for a fresh hosted-checkout charge.
export async function createCoinbaseCharge(input: CreateChargeInput) {
  const key = process.env.COINBASE_COMMERCE_API_KEY
  if (!key) throw new Error("COINBASE_COMMERCE_API_KEY not set")

  const res = await fetch(`${COINBASE_API}/charges`, {
    method: "POST",
    headers: {
      "Content-Type":     "application/json",
      "X-CC-Api-Key":     key,
      "X-CC-Version":     "2018-03-22",
    },
    body: JSON.stringify({
      name:        input.name,
      description: input.description,
      pricing_type: "fixed_price",
      local_price: { amount: input.priceUSD.toFixed(2), currency: "USD" },
      metadata:    input.metadata,
      redirect_url: input.redirectUrl,
      cancel_url:   input.cancelUrl,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Coinbase API error ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = await res.json() as { data: { id: string; hosted_url: string; code: string } }
  return { id: json.data.id, hostedUrl: json.data.hosted_url, code: json.data.code }
}

// Coinbase Commerce signs webhooks with HMAC-SHA256 over the raw body.
// Header: X-CC-Webhook-Signature
export function verifyCoinbaseSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  // timingSafeEqual requires equal-length buffers
  if (computed.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(signature, "hex"))
}
