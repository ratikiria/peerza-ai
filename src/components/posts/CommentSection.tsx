"use client"

import { useState } from "react"
import Link from "next/link"
import { User, Send } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    image?: string | null
    isPremium: boolean
  }
}

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
  currentUser: {
    id: string
    name: string
    username: string
    image?: string | null
  }
}

export default function CommentSection({ postId, initialComments, currentUser }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return

    setSubmitting(true)
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      setContent("")
    }

    setSubmitting(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-semibold text-gray-300">
        {comments.length === 0 ? "No comments yet" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
      </h2>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          {currentUser.image ? (
            <img src={currentUser.image} alt={currentUser.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User size={14} className="text-emerald-400" />
          )}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            maxLength={500}
            className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-600 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className={cn(
              "p-2 rounded-lg transition-colors",
              content.trim()
                ? "bg-emerald-500 hover:bg-emerald-400 text-gray-950"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            )}
          >
            <Send size={14} />
          </button>
        </div>
      </form>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-800">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Link href={`/profile/${comment.author.username}`} className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  {comment.author.image ? (
                    <img src={comment.author.image} alt={comment.author.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={14} className="text-emerald-400" />
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${comment.author.username}`} className="text-xs font-semibold text-gray-200 hover:text-emerald-400 transition-colors">
                    {comment.author.name}
                  </Link>
                  {comment.author.isPremium && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-medium">PRO</span>
                  )}
                  <span className="text-gray-600 text-xs">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-gray-300 text-sm leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
