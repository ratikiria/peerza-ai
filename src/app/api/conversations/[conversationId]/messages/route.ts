import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { shouldNotify } from "@/lib/notification-prefs"

// Helper: confirm current user is a participant
async function assertMember(conversationId: string, userId: string) {
  const member = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  })
  return !!member
}

// ─── GET /api/conversations/[conversationId]/messages ──────────────────────────
// Returns last 100 messages, oldest first. Marks them as read for current user
// by bumping ConversationParticipant.lastReadAt.

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id
  const { conversationId } = await params

  if (!(await assertMember(conversationId, me))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      sender: { select: { id: true, name: true, username: true, image: true } },
      poll:   {
        select: {
          id: true,
          question: true,
          options: true,
          authorId: true,
          votes: { select: { userId: true, optionIndex: true } },
        },
      },
    },
  })

  // Look up the OTHER participant's lastReadAt so the sender can render
  // "Seen Xm ago" indicators on their own messages.
  const otherParticipant = await db.conversationParticipant.findFirst({
    where: { conversationId, NOT: { userId: me } },
    select: { lastReadAt: true },
  })

  // Mark as read by bumping lastReadAt to now (so unread count drops to 0)
  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: me } },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json({
    messages,
    partnerLastReadAt: otherParticipant?.lastReadAt ?? null,
  })
}

// ─── POST /api/conversations/[conversationId]/messages ─────────────────────────
// Send a message. Bumps Conversation.updatedAt for sort order; creates a
// notification for each other participant.

const sendSchema = z.object({
  content:   z.string().max(4000).optional(),
  voiceUrl:  z.string().max(2_000_000).optional(),
  mediaUrl:  z.string().max(15_000_000).optional(), // up to ~15MB base64 (handles small video clips)
  mediaMime: z.string().max(100).optional(),
  pollId:    z.string().optional(),
  type:      z.enum(["TEXT", "VOICE", "IMAGE", "VIDEO", "POLL"]).default("TEXT"),
})

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id
  const { conversationId } = await params

  if (!(await assertMember(conversationId, me))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { content, voiceUrl, mediaUrl, mediaMime, pollId, type } = parsed.data
  if (!content && !voiceUrl && !mediaUrl && !pollId) return NextResponse.json({ error: "Empty message" }, { status: 400 })

  // Resolve the OTHER participants for legacy receiverId field + notifications
  const others = await db.conversationParticipant.findMany({
    where: { conversationId, NOT: { userId: me } },
    select: { userId: true },
  })
  if (others.length === 0) return NextResponse.json({ error: "No recipients" }, { status: 400 })
  // 1:1 only for now → first other is the receiver. Group chats not yet enabled.
  const primaryReceiver = others[0].userId

  const [message] = await Promise.all([
    db.message.create({
      data: {
        conversationId,
        content: content ?? null,
        voiceUrl: voiceUrl ?? null,
        mediaUrl: mediaUrl ?? null,
        mediaMime: mediaMime ?? null,
        pollId: pollId ?? null,
        type,
        senderId: me,
        receiverId: primaryReceiver,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, image: true } },
        poll:   {
          select: {
            id: true,
            question: true,
            options: true,
            authorId: true,
            votes: { select: { userId: true, optionIndex: true } },
          },
        },
      },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  // Notifications for every other participant whose prefs allow MESSAGE
  const recipients = await Promise.all(
    others.map(async (p) => ((await shouldNotify(p.userId, "MESSAGE")) ? p.userId : null))
  )
  const filtered = recipients.filter((id): id is string => !!id)
  if (filtered.length > 0) {
    await db.notification.createMany({
      data: filtered.map((userId) => ({
        type: "MESSAGE" as const,
        receiverId: userId,
        triggeredBy: me,
        entityId: message.id,
      })),
    })
  }

  return NextResponse.json(message, { status: 201 })
}
