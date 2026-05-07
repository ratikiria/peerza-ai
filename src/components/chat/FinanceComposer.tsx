"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  Send, Loader2, Paperclip, Flame, DollarSign, Mic, X, Smile, Plus,
  TrendingUp, TrendingDown, Minus as MinusIcon, Briefcase, Zap, Shuffle,
  Search, Image as ImageIcon, Film, BarChart3,
} from "lucide-react"
import VoiceRecorder from "@/components/messages/VoiceRecorder"
import PollComposerDialog from "@/components/polls/PollComposerDialog"
import { flagForYahoo } from "@/lib/market"

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default as unknown as React.ComponentType<Record<string, unknown>> })),
  { ssr: false }
)

// ── Types ─────────────────────────────────────────────────────────────────────

export type Attached =
  | { kind: "post"; postId: string; label: string }
  | { kind: "challenge"; challengeId: string; label: string }
  | { kind: "call"; ticker: string; direction: "bullish" | "bearish" | "neutral"; note?: string }
  | { kind: "media"; mediaKind: "image" | "video"; dataUrl: string; mime: string }
  | { kind: "poll"; pollId: string; question: string }

interface FinanceComposerProps {
  conversationId: string
  isGroup?: boolean
  onSent: () => void
  initialAttached?: Attached | null
}

type Mode = "idle" | "post" | "challenge" | "call" | "voice"

const IMAGE_MAX_BYTES = 4 * 1024 * 1024 // 4 MB
const VIDEO_MAX_BYTES = 12 * 1024 * 1024 // 12 MB

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinanceComposer({ conversationId, isGroup = false, onSent, initialAttached }: FinanceComposerProps) {
  const [mode, setMode] = useState<Mode>("idle")
  const [attached, setAttached] = useState<Attached | null>(initialAttached ?? null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showPollDialog, setShowPollDialog] = useState(false)
  const [emojiData, setEmojiData] = useState<unknown>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const emojiContainerRef = useRef<HTMLDivElement>(null)
  const attachContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialAttached) setAttached(initialAttached)
  }, [initialAttached])

  useEffect(() => {
    if (!showEmoji || emojiData) return
    import("@emoji-mart/data").then((m) => setEmojiData(m.default))
  }, [showEmoji, emojiData])

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
    const input = textInputRef.current
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

  function pickFile(mediaKind: "image" | "video") {
    setError(null)
    if (mediaKind === "image") imageInputRef.current?.click()
    else videoInputRef.current?.click()
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>, mediaKind: "image" | "video") {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file) return
    const max = mediaKind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES
    if (file.size > max) {
      setError(`${mediaKind === "image" ? "Image" : "Video"} too large (max ${Math.round(max / 1024 / 1024)} MB)`)
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setAttached({ kind: "media", mediaKind, dataUrl, mime: file.type })
    }
    reader.readAsDataURL(file)
  }

  async function send() {
    if (sending) return
    if (!attached && !text.trim()) return
    setSending(true)
    setError(null)

    try {
      if (attached?.kind === "media") {
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: attached.dataUrl,
            mediaMime: attached.mime,
            content: text.trim() || undefined,
            type: attached.mediaKind === "image" ? "IMAGE" : "VIDEO",
          }),
        })
      } else if (attached?.kind === "poll") {
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pollId: attached.pollId,
            content: text.trim() || undefined,
            type: "POLL",
          }),
        })
      } else {
        let content = text.trim()
        if (attached?.kind === "post") {
          content = `[post:${attached.postId}]${content ? "\n" + content : ""}`
        } else if (attached?.kind === "challenge") {
          content = `[challenge:${attached.challengeId}]${content ? "\n" + content : ""}`
        } else if (attached?.kind === "call") {
          const note = (attached.note ?? text.trim()).replace(/[\[\]]/g, "")
          content = `[call:${attached.ticker}:${attached.direction}:${note}]`
        }
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, type: "TEXT" }),
        })
      }
      setText("")
      setAttached(null)
      setMode("idle")
      onSent()
    } catch {
      setError("Failed to send")
    }
    setSending(false)
  }

  async function sendVoice(voiceUrl: string) {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceUrl, type: "VOICE" }),
    })
    setMode("idle")
    onSent()
  }

  function attachedChip() {
    if (!attached) return null

    if (attached.kind === "media") {
      const tint = attached.mediaKind === "image" ? "#60a5fa" : "#a78bfa"
      return (
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px]"
          style={{ background: tint + "1a", border: `1px solid ${tint}40`, color: "var(--text-primary)" }}
        >
          {attached.mediaKind === "image" ? (
            <img src={attached.dataUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
          ) : (
            <video src={attached.dataUrl} muted className="w-10 h-10 rounded object-cover flex-shrink-0" />
          )}
          <span className="truncate flex-1 min-w-0">
            {attached.mediaKind === "image" ? "Photo" : "Video"} attached
          </span>
          <button onClick={() => setAttached(null)} className="opacity-60 hover:opacity-100 flex-shrink-0">
            <X size={11} />
          </button>
        </div>
      )
    }

    let label = ""
    let Icon = Paperclip
    let tint = "#10b981"
    if (attached.kind === "post") { label = `Post · ${attached.label}`; Icon = Paperclip; tint = "#10b981" }
    else if (attached.kind === "challenge") { label = `Challenge · ${attached.label}`; Icon = Flame; tint = "#fb923c" }
    else if (attached.kind === "poll") { label = `Poll · ${attached.question}`; Icon = BarChart3; tint = "#10b981" }
    else { label = `Call · $${attached.ticker} ${attached.direction}`; Icon = DollarSign; tint = "#f59e0b" }
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]"
        style={{ background: tint + "1a", border: `1px solid ${tint}40`, color: "var(--text-primary)" }}
      >
        <Icon size={12} style={{ color: tint }} />
        <span className="truncate flex-1 min-w-0">{label}</span>
        <button onClick={() => setAttached(null)} className="opacity-60 hover:opacity-100 flex-shrink-0">
          <X size={11} />
        </button>
      </div>
    )
  }

  return (
    <>
      {showPollDialog && (
        <PollComposerDialog
          onCreate={(pollId, question) => {
            setAttached({ kind: "poll", pollId, question })
            setShowPollDialog(false)
          }}
          onClose={() => setShowPollDialog(false)}
        />
      )}
      {mode === "post" && (
        <PostPicker
          onPick={(postId, label) => { setAttached({ kind: "post", postId, label }); setMode("idle") }}
          onClose={() => setMode("idle")}
        />
      )}
      {mode === "challenge" && (
        <ChallengePicker
          onPick={(challengeId, label) => { setAttached({ kind: "challenge", challengeId, label }); setMode("idle") }}
          onClose={() => setMode("idle")}
        />
      )}
      {mode === "call" && (
        <CallForm
          onAttach={(ticker, direction) => { setAttached({ kind: "call", ticker, direction }); setMode("idle") }}
          onClose={() => setMode("idle")}
        />
      )}
      <div
        className="relative flex flex-col gap-1.5 px-3 py-2 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}
      >
        {showEmoji && !!emojiData && (
          <div
            ref={emojiContainerRef}
            className="absolute bottom-full mb-2 right-2 z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <EmojiPicker
              data={emojiData as Record<string, unknown>}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              maxFrequentRows={1}
              perLine={8}
              onEmojiSelect={(emoji: { native: string }) => {
                insertEmoji(emoji.native)
              }}
            />
          </div>
        )}
        {attached && attachedChip()}
        {error && (
          <p className="text-[10px] text-rose-400 px-1">{error}</p>
        )}

        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => onFileChosen(e, "image")} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => onFileChosen(e, "video")} />

        {mode === "voice" ? (
          // Inline recording — replaces the text input row while active.
          <VoiceRecorder onSend={sendVoice} onCancel={() => setMode("idle")} />
        ) : (
          // Action row + text input
          <div className="flex items-center gap-1.5">
            <div ref={attachContainerRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAttach((v) => !v)}
                title="Attach"
                aria-label="Attach"
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: showAttach ? "rgba(16,185,129,0.15)" : "transparent",
                  color: showAttach ? "#10b981" : "var(--text-secondary)",
                  border: showAttach ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
                  transform: showAttach ? "rotate(45deg)" : "none",
                }}
              >
                <Plus size={14} />
              </button>
              {showAttach && (
                <div
                  className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full px-1.5 py-1 shadow-lg z-40"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <AttachMenuButton icon={<ImageIcon size={13} />} title="Photo"
                    onClick={() => { setShowAttach(false); pickFile("image") }} />
                  <AttachMenuButton icon={<Film size={13} />} title="Video"
                    onClick={() => { setShowAttach(false); pickFile("video") }} />
                  <AttachMenuButton icon={<Paperclip size={13} />} title="Share a post"
                    onClick={() => { setShowAttach(false); setMode("post") }} />
                  <AttachMenuButton icon={<Flame size={13} />} title="Share a challenge"
                    onClick={() => { setShowAttach(false); setMode("challenge") }} />
                  <AttachMenuButton icon={<DollarSign size={13} />} title="Price call"
                    onClick={() => { setShowAttach(false); setMode("call") }} />
                  {isGroup && (
                    <AttachMenuButton icon={<BarChart3 size={13} />} title="Poll"
                      onClick={() => { setShowAttach(false); setShowPollDialog(true) }} />
                  )}
                </div>
              )}
            </div>

            <input
              ref={textInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={attached ? "Add a note…" : "Message…"}
              className="flex-1 rounded-full px-3 py-1.5 text-sm outline-none min-w-0"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />

            <ComposerIconButton icon={<Smile size={13} />} title="Emoji" active={showEmoji}
              onClick={() => setShowEmoji((v) => !v)} />

            {(text.trim() || attached) ? (
              <button onClick={send} disabled={sending}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
                style={{ background: "#10b981", color: "#0f1117" }}
                title="Send" aria-label="Send">
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            ) : (
              <ComposerIconButton icon={<Mic size={13} />} title="Voice message"
                onClick={() => setMode("voice")} />
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────

function ComposerIconButton({
  icon, title, onClick, active,
}: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
      style={{
        background: active ? "rgba(16,185,129,0.15)" : "transparent",
        color: active ? "#10b981" : "var(--text-secondary)",
        border: active ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
      }}
    >
      {icon}
    </button>
  )
}

function AttachMenuButton({
  icon, title, onClick,
}: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ color: "var(--text-secondary)" }}
    >
      {icon}
    </button>
  )
}

// ── Post picker ───────────────────────────────────────────────────────────────

interface PostRow {
  id: string
  content: string
  imageUrl?: string | null
  createdAt: string
  author: { id: string; name: string; username: string; image?: string | null }
  analysis?: { ticker?: string; direction?: string } | null
}

function PostPicker({ onPick, onClose }: { onPick: (id: string, label: string) => void; onClose: () => void }) {
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.posts)) setPosts(d.posts.slice(0, 20))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <PickerOverlay title="Share a post" onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-[11px] text-center py-6" style={{ color: "var(--text-secondary)" }}>
          No posts yet
        </p>
      ) : (
        posts.map((p) => {
          const label = p.analysis?.ticker
            ? `$${p.analysis.ticker} · ${p.content.slice(0, 30)}`
            : p.content.slice(0, 50) || "Post"
          return (
            <button key={p.id} onClick={() => onPick(p.id, label)}
              className="w-full flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.12)" }}>
                  <ImageIcon size={12} className="text-emerald-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {p.author.name}
                  </span>
                  {p.analysis?.ticker && (
                    <span className="text-[9px] font-bold px-1 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      ${p.analysis.ticker}
                    </span>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {p.content}
                </p>
              </div>
            </button>
          )
        })
      )}
    </PickerOverlay>
  )
}

// ── Challenge picker ──────────────────────────────────────────────────────────

interface ChallengeRow {
  id: string
  name: string
  style?: "INVESTMENT" | "TRADING" | "MIXED"
  status?: "UPCOMING" | "ACTIVE" | "ENDED"
  creator?: { id: string }
  _count?: { participants: number }
}

function ChallengePicker({ onPick, onClose }: { onPick: (id: string, label: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<ChallengeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"created" | "joined" | "all">("created")
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((u) => setMe(u?.id ?? null)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    // Created/Joined both use ?type=mine (returns challenges I'm participating in,
    // which includes ones I created since creators auto-join). We filter client-side.
    const url = filter === "all" ? "/api/challenges" : "/api/challenges?type=mine"
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const arr: ChallengeRow[] = Array.isArray(d?.challenges) ? d.challenges : []
        const filtered = filter === "created" && me
          ? arr.filter((c) => c.creator?.id === me)
          : arr
        setItems(filtered.slice(0, 30))
      })
      .finally(() => setLoading(false))
  }, [filter, me])

  return (
    <PickerOverlay title="Share a challenge" onClose={onClose}>
      <div className="flex gap-1 mb-2 px-2">
        <PickerTab active={filter === "created"} onClick={() => setFilter("created")} label="Created by me" />
        <PickerTab active={filter === "joined"}  onClick={() => setFilter("joined")}  label="Joined" />
        <PickerTab active={filter === "all"}     onClick={() => setFilter("all")}     label="All" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-center py-6" style={{ color: "var(--text-secondary)" }}>
          No challenges
        </p>
      ) : (
        items.map((c) => {
          const Icon = c.style === "TRADING" ? Zap : c.style === "INVESTMENT" ? Briefcase : Shuffle
          const tint = c.style === "TRADING" ? "#fb923c" : c.style === "INVESTMENT" ? "#60a5fa" : "#10b981"
          return (
            <button key={c.id} onClick={() => onPick(c.id, c.name)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--bg-elevated)] text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: tint + "22", color: tint }}>
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {c.style ?? "Challenge"} · {c.status ?? ""}
                  {c._count?.participants != null ? ` · ${c._count.participants} players` : ""}
                </p>
              </div>
            </button>
          )
        })
      )}
    </PickerOverlay>
  )
}

function PickerTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="text-[10px] font-semibold px-2 py-1 rounded-md"
      style={active
        ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.4)" }
        : { background: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
      {label}
    </button>
  )
}

// ── Call form ─────────────────────────────────────────────────────────────────

interface AssetResult {
  id: string
  symbol: string
  name: string
  source: "crypto" | "yahoo"
  type?: string
}

function CallForm({
  onAttach, onClose,
}: { onAttach: (ticker: string, direction: "bullish" | "bearish" | "neutral") => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AssetResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<AssetResult | null>(null)
  const [direction, setDirection] = useState<"bullish" | "bearish" | "neutral">("bullish")

  useEffect(() => {
    if (selected) return
    const q = query.trim()
    if (q.length < 1) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data: AssetResult[] = await res.json()
          setResults(Array.isArray(data) ? data.slice(0, 10) : [])
        }
      } catch {}
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query, selected])

  function submit() {
    if (!selected) return
    const t = selected.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (!t) return
    onAttach(t, direction)
  }

  return (
    <PickerOverlay title="Make a price call" onClose={onClose}>
      <div className="space-y-2 px-1">
        {selected ? (
          <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <DollarSign size={12} style={{ color: "#f59e0b" }} />
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{selected.symbol}</span>
              <span className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{selected.name}</span>
            </div>
            <button onClick={() => { setSelected(null); setQuery("") }}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded hover:bg-[var(--bg-elevated)]"
              style={{ color: "#f59e0b" }}>
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <Search size={12} style={{ color: "var(--text-secondary)" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticker (BTC, NVDA, gold…)"
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {searching && <Loader2 size={11} className="animate-spin text-emerald-400" />}
            </div>
            {results.length > 0 && (
              <div className="rounded-xl overflow-hidden max-h-40 overflow-y-auto"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {results.map((r) => {
                  const flag = r.source === "crypto" ? "🪙" : flagForYahoo(r.id, r.type)
                  return (
                    <button key={r.id} onClick={() => setSelected(r)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--bg-card)]">
                      <span className="text-sm flex-shrink-0" aria-hidden="true">{flag}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{r.symbol}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{r.name}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                        style={{
                          background: r.source === "crypto" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                          color: r.source === "crypto" ? "#10b981" : "#60a5fa",
                        }}>
                        {r.type ?? r.source}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {query.length > 0 && results.length === 0 && !searching && (
              <p className="text-[10px] text-center py-2" style={{ color: "var(--text-secondary)" }}>
                No matches
              </p>
            )}
          </>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <DirectionButton active={direction === "bullish"} onClick={() => setDirection("bullish")}
            icon={<TrendingUp size={12} />} label="Bullish" tint="#10b981" />
          <DirectionButton active={direction === "neutral"} onClick={() => setDirection("neutral")}
            icon={<MinusIcon size={12} />} label="Neutral" tint="#8a8d9a" />
          <DirectionButton active={direction === "bearish"} onClick={() => setDirection("bearish")}
            icon={<TrendingDown size={12} />} label="Bearish" tint="#ef4444" />
        </div>
        <button onClick={submit} disabled={!selected}
          className="w-full text-[11px] font-semibold py-2 rounded-lg disabled:opacity-40"
          style={{ background: "#10b981", color: "#0f1117" }}>
          Attach call
        </button>
      </div>
    </PickerOverlay>
  )
}

function DirectionButton({
  active, onClick, icon, label, tint,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tint: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-md"
      style={active
        ? { background: tint + "22", color: tint, border: `1px solid ${tint}66` }
        : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
      {icon} {label}
    </button>
  )
}

// ── Picker overlay shell ──────────────────────────────────────────────────────

function PickerOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="absolute left-0 right-0 bottom-[60px] flex flex-col"
      style={{
        maxHeight: 320,
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        zIndex: 1,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-elevated)]"
          style={{ color: "var(--text-secondary)" }}>
          <X size={11} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto py-1 px-1.5">
        {children}
      </div>
    </div>
  )
}

