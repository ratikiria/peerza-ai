import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import FeedContainer from "@/components/feed/FeedContainer"
import LeftPanel from "@/components/layout/LeftPanel"
import RightPanel from "@/components/layout/RightPanel"

export default async function FeedPage() {
  const session = await auth()

  // Pull canonical fields from DB. The JWT can lag behind for username/name
  // after a settings change, so DB is the source of truth here.
  const me = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, username: true, coverImage: true, isPremium: true, isPro: true },
  })

  const freshUser = {
    ...session!.user,
    name: me?.name ?? session!.user.name,
    username: me?.username ?? session!.user.username,
    isPremium: me?.isPremium ?? session!.user.isPremium,
    isPro: me?.isPro ?? false,
    coverImage: me?.coverImage ?? null,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-5">
        <LeftPanel user={freshUser} />
        <div className="flex-1 min-w-0 max-w-2xl">
          <FeedContainer user={freshUser} currentUserId={session!.user.id} />
        </div>
        <RightPanel currentUserId={session!.user.id} />
      </div>
    </div>
  )
}
