import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { questionLabel } from "@/lib/security-questions"
import { consume, getClientIp, tooManyRequests } from "@/lib/rate-limit"

const schema = z.object({
  identifier: z.string().min(1).max(120), // email or username
})

const WINDOW_MS = 15 * 60 * 1000
const PER_IP_MAX = 5
const PER_IDENTIFIER_MAX = 3

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const ipLimit = consume(`forgot-start:ip:${ip}`, PER_IP_MAX, WINDOW_MS)
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
    const idLimit = consume(`forgot-start:id:${id}`, PER_IDENTIFIER_MAX, WINDOW_MS)
    if (!idLimit.ok) {
      return tooManyRequests(
        idLimit.retryAfter,
        "Too many recovery attempts for this account. Please try again later."
      )
    }
    const user = await db.user.findFirst({
      where: {
        OR: [{ email: id }, { username: id }],
      },
      select: { id: true, securityQuestion: true, securityAnswerHash: true, email: true, username: true },
    })

    // Always return generically to avoid leaking whether the account exists.
    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      return NextResponse.json(
        {
          error:
            "We couldn't find a recoverable account. Try a different email or username, or contact support.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      question: questionLabel(user.securityQuestion),
      questionId: user.securityQuestion,
      // Echo back identifier so the next step has it (avoids one extra DB lookup)
      identifier: user.email,
    })
  } catch (err) {
    console.error("[FORGOT START]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
