import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface RawMsg { role?: string; content?: string }

// GET /api/ai-tutor/sessions — list current user's recent sessions.
// Returns a preview (first user message, last update) — full transcript on detail endpoint.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.aISession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, messages: true, createdAt: true, updatedAt: true },
  })

  const sessions = rows.map((r) => {
    const msgs = (Array.isArray(r.messages) ? r.messages : []) as RawMsg[]
    const firstUser = msgs.find((m) => m.role === "user")
    const title = (firstUser?.content ?? "New conversation").slice(0, 80)
    return {
      id: r.id,
      title,
      messageCount: msgs.length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  })

  return NextResponse.json({ sessions })
}

// POST /api/ai-tutor/sessions — create a fresh empty session.
// (The chat endpoint also creates one when sessionId is omitted; this is for
// "New conversation" buttons that want a session ID upfront.)
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const created = await db.aISession.create({
    data: { userId: session.user.id, messages: [] },
  })
  return NextResponse.json({ id: created.id })
}
