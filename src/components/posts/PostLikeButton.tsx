"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostLikeButtonProps {
  postId: string
  initialLiked: boolean
  initialCount: number
}

export default function PostLikeButton({ postId, initialLiked, initialCount }: PostLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  async function handleLike() {
    if (pending) return
    setPending(true)
    setLiked((prev) => !prev)
    setCount((prev) => (liked ? prev - 1 : prev + 1))
    await fetch(`/api/posts/${postId}/like`, { method: "POST" })
    setPending(false)
  }

  return (
    <button
      onClick={handleLike}
      className={cn(
        "flex items-center gap-1.5 text-sm mt-4 transition-colors",
        liked ? "text-rose-400" : "text-gray-500 hover:text-rose-400"
      )}
    >
      <Heart size={16} fill={liked ? "currentColor" : "none"} />
      {count > 0 ? `${count} ${count === 1 ? "like" : "likes"}` : "Like"}
    </button>
  )
}
