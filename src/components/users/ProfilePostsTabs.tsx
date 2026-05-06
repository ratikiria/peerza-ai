"use client"

import { useState } from "react"
import PostCard from "@/components/feed/PostCard"

type Tab = "all" | "ideas" | "media"

interface Post {
  id: string
  content: string
  imageUrl?: string | null
  videoUrl?: string | null
  videoMime?: string | null
  analysis?: { ticker?: string } | null
  pinned?: boolean
  [key: string]: unknown
}

interface Props {
  posts: Post[]
  pinnedPosts: Post[]
  currentUserId: string
  isOwnProfile: boolean
}

export default function ProfilePostsTabs({ posts, pinnedPosts, currentUserId, isOwnProfile }: Props) {
  const [tab, setTab] = useState<Tab>("all")

  const filtered = posts.filter((p) => {
    if (tab === "all") return true
    if (tab === "ideas") return !!(p.analysis as { ticker?: string } | null | undefined)?.ticker
    if (tab === "media") return !!p.imageUrl || !!p.videoUrl
    return true
  })

  const counts = {
    all: posts.length,
    ideas: posts.filter((p) => !!(p.analysis as { ticker?: string } | null | undefined)?.ticker).length,
    media: posts.filter((p) => p.imageUrl || p.videoUrl).length,
  }

  return (
    <div className="space-y-4">
      {/* Pinned posts (always shown above tabs, regardless of filter) */}
      {pinnedPosts.length > 0 && (
        <div className="space-y-3">
          {pinnedPosts.map((p) => (
            <PostCard key={`pin-${p.id}`} post={p as any} currentUserId={currentUserId}
              showPinControl={isOwnProfile} />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-0.5 rounded-xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <TabButton label="All" count={counts.all} active={tab === "all"} onClick={() => setTab("all")} />
        <TabButton label="Trade Ideas" count={counts.ideas} active={tab === "ideas"} onClick={() => setTab("ideas")} />
        <TabButton label="Media" count={counts.media} active={tab === "media"} onClick={() => setTab("media")} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {tab === "ideas" ? "No Trade Ideas yet"
             : tab === "media" ? "No photos or videos yet"
             : "No posts yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p as any} currentUserId={currentUserId}
              showPinControl={isOwnProfile} />
          ))}
        </div>
      )}
    </div>
  )
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
      style={active
        ? { background: "rgba(16,185,129,0.18)", color: "#10b981" }
        : { color: "var(--text-secondary)" }}>
      {label}
      <span className="text-[10px] tabular-nums opacity-60">{count}</span>
    </button>
  )
}
