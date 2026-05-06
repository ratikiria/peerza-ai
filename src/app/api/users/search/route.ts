import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 1) return NextResponse.json([])

  const users = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
      NOT: { id: session.user.id },
    },
    take: 20,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      isPremium: true, isPro: true,
      followers: {
        where: { followerId: session.user.id },
        select: { id: true },
      },
    },
  })

  const results = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    image: u.image,
    bio: u.bio,
    isPremium: u.isPremium,
    isFollowing: u.followers.length > 0,
  }))

  return NextResponse.json(results)
}
