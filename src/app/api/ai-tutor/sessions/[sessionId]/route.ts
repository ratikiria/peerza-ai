import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface RawMsg { role?: string; content?: string }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { sessionId } = await params

  const row = await db.aISession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true, messages: true, createdAt: true, updatedAt: true },
  })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const msgs = (Array.isArray(row.messages) ? row.messages : []) as RawMsg[]
  const cleaned = msgs
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }))

  return NextResponse.json({
    id: row.id,
    messages: cleaned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { sessionId } = await params

  const result = await db.aISession.deleteMany({
    where: { id: sessionId, userId: session.user.id },
  })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
