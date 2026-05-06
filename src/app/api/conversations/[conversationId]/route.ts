import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/conversations/[conversationId] — fetch single conversation with members
export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id
  const { conversationId } = await params

  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } } },
      },
    },
  })

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!conv.participants.some((p) => p.userId === me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const otherParticipants = conv.participants.filter((p) => p.userId !== me).map((p) => p.user)
  const partner = !conv.isGroup && otherParticipants.length === 1 ? otherParticipants[0] : null

  return NextResponse.json({
    conversationId: conv.id,
    isGroup: conv.isGroup,
    name: conv.name,
    partner,
    participants: otherParticipants,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  })
}
