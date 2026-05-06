"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageCircle, User, Users } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

interface Conversation {
  conversationId: string
  isGroup: boolean
  name: string | null
  partner: { id: string; name: string; username: string; image?: string | null } | null
  participants: { id: string; name: string; username: string; image?: string | null }[]
  lastMessage: { id: string; content?: string | null; type: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

export default function ConversationList({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch("/api/conversations")
    if (res.ok) setConversations(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-800 rounded w-1/3" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-16 text-gray-600">
        <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">
          Find someone on{" "}
          <Link href="/search" className="text-emerald-400 hover:underline">
            Search
          </Link>{" "}
          and message them from their profile
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => {
        const partner = conv.partner
        const isGroup = conv.isGroup
        if (!isGroup && !partner) return null
        const displayName = isGroup
          ? (conv.name?.trim() || conv.participants.map((p) => p.name.split(" ")[0]).slice(0, 3).join(", ") || "Group")
          : partner!.name
        const last = conv.lastMessage
        const isMe = last?.senderId === currentUserId
        const previewRaw = last?.content ?? ""
        const previewClean = previewRaw
          .replace(/^\[(post|challenge|call):[^\]]+\]\s*\n?/, "")
          .trim()
        const tokenLabel =
          previewRaw.startsWith("[post:")      ? "📎 Shared a post"
          : previewRaw.startsWith("[challenge:") ? "🔥 Shared a challenge"
          : previewRaw.startsWith("[call:")      ? "💰 Price call"
          : null
        const preview =
          last?.type === "VOICE" ? "🎤 Voice message"
          : last?.type === "IMAGE" ? `${isMe ? "You: " : ""}📷 Photo${previewClean ? " · " + previewClean : ""}`
          : last?.type === "VIDEO" ? `${isMe ? "You: " : ""}🎬 Video${previewClean ? " · " + previewClean : ""}`
          : last?.type === "POLL"  ? `${isMe ? "You: " : ""}📊 Poll${previewClean ? " · " + previewClean : ""}`
          : tokenLabel ? `${isMe ? "You: " : ""}${tokenLabel}${previewClean ? " · " + previewClean : ""}`
          : previewClean ? `${isMe ? "You: " : ""}${previewClean}`
          : ""

        // Groups open in the floating dock (no full-page route yet); 1:1 navigates.
        const commonInner = (
          <>
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 relative">
              {isGroup ? (
                <Users size={18} className="text-emerald-400" />
              ) : partner!.image ? (
                <img src={partner!.image} alt={partner!.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={18} className="text-emerald-400" />
              )}
              {conv.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-gray-950 text-[10px] font-bold flex items-center justify-center">
                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold flex items-center gap-1 ${conv.unreadCount > 0 ? "text-gray-100" : "text-gray-300"}`}>
                  {isGroup && <Users size={11} className="opacity-60 flex-shrink-0" />}
                  {displayName}
                </span>
                {last && (
                  <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
                    {formatRelativeTime(last.createdAt)}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-gray-300" : "text-gray-600"}`}>
                {preview}
              </p>
            </div>
          </>
        )

        return isGroup ? (
          <button
            key={conv.conversationId}
            onClick={() => window.dispatchEvent(new CustomEvent("peerza:open-conversation", { detail: { conversationId: conv.conversationId } }))}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors text-left"
          >
            {commonInner}
          </button>
        ) : (
          <Link
            key={conv.conversationId}
            href={`/messages/${partner!.id}`}
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {commonInner}
          </Link>
        )
      })}
    </div>
  )
}
