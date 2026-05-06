"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean
}

export default function FollowButton({ targetUserId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    setPending(true)
    setIsFollowing((prev) => !prev)

    await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    })

    setPending(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "text-sm font-semibold px-5 py-1.5 rounded-lg transition-colors",
        isFollowing
          ? "border border-gray-700 text-gray-300 hover:border-rose-500 hover:text-rose-400"
          : "bg-emerald-500 hover:bg-emerald-400 text-gray-950"
      )}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  )
}
