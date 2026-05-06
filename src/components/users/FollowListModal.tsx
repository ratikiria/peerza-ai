"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Loader2, User as UserIcon, Lock } from "lucide-react"
import FollowButton from "@/components/users/FollowButton"
import ProBadge from "@/components/shared/ProBadge"

interface UserRow {
  id: string
  name: string
  username: string
  image?: string | null
  isPro?: boolean
  isFollowing: boolean
  isMe: boolean
}

interface FollowListModalProps {
  userId: string
  username: string
  mode: "followers" | "following"
  onClose: () => void
}

export default function FollowListModal({ userId, username, mode, onClose }: FollowListModalProps) {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}/${mode}`)
        if (cancelled) return
        if (res.status === 403) { setHidden(true); return }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? "Failed to load")
          return
        }
        const data = await res.json()
        setUsers(data.users ?? [])
      } catch {
        if (!cancelled) setError("Network error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, mode])

  const title = mode === "followers" ? "Followers" : "Following"

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {hidden ? (
            <div className="px-6 py-12 text-center">
              <Lock size={24} className="mx-auto mb-3 opacity-40" style={{ color: "var(--text-secondary)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                This list is private
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                @{username} chose not to share who they follow or who follows them.
              </p>
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400 text-center py-8">{error}</p>
          ) : users === null ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-emerald-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            <div className="py-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-base)]">
                  <Link href={`/profile/${u.username}`} onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.15)" }}>
                      {u.image
                        ? <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                        : <UserIcon size={16} className="text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {u.name}
                        </p>
                        {u.isPro && <ProBadge size="sm" />}
                      </div>
                      <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
                        @{u.username}
                      </p>
                    </div>
                  </Link>
                  {!u.isMe && (
                    <FollowButton targetUserId={u.id} initialIsFollowing={u.isFollowing} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
