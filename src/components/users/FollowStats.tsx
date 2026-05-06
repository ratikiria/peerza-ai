"use client"

import { useState } from "react"
import FollowListModal from "./FollowListModal"

interface FollowStatsProps {
  userId: string
  username: string
  postsCount: number
  followersCount: number
  followingCount: number
}

export default function FollowStats({
  userId, username, postsCount, followersCount, followingCount,
}: FollowStatsProps) {
  const [open, setOpen] = useState<"followers" | "following" | null>(null)

  return (
    <>
      <div className="mt-4 pt-4 flex gap-6" style={{ borderTop: "1px solid var(--border)" }}>
        <div>
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{postsCount}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Posts</p>
        </div>
        <button
          onClick={() => setOpen("followers")}
          className="text-left transition-opacity hover:opacity-70"
        >
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{followersCount}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Followers</p>
        </button>
        <button
          onClick={() => setOpen("following")}
          className="text-left transition-opacity hover:opacity-70"
        >
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{followingCount}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Following</p>
        </button>
      </div>

      {open && (
        <FollowListModal
          userId={userId}
          username={username}
          mode={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
