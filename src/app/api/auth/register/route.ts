import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { isValidSecurityQuestion } from "@/lib/security-questions"
import { consume, getClientIp, tooManyRequests } from "@/lib/rate-limit"

const MIN_AGE_YEARS = 13
const REGISTER_MAX = 5
const REGISTER_WINDOW_MS = 15 * 60 * 1000

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8),
  interests: z.array(z.string()).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .refine((s) => {
      const d = new Date(s)
      return !Number.isNaN(d.getTime())
    }, "Invalid date"),
  securityQuestion: z.string().refine(isValidSecurityQuestion, "Invalid security question"),
  securityAnswer: z.string().min(2).max(120),
})

function ageInYears(birth: Date, now = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const limit = consume(`register:${ip}`, REGISTER_MAX, REGISTER_WINDOW_MS)
    if (!limit.ok) {
      return tooManyRequests(
        limit.retryAfter,
        "Too many sign-up attempts from this network. Please try again later."
      )
    }

    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, username, email, password, interests, birthDate, securityQuestion, securityAnswer } = parsed.data

    const dob = new Date(birthDate)
    if (ageInYears(dob) < MIN_AGE_YEARS) {
      return NextResponse.json(
        { error: `You must be at least ${MIN_AGE_YEARS} years old` },
        { status: 400 }
      )
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existing) {
      const field = existing.email === email ? "email" : "username"
      return NextResponse.json(
        { error: `This ${field} is already taken` },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 12)

    const user = await db.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        interests: interests ?? [],
        birthDate: dob,
        securityQuestion,
        securityAnswerHash,
      },
      select: { id: true, email: true, username: true, name: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error("[REGISTER ERROR]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
