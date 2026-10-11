import { ImageResponse } from "next/og"
import { inviterFor } from "@/lib/genesis"
import { formatMemberNo, numberTier, tierLabel, GENESIS_LIMIT, PIONEER_LIMIT } from "@/lib/peerz"

// Share card for an invite link. ?format=story → 1080×1920 (Instagram/Telegram
// stories), anything else → 1200×630 (link previews on X, Telegram, iMessage).

function Moon({ size }: { size: number }) {
  const c = (l: number, t: number, d: number, a: number) => (
    <div style={{
      position: "absolute", left: size * l, top: size * t, width: size * d, height: size * d,
      borderRadius: 9999, background: `rgba(146,64,14,${a})`,
    }} />
  )
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <div style={{
        position: "absolute", left: -size * 0.35, top: -size * 0.35, width: size * 1.7, height: size * 1.7,
        borderRadius: 9999, background: "radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0) 65%)",
      }} />
      <div style={{
        display: "flex", position: "relative", width: size, height: size, borderRadius: 9999,
        background: "radial-gradient(circle at 34% 28%, #fff4c4 0%, #fcd34d 24%, #f59e0b 62%, #a8540c 100%)",
        border: `${Math.round(size * 0.016)}px solid rgba(120,53,15,0.6)`,
      }}>
        {c(0.18, 0.19, 0.24, 0.34)}
        {c(0.6, 0.28, 0.14, 0.3)}
        {c(0.46, 0.62, 0.18, 0.3)}
        {c(0.24, 0.63, 0.09, 0.28)}
        {c(0.74, 0.59, 0.08, 0.26)}
      </div>
    </div>
  )
}

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const story = new URL(req.url).searchParams.get("format") === "story"
  const who = await inviterFor(code.replace(/[^a-z0-9]/gi, "").slice(0, 16))

  const tier = numberTier(who?.number)
  const big = who?.number != null && tier ? formatMemberNo(who.number) : "GENESIS"
  const eyebrow = tier ? tierLabel(tier)!.toUpperCase() : "PEERZA"
  const handle = who?.username ? `@${who.username}` : null
  const line = tier === "pioneer"
    ? `One of the first ${PIONEER_LIMIT.toLocaleString("en-US")} traders on Peerza`
    : `One of the first ${GENESIS_LIMIT.toLocaleString("en-US")} traders on Peerza`
  const link = `peerza.ai/g/${code}`

  const bg = {
    backgroundColor: "#070b12",
    backgroundImage: "linear-gradient(rgba(148,190,220,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,190,220,0.07) 1px, transparent 1px)",
    backgroundSize: story ? "72px 72px" : "48px 48px",
    color: "#e8f1f8",
  }

  if (story) {
    return new ImageResponse(
      (
        <div style={{ ...bg, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "130px 96px 112px" }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>peerza</div>
          <div style={{ display: "flex", marginTop: 170 }}><Moon size={500} /></div>
          <div style={{ display: "flex", marginTop: 120, fontSize: 32, letterSpacing: 18, color: "#fbbf24" }}>{eyebrow}</div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 210, fontWeight: 800, color: "#fcd34d", letterSpacing: -6 }}>{big}</div>
          {handle && <div style={{ display: "flex", marginTop: 20, fontSize: 46, fontWeight: 700 }}>{handle}</div>}
          <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: "#a3b1c2" }}>{line}</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "36px 44px",
            borderRadius: 36, background: "rgba(251,191,36,0.1)", border: "2px solid rgba(251,191,36,0.4)",
          }}>
            <div style={{ display: "flex", fontSize: 32, color: "#a3b1c2" }}>Claim your number before launch</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 46, fontWeight: 700, color: "#fde68a" }}>{link}</div>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, headers: { "Cache-Control": "public, max-age=300" } },
    )
  }

  return new ImageResponse(
    (
      <div style={{ ...bg, width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 90px", gap: 80 }}>
        <Moon size={340} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 12, color: "#fbbf24" }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 800, color: "#fcd34d", letterSpacing: -4 }}>{big}</div>
          {handle && <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{handle}</div>}
          <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: "#a3b1c2" }}>{line}</div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 32, fontWeight: 700, color: "#fde68a" }}>Claim yours → {link}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=300" } },
  )
}
