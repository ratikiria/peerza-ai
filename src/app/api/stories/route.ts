import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createStorySchema = z.object({
  mediaUrl: z.string().min(1).max(1500000),
  caption: z.string().max(200).optional(),
})

// GET /api/stories — active stories from followed users (grouped by author).
// Each author appears once with all their unexpired stories ordered oldest→
// newest so the viewer plays them like Instagram does.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()

  const follows = await db.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  const stories = await db.story.findMany({
    where: {
      expiresAt: { gt: now },
      authorId: { in: followingIds },
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
      views: { where: { viewerId: session.user.id }, select: { id: true } },
      reactions: { where: { userId: session.user.id }, select: { emoji: true } },
      _count: { select: { views: true } },
    },
  })

  // Group by author so each user's stories are bundled.
  const byAuthor = new Map<string, {
    author: typeof stories[number]["author"]
    stories: Array<{
      id: string
      mediaUrl: string
      caption: string | null
      expiresAt: string
      createdAt: string
      viewed: boolean
      viewCount: number
      myReaction: string | null
    }>
    hasUnviewed: boolean
    latestCreatedAt: string
  }>()

  for (const s of stories) {
    const existing = byAuthor.get(s.authorId)
    const item = {
      id: s.id,
      mediaUrl: s.mediaUrl,
      caption: s.caption,
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      viewed: s.views.length > 0,
      viewCount: s._count.views,
      myReaction: s.reactions[0]?.emoji ?? null,
    }
    if (existing) {
      existing.stories.push(item)
      if (!item.viewed) existing.hasUnviewed = true
      if (item.createdAt > existing.latestCreatedAt) existing.latestCreatedAt = item.createdAt
    } else {
      byAuthor.set(s.authorId, {
        author: s.author,
        stories: [item],
        hasUnviewed: !item.viewed,
        latestCreatedAt: item.createdAt,
      })
    }
  }

  // Authors with at least one unviewed story first; within each group, latest
  // activity first so people who posted recently rise to the top.
  const groups = Array.from(byAuthor.values()).sort((a, b) => {
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1
    return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
  })

  return NextResponse.json(groups)
}

// POST /api/stories — upload a new story. Multiple active stories per user are
// allowed; this just appends a new one rather than replacing existing.
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createStorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const story = await db.story.create({
    data: {
      mediaUrl:  parsed.data.mediaUrl,
      caption:   parsed.data.caption ?? null,
      authorId:  session.user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json(story, { status: 201 })
}
