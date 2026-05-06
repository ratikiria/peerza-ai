import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const linksSchema = z.object({
  twitter:   z.string().max(120).optional(),
  linkedin:  z.string().max(200).optional(),
  youtube:   z.string().max(200).optional(),
  instagram: z.string().max(120).optional(),
  facebook:  z.string().max(200).optional(),
  website:   z.string().max(300).optional(),
}).strict().optional()

const profileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  bio: z.string().max(200).optional(),
  image: z.string().max(600000).optional().or(z.literal("")),
  coverImage: z.string().max(2_000_000).optional().or(z.literal("")),
  interests: z.array(z.string().max(30)).max(10).optional(),
  showTrackRecord: z.boolean().optional(),
  hideFollowList: z.boolean().optional(),
  country: z.string().length(2).nullable().optional(),
  links: linksSchema,
})

// GET /api/profile — get current user's profile
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, username: true, bio: true, image: true, coverImage: true,
      interests: true, isPremium: true, isPro: true, showTrackRecord: true, hideFollowList: true, country: true, links: true,
    },
  })

  return NextResponse.json(user)
}

// PATCH /api/profile — update current user's profile
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, bio, image, coverImage, interests, showTrackRecord, hideFollowList, country, links } = parsed.data

  // Sanitize links: trim, drop empties, normalize handles (strip leading @)
  let cleanLinks: Record<string, string> | null | undefined = undefined
  if (links !== undefined) {
    const out: Record<string, string> = {}
    if (links.twitter)   out.twitter   = links.twitter.trim().replace(/^@/, "")
    if (links.linkedin)  out.linkedin  = links.linkedin.trim().replace(/^@/, "")
    if (links.youtube)   out.youtube   = links.youtube.trim().replace(/^@/, "")
    if (links.instagram) out.instagram = links.instagram.trim().replace(/^@/, "")
    if (links.facebook)  out.facebook  = links.facebook.trim().replace(/^@/, "")
    if (links.website)   out.website   = links.website.trim()
    cleanLinks = Object.keys(out).length > 0 ? out : null
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(image !== undefined && { image: image || null }),
      ...(coverImage !== undefined && { coverImage: coverImage || null }),
      ...(interests !== undefined && { interests }),
      ...(showTrackRecord !== undefined && { showTrackRecord }),
      ...(hideFollowList !== undefined && { hideFollowList }),
      ...(country !== undefined && { country: country ? country.toUpperCase() : null }),
      ...(cleanLinks !== undefined && { links: cleanLinks ?? undefined }),
    },
    select: {
      id: true, name: true, username: true, bio: true, image: true, coverImage: true,
      interests: true, isPremium: true, isPro: true, showTrackRecord: true, hideFollowList: true, country: true, links: true,
    },
  })

  // Bust any cached server-rendered profile + settings pages so cover/avatar/links
  // changes appear immediately.
  revalidatePath(`/profile/${updated.username}`)
  revalidatePath("/settings/profile")

  return NextResponse.json(updated)
}
