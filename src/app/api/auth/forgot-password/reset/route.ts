import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { consume, getClientIp, reset, tooManyRequests } from "@/lib/rate-limit"

const schema = z.object({
  identifier: z.string().min(1).max(120),
  answer: z.string().min(1).max(120),
  newPassword: z.string().min(8).max(200),
})

const WINDOW_MS = 15 * 60 * 1000
const PER_IDENTIFIER_MAX = 5
const PER_IP_MAX = 10

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const ipLimit = consume(`forgot-reset:ip:${ip}`, PER_IP_MAX, WINDOW_MS)
    if (!ipLimit.ok) {
      return tooManyRequests(
        ipLimit.retryAfter,
        "Too many recovery attempts from this network. Please try again later."
      )
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const id = parsed.data.identifier.trim().toLowerCase()
    const idKey = `forgot-reset:id:${id}`
    const idLimit = consume(idKey, PER_IDENTIFIER_MAX, WINDOW_MS)
    if (!idLimit.ok) {
      return tooManyRequests(
        idLimit.retryAfter,
        "Too many recovery attempts for this account. Please try again later."
      )
    }
    const user = await db.user.findFirst({
      where: { OR: [{ email: id }, { username: id }] },
      select: { id: true, securityAnswerHash: true },
    })

    if (!user || !user.securityAnswerHash) {
      return NextResponse.json({ error: "No recoverable account" }, { status: 404 })
    }

    const ok = await bcrypt.compare(
      parsed.data.answer.trim().toLowerCase(),
      user.securityAnswerHash
    )
    if (!ok) {
      return NextResponse.json({ error: "That answer doesn't match." }, { status: 401 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Clear the per-identifier penalty after a legit reset so the user isn't locked out.
    reset(idKey)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[FORGOT RESET]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
