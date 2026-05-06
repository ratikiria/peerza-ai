import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { headers as nextHeaders } from "next/headers"
import { User, MessageCircle } from "lucide-react"
import FollowButton from "@/components/users/FollowButton"
import FollowStats from "@/components/users/FollowStats"
import ConnectButton, { type ConnectionStatus } from "@/components/users/ConnectButton"
import TrackRecordCard from "@/components/users/TrackRecordCard"
import AboutCard from "@/components/users/AboutCard"
import MutualConnectionsCard from "@/components/users/MutualConnectionsCard"
import RecentOutcomesCard from "@/components/users/RecentOutcomesCard"
import ActiveChallengesCard from "@/components/users/ActiveChallengesCard"
import ProfileGamesCard from "@/components/users/ProfileGamesCard"
import ProfilePostsTabs from "@/components/users/ProfilePostsTabs"
import SocialLinks from "@/components/users/SocialLinks"
import ProBadge from "@/components/shared/ProBadge"
import { getTrackRecord } from "@/lib/track-record"
import { getMutualConnections, getRecentOutcomes, getActiveChallengePerf } from "@/lib/profile-data"
import { getUserGameStats } from "@/lib/games"

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const session = await auth()
  const { username } = await params

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true, name: true, username: true, bio: true, image: true, coverImage: true,
      isPremium: true, isPro: true, proExpiresAt: true, interests: true, country: true, createdAt: true, showTrackRecord: true,
      links: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  })

  if (!user) notFound()

  const isOwnProfile = session!.user.id === user.id

  const followRecord = isOwnProfile ? null : await db.follow.findUnique({
    where: { followerId_followingId: { followerId: session!.user.id, followingId: user.id } },
  })
  const isFollowing = !!followRecord

  let connectionStatus: ConnectionStatus = "none"
  if (!isOwnProfile) {
    const connectionRecord = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: session!.user.id, receiverId: user.id },
          { requesterId: user.id, receiverId: session!.user.id },
        ],
      },
    })
    if (connectionRecord) {
      if (connectionRecord.status === "ACCEPTED") connectionStatus = "connected"
      else if (connectionRecord.status === "PENDING")
        connectionStatus = connectionRecord.requesterId === session!.user.id ? "pending-sent" : "pending-received"
    }
  }

  // Resolve internal base URL for the active-challenges fetch (server-side fetch).
  const reqHeaders = await nextHeaders()
  const host = reqHeaders.get("host") ?? "localhost:3000"
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http"
  const baseUrl = `${proto}://${host}`
  const cookieHeader = reqHeaders.get("cookie") ?? ""

  const [posts, pinnedPosts, trackRecord, mutuals, outcomes, activeChallenges, gameStats] = await Promise.all([
    db.post.findMany({
      where: { authorId: user.id, pinned: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true, proExpiresAt: true } },
        likes: { select: { userId: true, reaction: true } },
        _count: { select: { comments: true, likes: true } },
        poll: { select: { id: true, question: true, options: true, authorId: true, votes: { select: { userId: true, optionIndex: true } } } },
      },
    }),
    db.post.findMany({
      where: { authorId: user.id, pinned: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        author: { select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true, proExpiresAt: true } },
        likes: { select: { userId: true, reaction: true } },
        _count: { select: { comments: true, likes: true } },
        poll: { select: { id: true, question: true, options: true, authorId: true, votes: { select: { userId: true, optionIndex: true } } } },
      },
    }),
    getTrackRecord(user.id),
    isOwnProfile
      ? Promise.resolve({ users: [], total: 0 })
      : getMutualConnections(session!.user.id, user.id),
    getRecentOutcomes(user.id),
    getActiveChallengePerf(user.id, baseUrl, cookieHeader),
    getUserGameStats(user.id),
  ])

  const serializedPosts = posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))
  const serializedPinned = pinnedPosts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Cover + main profile card spans full width */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>

        {/* Cover photo */}
        <div className="h-48 relative overflow-hidden"
          style={
            user.coverImage
              ? { background: "var(--bg-base)" }
              : { background: "linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.25) 50%, rgba(139,92,246,0.2) 100%)" }
          }>
          {user.coverImage ? (
            <img src={user.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)" }} />
          )}
        </div>

        {/* Profile info */}
        <div className="px-6 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4 relative z-10">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative z-10"
              style={{
                background: "rgba(16,185,129,0.2)",
                border: "4px solid var(--bg-card)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-emerald-400" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isOwnProfile ? (
                <Link
                  href="/settings/profile"
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-[var(--bg-base)]"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  Edit profile
                </Link>
              ) : (
                <>
                  <Link
                    href={`/messages/${user.id}`}
                    className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-[var(--bg-base)]"
                    style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    <MessageCircle size={15} /> Message
                  </Link>
                  <FollowButton targetUserId={user.id} initialIsFollowing={isFollowing} />
                  <ConnectButton targetUserId={user.id} initialStatus={connectionStatus} />
                </>
              )}
            </div>
          </div>

          {/* Name + badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{user.name}</h1>
              {user.isPro && <ProBadge size="md" withLabel />}
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>@{user.username}</p>
            <SocialLinks links={user.links as Parameters<typeof SocialLinks>[0]["links"]} />
          </div>

          {/* Stats */}
          <FollowStats
            userId={user.id}
            username={user.username}
            postsCount={user._count.posts}
            followersCount={user._count.followers}
            followingCount={user._count.following}
          />
        </div>
      </div>

      {/* Three-column layout below */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr_16rem] gap-4">

        {/* Left column */}
        <aside className="space-y-3 order-2 lg:order-1">
          <AboutCard user={user} />
          {!isOwnProfile && (
            <MutualConnectionsCard users={mutuals.users} total={mutuals.total} partnerName={user.username} />
          )}
        </aside>

        {/* Center: track record + posts */}
        <div className="space-y-4 order-1 lg:order-2 min-w-0">
          <TrackRecordCard
            record={trackRecord}
            isOwnProfile={isOwnProfile}
            showTrackRecord={user.showTrackRecord}
          />

          <ProfilePostsTabs
            posts={serializedPosts}
            pinnedPosts={serializedPinned}
            currentUserId={session!.user.id}
            isOwnProfile={isOwnProfile}
          />
        </div>

        {/* Right column */}
        <aside className="space-y-3 order-3">
          <ActiveChallengesCard challenges={activeChallenges} />
          <ProfileGamesCard stats={gameStats} isOwnProfile={isOwnProfile} />
          <RecentOutcomesCard outcomes={outcomes} username={user.username} />
        </aside>
      </div>
    </div>
  )
}
