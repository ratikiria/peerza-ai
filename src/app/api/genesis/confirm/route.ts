import { NextResponse } from "next/server"
import { confirmWaitlist } from "@/lib/genesis"
import { GENESIS_COOKIE, baseUrlFrom } from "@/lib/genesis-cookie"

// Link from the confirmation email: take a number, then show their page.
export async function GET(req: Request) {
  const base = baseUrlFrom(req)
  const token = new URL(req.url).searchParams.get("token")
  const manage = token ? await confirmWaitlist(token, base) : null
  if (!manage) return NextResponse.redirect(`${base}/genesis?error=link`)

  const res = NextResponse.redirect(`${base}/genesis/me`)
  res.cookies.set(GENESIS_COOKIE, manage, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: 365 * 86_400,
  })
  return res
}
