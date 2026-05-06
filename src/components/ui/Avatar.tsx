"use client"

import { useState } from "react"
import { User } from "lucide-react"

interface AvatarProps {
  userId: string
  image?: string | null
  name: string
  size?: number
  className?: string
}

/**
 * Shows the user's avatar. Tries session image first, falls back to /api/avatar/[userId],
 * then falls back to the User icon. This works even for stale sessions.
 */
export default function Avatar({ userId, image, name, size = 18, className = "" }: AvatarProps) {
  // Always try the avatar API — it reads fresh from DB
  const initial = image && !image.startsWith("data:") ? image : `/api/avatar/${userId}`
  const [src, setSrc] = useState<string | null>(initial)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setSrc(null)}
      />
    )
  }
  return <User size={size} className="text-emerald-400" />
}
