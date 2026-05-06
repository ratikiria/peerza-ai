import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const usernameSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(20, "Max 20 characters")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, underscores")

const FLAVOR_SUFFIXES = ["fx", "trades", "pro", "live", "hq", "_official", "_real", "x"]

// Generate up to N available alternatives for a taken/invalid username.
async function suggest(base: string, n = 3): Promise<string[]> {
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) || "user"
  const candidates: string[] = []

  for (const suffix of FLAVOR_SUFFIXES) {
    candidates.push(`${cleaned}_${suffix}`.slice(0, 20))
  }
  for (let i = 0; i < 8; i++) {
    candidates.push(`${cleaned}${Math.floor(100 + Math.random() * 9000)}`.slice(0, 20))
  }

  const unique = Array.from(new Set(candidates))
  const taken = await db.user.findMany({
    where: { username: { in: unique } },
    select: { username: true },
  })
  const takenSet = new Set(taken.map((t) => t.username))
  return unique.filter((c) => !takenSet.has(c)).slice(0, n)
}

// GET /api/profile/username?u=desired — live availability check
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const u = new URL(req.url).searchParams.get("u")?.trim().toLowerCase() ?? ""

  // Same as current — treat as available no-op.
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  })
  if (me && u === me.username) {
    return NextResponse.json({ valid: true, available: true, current: true })
  }

  const parsed = usernameSchema.safeParse(u)
  if (!parsed.success) {
    return NextResponse.json({
      valid: false,
      available: false,
      reason: parsed.error.issues[0].message,
      suggestions: await suggest(u || "user"),
    })
  }

  const taken = await db.user.findUnique({ where: { username: u }, select: { id: true } })
  if (taken) {
    return NextResponse.json({
      valid: true,
      available: false,
      suggestions: await suggest(u),
    })
  }

  return NextResponse.json({ valid: true, available: true })
}

// POST /api/profile/username — change current user's username
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { username?: unknown }
  const desired = typeof body.username === "string" ? body.username.trim().toLowerCase() : ""

  const parsed = usernameSchema.safeParse(desired)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  })
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (me.username === desired) {
    return NextResponse.json({ username: desired, unchanged: true })
  }

  const collision = await db.user.findUnique({ where: { username: desired }, select: { id: true } })
  if (collision) {
    return NextResponse.json(
      { error: "Username taken", suggestions: await suggest(desired) },
      { status: 409 },
    )
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { username: desired },
    select: { username: true },
  })

  revalidatePath(`/profile/${me.username}`)
  revalidatePath(`/profile/${updated.username}`)
  revalidatePath("/settings/profile")
  // Blow out the (app) layout cache so Navbar + LeftPanel pick up the new
  // username on the next render of any page in the app shell.
  revalidatePath("/", "layout")

  return NextResponse.json({ username: updated.username })
}
