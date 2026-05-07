"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Send, Mic, User, Smile, Plus, Image as ImageIcon, Film, X } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import VoiceRecorder from "./VoiceRecorder"
import WaveformPlayer from "./WaveformPlayer"
import PollCard, { type PollData } from "@/components/polls/PollCard"
import { cn } from "@/lib/utils"
import { ChatTextBubble } from "./ChatBubble"

async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) { reject(new Error("Image too large (max 8MB)")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 1280
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const width = Math.round(img.width * ratio)
        const height = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readVideoAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) { reject(new Error("Video too large (max 10MB)")); return }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default as unknown as React.ComponentType<Record<string, unknown>> })),
  { ssr: false }
)

interface Message {
  id: string
  content?: string | null
  voiceUrl?: string | null
  mediaUrl?: string | null
  mediaMime?: string | null
  poll?: PollData | null
  type: "TEXT" | "VOICE" | "IMAGE" | "VIDEO" | "POLL"
  senderId: string
  createdAt: string
  sender: { id: string; name: string; username: string; image?: string | null }
}

interface ChatWindowProps {
  currentUserId: string
  partnerId: string
}

export default function ChatWindow({ currentUserId, partnerId }: ChatWindowProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [emojiData, setEmojiData] = useState<unknown>(null)
  const [pendingMedia, setPendingMedia] = useState<{ url: string; mime: string; type: "IMAGE" | "VIDEO" } | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiContainerRef = useRef<HTMLDivElement>(null)
  const attachContainerRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Lazy-load emoji-mart data once
  useEffect(() => {
    if (!showEmoji || emojiData) return
    import("@emoji-mart/data").then((m) => setEmojiData(m.default))
  }, [showEmoji, emojiData])

  // Click-outside closes the emoji picker
  useEffect(() => {
    if (!showEmoji) return
    function handle(e: MouseEvent) {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [showEmoji])

  // Click-outside closes the attachments menu
  useEffect(() => {
    if (!showAttach) return
    function handle(e: MouseEvent) {
      if (attachContainerRef.current && !attachContainerRef.current.contains(e.target as Node)) {
        setShowAttach(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [showAttach])

  function insertEmoji(native: string) {
    const input = inputRef.current
    if (!input) {
      setText((t) => t + native)
      return
    }
    const start = input.selectionStart ?? text.length
    const end = input.selectionEnd ?? text.length
    const next = text.slice(0, start) + native + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      input.focus()
      const pos = start + native.length
      input.setSelectionRange(pos, pos)
    })
  }

  // Resolve the conversation for this 1:1 partner (creates if not exists)
  useEffect(() => {
    let cancelled = false
    fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.conversationId) setConversationId(d.conversationId) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [partnerId])

  async function load() {
    if (!conversationId) return
    const res = await fetch(`/api/conversations/${conversationId}/messages`)
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) {
      setMessages(data)
      setPartnerLastReadAt(null)
    } else {
      setMessages(data.messages ?? [])
      setPartnerLastReadAt(data.partnerLastReadAt ?? null)
    }
  }

  useEffect(() => {
    if (!conversationId) return
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [conversationId])

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  function handleMessagesScroll() {
    const el = messagesRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distFromBottom < 80
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && !pendingMedia) || sending || !conversationId) return

    setSending(true)
    const body: Record<string, string> = {}
    if (pendingMedia) {
      body.mediaUrl = pendingMedia.url
      body.mediaMime = pendingMedia.mime
      body.type = pendingMedia.type
      if (text.trim()) body.content = text.trim()
    } else {
      body.content = text.trim()
      body.type = "TEXT"
    }
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setText("")
    setPendingMedia(null)
    setSending(false)
    stickToBottomRef.current = true
    load()
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setShowAttach(false)
    try {
      const url = await resizeImage(file)
      setPendingMedia({ url, mime: "image/jpeg", type: "IMAGE" })
      setMediaError(null)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "Failed to load image")
    }
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setShowAttach(false)
    try {
      const url = await readVideoAsDataUrl(file)
      setPendingMedia({ url, mime: file.type || "video/mp4", type: "VIDEO" })
      setMediaError(null)
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "Failed to load video")
    }
  }

  async function sendVoice(voiceUrl: string) {
    setShowVoice(false)
    if (!conversationId) return
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceUrl, type: "VOICE" }),
    })
    stickToBottomRef.current = true
    load()
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 py-2 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">
            No messages yet. Say hello!
          </div>
        )}
        {(() => {
          let lastMineIdx = -1
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].senderId === currentUserId) { lastMineIdx = i; break }
          }
          const partnerReadMs = partnerLastReadAt ? new Date(partnerLastReadAt).getTime() : 0
          return messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId
          const showSeen = isMe && idx === lastMineIdx
          const seen = showSeen && partnerReadMs >= new Date(msg.createdAt).getTime()
          return (
            <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 self-end">
                  {msg.sender.image ? (
                    <img src={msg.sender.image} alt={msg.sender.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={12} className="text-emerald-400" />
                  )}
                </div>
              )}
              <div className={cn("max-w-[70%] space-y-0.5", isMe ? "items-end" : "items-start")}>
                {msg.type === "VOICE" && msg.voiceUrl ? (
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2",
                      isMe ? "bg-emerald-500 text-gray-950 rounded-tr-sm" : "bg-gray-800 rounded-tl-sm"
                    )}
                  >
                    <WaveformPlayer src={msg.voiceUrl} variant={isMe ? "me" : "them"} />
                  </div>
                ) : msg.type === "IMAGE" && msg.mediaUrl ? (
                  <div className="space-y-1">
                    <img src={msg.mediaUrl} alt="" className="rounded-2xl max-w-full max-h-72 object-cover" />
                    {msg.content && <ChatTextBubble content={msg.content} isMe={isMe} />}
                  </div>
                ) : msg.type === "VIDEO" && msg.mediaUrl ? (
                  <div className="space-y-1">
                    <video src={msg.mediaUrl} controls playsInline className="rounded-2xl max-w-full max-h-72" />
                    {msg.content && <ChatTextBubble content={msg.content} isMe={isMe} />}
                  </div>
                ) : msg.type === "POLL" && msg.poll ? (
                  <div className="space-y-1">
                    <PollCard poll={msg.poll} currentUserId={currentUserId} isMe={isMe} />
                    {msg.content && <ChatTextBubble content={msg.content} isMe={isMe} />}
                  </div>
                ) : (
                  <ChatTextBubble content={msg.content ?? ""} isMe={isMe} />
                )}
                <p className={cn("text-[10px] text-gray-600 px-1 inline-flex items-center gap-1.5", isMe ? "justify-end ml-auto" : "justify-start")}>
                  <span>{formatRelativeTime(msg.createdAt)}</span>
                  {showSeen && (
                    <span style={{ color: seen ? "#10b981" : undefined }}>
                      · {seen ? "Seen" : "Sent"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        })
        })()}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-gray-800 flex-shrink-0 relative">
        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoChange}
        />

        {/* Pending media preview */}
        {pendingMedia && (
          <div className="mb-2 flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-xl p-2">
            {pendingMedia.type === "IMAGE" ? (
              <img src={pendingMedia.url} alt="" className="rounded-lg max-h-32 object-cover" />
            ) : (
              <video src={pendingMedia.url} className="rounded-lg max-h-32" muted />
            )}
            <button
              type="button"
              onClick={() => setPendingMedia(null)}
              className="text-gray-500 hover:text-rose-400 transition-colors"
              title="Remove"
              aria-label="Remove attachment"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {mediaError && (
          <p className="mb-2 text-[11px] text-rose-400 px-1">{mediaError}</p>
        )}

        {showVoice ? (
          <VoiceRecorder onSend={sendVoice} onCancel={() => setShowVoice(false)} />
        ) : (
          <form onSubmit={sendText} className="flex items-center gap-2">
            <div ref={attachContainerRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAttach((v) => !v)}
                className={cn(
                  "transition-all flex-shrink-0",
                  showAttach ? "text-emerald-400 rotate-45" : "text-gray-500 hover:text-emerald-400"
                )}
                title="Attach"
                aria-label="Attach"
              >
                <Plus size={22} />
              </button>
              {showAttach && (
                <div
                  className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-full px-2 py-1.5 shadow-lg z-40"
                >
                  <button
                    type="button"
                    onClick={() => { setShowAttach(false); photoInputRef.current?.click() }}
                    className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors rounded-full hover:bg-gray-800"
                    title="Photo"
                    aria-label="Photo"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAttach(false); videoInputRef.current?.click() }}
                    className="p-1.5 text-gray-400 hover:text-emerald-400 transition-colors rounded-full hover:bg-gray-800"
                    title="Video"
                    aria-label="Video"
                  >
                    <Film size={18} />
                  </button>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message…"
              className="flex-1 min-w-0 bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 text-sm px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              className={cn(
                "transition-colors flex-shrink-0",
                showEmoji ? "text-emerald-400" : "text-gray-500 hover:text-emerald-400"
              )}
              title="Emoji"
              aria-label="Emoji"
            >
              <Smile size={20} />
            </button>
            {(text.trim() || pendingMedia) ? (
              <button
                type="submit"
                disabled={sending}
                className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                title="Send"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowVoice(true)}
                className="text-gray-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                title="Voice message"
                aria-label="Voice message"
              >
                <Mic size={20} />
              </button>
            )}
          </form>
        )}

        {showEmoji && !!emojiData && (
          <div
            ref={emojiContainerRef}
            className="absolute bottom-full mb-2 right-0 z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <EmojiPicker
              data={emojiData as Record<string, unknown>}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={1}
              perLine={9}
              onEmojiSelect={(emoji: { native: string }) => {
                insertEmoji(emoji.native)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

