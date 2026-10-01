// Visual themes for portfolios (switcher cards, hero header). Stored on
// Portfolio.color as the key; unknown keys fall back to emerald.

export const PORTFOLIO_THEMES = {
  emerald: { name: "Emerald", from: "#2ee6a8", to: "#22c3ee" },
  violet:  { name: "Violet",  from: "#a78bfa", to: "#6366f1" },
  amber:   { name: "Amber",   from: "#fbbf24", to: "#f97316" },
  rose:    { name: "Rose",    from: "#fb7185", to: "#e11d48" },
  sky:     { name: "Sky",     from: "#38bdf8", to: "#3b82f6" },
  lime:    { name: "Lime",    from: "#a3e635", to: "#16a34a" },
} as const

export type PortfolioThemeKey = keyof typeof PORTFOLIO_THEMES

export const PORTFOLIO_EMOJIS = ["💼", "🚀", "🏦", "🌱", "💎", "🪙", "📈", "🛡️", "🎯", "🌍", "⚡", "🏖️"] as const

export const MAX_PORTFOLIOS = 10

export function themeFor(key: string | null | undefined) {
  return PORTFOLIO_THEMES[(key ?? "") as PortfolioThemeKey] ?? PORTFOLIO_THEMES.emerald
}

export function isThemeKey(v: unknown): v is PortfolioThemeKey {
  return typeof v === "string" && v in PORTFOLIO_THEMES
}
