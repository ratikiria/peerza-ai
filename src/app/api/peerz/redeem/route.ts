import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { redeem } from "@/lib/peerz-server"

const schema = z.object({ itemId: z.enum(["pro-week", "aria-5"]) })

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const result = await redeem(session.user.id, parsed.data.itemId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  // Pro changes the badge everywhere, so refresh server-rendered pages.
  if (parsed.data.itemId === "pro-week") revalidatePath("/", "layout")
  return NextResponse.json({ ok: true, balance: result.balance })
}
