import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendEmail, verifyEmailEmail } from "@/lib/email"
import { consume, getClientIp, tooManyRequests } from "@/lib/rate-limit"

const RESEND_MAX = 3
const RESEND_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const ip = getClientIp(req)
  const limit = consume(`verify-resend:${session.user.id}:${ip}`, RESEND_MAX, RESEND_WINDOW_MS)
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, "Try again later.")
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true })
  }

  await db.emailVerificationToken.deleteMany({ where: { userId: user.id } })

  const token = randomBytes(32).toString("hex")
  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host") || "peerza.ai"}`
  const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`
  const result = await sendEmail({ to: user.email, ...verifyEmailEmail(user.name, verifyUrl) })

  if (!result.ok) {
    return NextResponse.json({ error: "Could not send email — try again later" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
