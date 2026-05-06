import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── GET /api/conversations ────────────────────────────────────────────────────
// List the current user's conversations, newest activity first.
// For 1:1 conversations, returns the OTHER participant as `partner`.
// Group conversations include a list of `participants` (without the current user).

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id

  const myMemberships = await db.conversationParticipant.findMany({
    where: { userId: me },
    select: { conversationId: true, lastReadAt: true },
  })
  const conversationIds = myMemberships.map((m) => m.conversationId)
  if (conversationIds.length === 0) return NextResponse.json([])

  const conversations = await db.conversation.findMany({
    where: { id: { in: conversationIds } },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, type: true, senderId: true, createdAt: true },
      },
    },
  })

  // Compute unread count per conversation: messages newer than my lastReadAt and not authored by me
  const lastReadByConv = new Map(myMemberships.map((m) => [m.conversationId, m.lastReadAt]))

  const result = await Promise.all(conversations.map(async (c) => {
    const lastRead = lastReadByConv.get(c.id) ?? null
    const unreadCount = await db.message.count({
      where: {
        conversationId: c.id,
        NOT: { senderId: me },
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    })
    const otherParticipants = c.participants
      .filter((p) => p.userId !== me)
      .map((p) => p.user)
    const partner = !c.isGroup && otherParticipants.length === 1 ? otherParticipants[0] : null
    return {
      conversationId: c.id,
      isGroup: c.isGroup,
      name: c.name,
      partner,
      participants: otherParticipants,
      lastMessage: c.messages[0] ?? null,
      unreadCount,
      updatedAt: c.updatedAt.toISOString(),
    }
  }))

  return NextResponse.json(result)
}

// ─── POST /api/conversations ───────────────────────────────────────────────────
// Two shapes:
//   { partnerId }                          → create-or-get a 1:1 conversation.
//   { partnerIds: string[], name?: string } → create a NEW group conversation.
// Group conversations are always created fresh (never deduped) so users can
// have multiple groups with overlapping membership.

const oneToOneSchema = z.object({
  partnerId: z.string().min(1),
})
const groupSchema = z.object({
  partnerIds: z.array(z.string().min(1)).min(2).max(50),
  name: z.string().trim().max(80).optional(),
})

const userSelect = {
  id: true, name: true, username: true, image: true, isPremium: true, isPro: true,
} as const

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id

  const body = await req.json().catch(() => null)

  // ── Group creation ───────────────────────────────────────────────────────
  const groupParsed = groupSchema.safeParse(body)
  if (groupParsed.success) {
    const partnerIds = Array.from(new Set(groupParsed.data.partnerIds.filter((id) => id !== me)))
    if (partnerIds.length < 2) {
      return NextResponse.json({ error: "Group needs at least 2 other members" }, { status: 400 })
    }

    // Confirm all referenced users exist (cheap protection against bad ids)
    const found = await db.user.count({ where: { id: { in: partnerIds } } })
    if (found !== partnerIds.length) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 })
    }

    const conv = await db.conversation.create({
      data: {
        isGroup: true,
        name: groupParsed.data.name?.trim() || null,
        participants: {
          create: [{ userId: me }, ...partnerIds.map((id) => ({ userId: id }))],
        },
      },
      include: {
        participants: { include: { user: { select: userSelect } } },
      },
    })

    const otherParticipants = conv.participants.filter((p) => p.userId !== me).map((p) => p.user)
    return NextResponse.json({
      conversationId: conv.id,
      isGroup: true,
      name: conv.name,
      partner: null,
      participants: otherParticipants,
    }, { status: 201 })
  }

  // ── 1:1 creation (or fetch existing) ─────────────────────────────────────
  const oneParsed = oneToOneSchema.safeParse(body)
  if (!oneParsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { partnerId } = oneParsed.data
  if (partnerId === me) return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 })

  const myConvs = await db.conversationParticipant.findMany({
    where: { userId: me },
    select: { conversationId: true },
  })
  const candidateIds = myConvs.map((c) => c.conversationId)

  let conv = candidateIds.length
    ? await db.conversation.findFirst({
        where: {
          id: { in: candidateIds },
          isGroup: false,
          participants: { some: { userId: partnerId } },
        },
        include: { participants: { include: { user: { select: userSelect } } } },
      })
    : null

  if (!conv) {
    conv = await db.conversation.create({
      data: {
        isGroup: false,
        participants: { create: [{ userId: me }, { userId: partnerId }] },
      },
      include: { participants: { include: { user: { select: userSelect } } } },
    })
  }

  const otherParticipants = conv.participants.filter((p) => p.userId !== me).map((p) => p.user)
  const partner = otherParticipants.length === 1 ? otherParticipants[0] : null

  return NextResponse.json({
    conversationId: conv.id,
    isGroup: conv.isGroup,
    name: conv.name,
    partner,
    participants: otherParticipants,
  }, { status: 201 })
}
