import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""

  if (q.length < 1) {
    return NextResponse.json({ users: [], posts: [], challenges: [] })
  }

  const me = session.user.id
  const tickerLike = q.replace(/^\$/, "").toUpperCase()

  const [users, postsByContent, postsByTicker, challenges] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
        NOT: { id: me },
      },
      take: 6,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        isPro: true,
      },
    }),
    db.post.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { username: true, name: true, image: true } },
      },
    }),
    tickerLike.length >= 1 && tickerLike.length <= 10
      ? db.post.findMany({
          where: { analysis: { path: ["ticker"], equals: tickerLike } },
          take: 4,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            analysis: true,
            author: { select: { username: true, name: true, image: true } },
          },
        })
      : Promise.resolve([]),
    db.challenge.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          { type: { in: ["PUBLIC", "PASSWORD_PROTECTED"] } },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        style: true,
        status: true,
        _count: { select: { participants: true } },
      },
    }),
  ])

  const seen = new Set<string>()
  const posts = [...postsByTicker, ...postsByContent]
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      content: p.content.slice(0, 140),
      createdAt: p.createdAt,
      author: p.author,
      ticker: (p as any).analysis?.ticker ?? null,
    }))

  return NextResponse.json({ users, posts, challenges })
}
