// Client-safe constants and helpers for the real-portfolio feature.
// Server-only helpers (DB access, Yahoo lookups) live in `portfolio-server.ts`
// so the client bundle doesn't pull in Prisma.

export type AssetType = "stock" | "crypto" | "etf" | "bond" | "cash"

export const ASSET_TYPES: AssetType[] = ["stock", "crypto", "etf", "bond", "cash"]

// Annualised volatility used for the portfolio-level σ estimate. These are
// rough class averages — we disclose this simplification in the UI. Real
// Markowitz needs covariance which is out of scope for v1.
export const CLASS_VOL: Record<AssetType, number> = {
  cash:   0.001, // ~0%
  bond:   0.05,  // ~5%
  etf:    0.14,  // ~14% — broad-market default
  stock:  0.20,  // ~20% — single-name default
  crypto: 0.70,  // ~70%
}

// Risk-band thresholds applied to the *risky* weight (stocks + crypto + risky ETFs).
// Bands match how robo-advisors typically describe portfolios.
export function riskBand(riskyWeight: number): "Conservative" | "Balanced" | "Aggressive" | "Speculative" {
  if (riskyWeight < 0.30) return "Conservative"
  if (riskyWeight < 0.65) return "Balanced"
  if (riskyWeight < 0.85) return "Aggressive"
  return "Speculative"
}
