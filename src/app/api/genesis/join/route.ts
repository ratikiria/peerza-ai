import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { joinWaitlist, isUsernameReserved, USERNAME_RE } from "@/lib/genesis"
import { baseUrlFrom } from "@/lib/genesis-cookie"
import { LOCALE_COOKIE } from "@/lib/locale"
import { db } from "@/lib/db"
import { consume, getClientIp, tooManyRequests } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  username: z.string().trim().toLowerCase().max(31).optional(),
  ref: z.string().max(16).optional().nullable(),
})

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const limit = consume(`genesis-join:${ip}`, 8, 15 * 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "Too many sign-ups from this network. Try again later.")

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  const { email, ref } = parsed.data
  const username = parsed.data.username?.replace(/^@/, "") || null

  if (username) {
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: "Usernames are 3–30 letters, numbers or _" }, { status: 400 })
    }
    const taken = await db.user.findUnique({ where: { username }, select: { id: true } })
    if (taken || (await isUsernameReserved(username, email))) {
      return NextResponse.json({ error: `@${username} is already taken` }, { status: 409 })
    }
  }

  const locale = (await cookies()).get(LOCALE_COOKIE)?.value ?? null
  const status = await joinWaitlist({ email, username, ref, locale, ip, baseUrl: baseUrlFrom(req) })
  if (status === "disposable") {
    return NextResponse.json({ error: "Please use a permanent email address" }, { status: 400 })
  }
  return NextResponse.json({ status })
}
