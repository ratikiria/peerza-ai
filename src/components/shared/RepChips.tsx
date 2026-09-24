import { ink } from "@/lib/ink"
import { STYLE_META, TIER_META, type RankTier, type TraderStyle } from "@/lib/ranked"

// Rank + trader-style chips shown next to an author's name. Rookies (fewer
// than 10 resolved ranked calls) show only their style, if they have one.
export default function RepChips({ tier, style, size = "sm" }: {
  tier?: string | null
  style?: string | null
  size?: "sm" | "md"
}) {
  const t = tier && tier in TIER_META && tier !== "rookie" ? TIER_META[tier as RankTier] : null
  const s = style && style in STYLE_META ? STYLE_META[style as TraderStyle] : null
  if (!t && !s) return null
  const pad = size === "md" ? "text-[11px] px-2 py-0.5" : "text-[9px] px-1.5 py-px"
  return (
    <>
      {t && (
        <span className={`${pad} font-extrabold uppercase tracking-wide rounded-full`}
          style={{ background: t.color + "26", color: ink(t.color) }} title={`${t.name} on ranked calls`}>
          {t.name}
        </span>
      )}
      {s && (
        <span className={`${pad} font-bold rounded-full`}
          style={{ border: `1px solid ${s.color}66`, color: ink(s.color) }} title="Trading style from ranked-call deadlines">
          {s.name}
        </span>
      )}
    </>
  )
}
