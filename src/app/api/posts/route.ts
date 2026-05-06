import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkOutcomesForPosts } from "@/lib/outcomes"

const analysisSchema = z.object({
  ticker:      z.string().min(1).max(20),
  direction:   z.enum(["bullish", "bearish", "neutral"]),
  timeframe:   z.enum(["1H", "4H", "1D", "1W", "1M"]),
  entry:       z.string().optional(),
  target:      z.string().optional(),
  conviction:  z.number().int().min(1).max(5).optional(),
  catalyst:    z.enum(["technical", "fundamental", "news", "macro", "sentiment"]).optional(),
  position:    z.enum(["holding", "watching", "entered", "exited", "paper"]).optional(),
  logoUrl:     z.string().url().max(2000).optional(),
  priceKey:    z.string().max(50).optional(),
  priceSource: z.enum(["crypto", "stooq"]).optional(),
}).optional()

const TOPIC_VALUES = ["crypto", "stocks", "forex", "options"] as const

const createPostSchema = z.object({
  content:        z.string().max(1000),
  imageUrl:       z.string().max(2000000).optional(), // accepts base64 data URLs and external URLs
  videoUrl:       z.string().max(30_000_000).optional(), // up to ~22MB raw, ~30MB base64-encoded
  videoMime:      z.string().max(80).optional(),
  pollId:         z.string().optional(),
  analysis:       analysisSchema,
  topics:         z.array(z.enum(TOPIC_VALUES)).max(4).optional(),
  originalPostId: z.string().optional(),
  tickerOnly:     z.boolean().optional(),
}).refine((d) => d.content.trim().length > 0 || !!d.originalPostId || !!d.pollId, {
  message: "Content required",
  path: ["content"],
}).refine((d) => !d.tickerOnly || !!d.analysis?.ticker, {
  message: "Ticker-only posts require an analysis with a ticker",
  path: ["tickerOnly"],
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const ticker = searchParams.get("ticker")?.trim().toUpperCase() || null
  const topicsParam = searchParams.get("topics")?.trim() || null
  const topics = topicsParam
    ? topicsParam.split(",").map((t) => t.trim().toLowerCase()).filter((t) => TOPIC_VALUES.includes(t as any))
    : []
  const limit = 20

  // Ticker mode: show all posts about that ticker (community-wide).
  // Default mode: show your own + followed users' posts, excluding posts the
  // author scoped to a ticker community panel only.
  let where: any
  if (ticker) {
    where = { analysis: { path: ["ticker"], equals: ticker } }
  } else {
    const following = await db.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    })
    const followingIds = following.map((f: { followingId: string }) => f.followingId)
    where = {
      authorId: { in: [...followingIds, session.user.id] },
      tickerOnly: false,
    }
  }
  // Topic filter (only applied when 1-3 selected; 4=all means no filter, 0=all means no filter)
  if (topics.length > 0 && topics.length < TOPIC_VALUES.length) {
    where = { ...where, topics: { hasSome: topics } }
  }

  const posts = await db.post.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
      },
      likes: { select: { userId: true, reaction: true } },
      _count: { select: { comments: true, likes: true } },
      originalPost: {
        include: {
          author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
        },
      },
      poll: {
        select: {
          id: true, question: true, options: true, authorId: true,
          votes: { select: { userId: true, optionIndex: true } },
        },
      },
    },
  })

  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, -1) : posts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  // Lazy outcome check: stamp TARGET_HIT on any open Trade Idea whose price
  // has reached its target. Bounded work — only the items in this response,
  // each rate-limited to one check every 5 minutes.
  try {
    const url = new URL(req.url)
    const baseUrl = url.origin
    const cookieHeader = req.headers.get("cookie") || ""
    await checkOutcomesForPosts(items as any, baseUrl, cookieHeader)
  } catch {
    // Outcome checks are best-effort — never block the feed
  }

  return NextResponse.json({ posts: items, nextCursor })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createPostSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  // If reposting, validate the original exists and is not itself a repost (prevent chains)
  let originalPostId: string | undefined
  if (parsed.data.originalPostId) {
    const original = await db.post.findUnique({
      where: { id: parsed.data.originalPostId },
      select: { id: true, originalPostId: true },
    })
    if (!original) return NextResponse.json({ error: "Original post not found" }, { status: 400 })
    // Flatten: if reposting a repost, point to the root original
    originalPostId = original.originalPostId ?? original.id
  }

  const post = await db.post.create({
    data: {
      content:        parsed.data.content,
      imageUrl:       parsed.data.imageUrl,
      videoUrl:       parsed.data.videoUrl ?? null,
      videoMime:      parsed.data.videoMime ?? null,
      pollId:         parsed.data.pollId ?? null,
      analysis:       parsed.data.analysis ?? undefined,
      topics:         parsed.data.topics ?? [],
      tickerOnly:     parsed.data.tickerOnly ?? false,
      authorId:       session.user.id,
      originalPostId: originalPostId ?? null,
    },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
      },
      _count: { select: { comments: true, likes: true } },
      originalPost: {
        include: {
          author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true } },
        },
      },
      poll: {
        select: {
          id: true, question: true, options: true, authorId: true,
          votes: { select: { userId: true, optionIndex: true } },
        },
      },
    },
  })

  return NextResponse.json(post, { status: 201 })
}
