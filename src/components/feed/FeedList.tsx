"use client"

import { useEffect, useState } from "react"
import PostCard from "./PostCard"

interface Post {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    image?: string | null
    isPremium: boolean
  }
  likes: { userId: string }[]
  _count: { comments: number; likes: number }
}

interface FeedListProps {
  currentUserId: string
}

export default function FeedList({ currentUserId }: FeedListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadPosts(cursor?: string) {
    const url = cursor ? `/api/posts?cursor=${cursor}` : "/api/posts"
    const res = await fetch(url)
    const data = await res.json()
    setPosts((prev) => (cursor ? [...prev, ...data.posts] : data.posts))
    setNextCursor(data.nextCursor)
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-1/4" />
                <div className="h-3 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Nothing here yet</p>
        <p className="text-sm mt-1">Follow people to see their posts in your feed</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
      {nextCursor && (
        <button
          onClick={() => loadPosts(nextCursor)}
          className="w-full py-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
