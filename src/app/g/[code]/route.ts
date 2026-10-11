import { NextResponse } from "next/server"
import { baseUrlFrom } from "@/lib/genesis-cookie"

// Short invite link: peerza.ai/g/<code> → the waitlist page with the referral.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const safe = code.replace(/[^a-z0-9]/gi, "").slice(0, 16)
  return NextResponse.redirect(`${baseUrlFrom(req)}/genesis?ref=${safe}`)
}
