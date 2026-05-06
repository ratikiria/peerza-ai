"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Search, User } from "lucide-react"
import FollowButton from "@/components/users/FollowButton"
import ProBadge from "@/components/shared/ProBadge"

interface UserResult {
  id: string
  name: string
  username: string
  image?: string | null
  bio?: string | null
  isPremium: boolean
  isPro?: boolean
  isFollowing: boolean
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-100">Search</h1>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or username…"
          className="w-full bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 text-sm pl-9 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 transition-colors"
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-1/3" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">No users found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-gray-700 transition-colors"
            >
              <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={18} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100 truncate">{user.name}</span>
                    {user.isPro && <ProBadge size="sm" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-gray-600 truncate mt-0.5">{user.bio}</p>
                  )}
                </div>
              </Link>
              <FollowButton targetUserId={user.id} initialIsFollowing={user.isFollowing} />
            </div>
          ))}
        </div>
      )}

      {!query && (
        <div className="text-center py-16 text-gray-600">
          <User size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search for people to connect with</p>
        </div>
      )}
    </div>
  )
}
