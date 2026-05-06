"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Send, Plus, Trash2, Loader2, Sparkles, Volume2, VolumeX, Play } from "lucide-react"
import AriaAvatar from "./AriaAvatar"

const VOICE_PREF_KEY = "peerza-aria-voice-v1"

// Strip markdown markers so the TTS voice doesn't pronounce asterisks and backticks.
// We keep code-block contents (Aria still says them) but drop the fences/markers.
function stripMarkdownForVoice(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")  // code blocks: skip entirely
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

// Walk through `text` and split into chunks at sentence boundaries (. ! ? \n\n).
// Returns [chunks, leftover] — leftover is text past the last boundary, kept for
// the next pass so we don't speak half-sentences mid-stream.
function chopSentences(text: string): { chunks: string[]; leftover: string } {
  const out: string[] = []
  let buf = ""
  for (let i = 0; i < text.length; i++) {
    buf += text[i]
    const ch = text[i]
    const next = text[i + 1] ?? ""
    const sentenceEnd = (ch === "." || ch === "!" || ch === "?") && (next === " " || next === "\n" || next === "")
    const paragraph = ch === "\n" && next === "\n"
    // Force a flush on long buffers so we don't wait forever on run-on text
    if (sentenceEnd || paragraph || buf.length >= 240) {
      const trimmed = buf.trim()
      if (trimmed.length >= 4) out.push(trimmed)
      buf = ""
    }
  }
  return { chunks: out, leftover: buf }
}

interface Msg {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
}

interface SessionRow {
  id: string
  title: string
  messageCount: number
  updatedAt: string
}

interface QuotaStatus {
  tier: "free" | "pro" | "premium"
  used: number
  limit: number | null
  remaining: number | null
  resetAt: string
}

const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" }

export default function AriaChat() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [quota, setQuota] = useState<QuotaStatus | null>(null)
  const [error, setError] = useState("")
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const audioQueueRef = useRef<HTMLAudioElement[]>([])
  const audioPlayingRef = useRef(false)
  const objectUrlsRef = useRef<string[]>([])

  // Restore voice preference (default: ON if it was ever toggled on, OFF on first visit)
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(VOICE_PREF_KEY)
    if (stored === "1") setVoiceEnabled(true)
  }, [])

  function persistVoicePref(on: boolean) {
    setVoiceEnabled(on)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VOICE_PREF_KEY, on ? "1" : "0")
    }
    if (!on) stopAllAudio()
  }

  function stopAllAudio() {
    for (const a of audioQueueRef.current) {
      a.pause()
      a.src = ""
    }
    audioQueueRef.current = []
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
    objectUrlsRef.current = []
    audioPlayingRef.current = false
    setSpeaking(false)
  }

  // Drains the audio queue, playing one segment at a time.
  function pumpAudioQueue() {
    if (audioPlayingRef.current) return
    const next = audioQueueRef.current.shift()
    if (!next) {
      setSpeaking(false)
      return
    }
    audioPlayingRef.current = true
    setSpeaking(true)
    next.onended = () => {
      audioPlayingRef.current = false
      pumpAudioQueue()
    }
    next.onerror = () => {
      audioPlayingRef.current = false
      pumpAudioQueue()
    }
    next.play().catch(() => {
      // Autoplay can block on some browsers — if it does, we silently drop
      // and let the user try the per-message play button.
      audioPlayingRef.current = false
      pumpAudioQueue()
    })
  }

  // Fetch one TTS chunk and enqueue. Failures are swallowed — voice is a
  // nice-to-have, not load-bearing.
  async function speakChunk(text: string) {
    const cleaned = stripMarkdownForVoice(text)
    if (cleaned.length < 3) return
    try {
      const res = await fetch("/api/ai-tutor/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      objectUrlsRef.current.push(url)
      const audio = new Audio(url)
      audio.preload = "auto"
      audioQueueRef.current.push(audio)
      pumpAudioQueue()
    } catch {
      // ignore — text already rendered; missing audio isn't fatal
    }
  }

  // One-shot replay button on past assistant messages
  async function replayMessage(text: string) {
    stopAllAudio()
    await speakChunk(text)
  }

  const refreshSessions = useCallback(async () => {
    const res = await fetch("/api/ai-tutor/sessions")
    if (res.ok) {
      const data = await res.json()
      setSessions(data.sessions ?? [])
    }
  }, [])

  const refreshQuota = useCallback(async () => {
    const res = await fetch("/api/ai-tutor/quota")
    if (res.ok) setQuota(await res.json())
  }, [])

  useEffect(() => {
    refreshSessions()
    refreshQuota()
  }, [refreshSessions, refreshQuota])

  // Pre-fill the input from ?q=... so deep links from the economic calendar
  // ("Ask Aria about this CPI release") land cleanly. We don't auto-send —
  // user can tweak before submitting.
  const searchParams = useSearchParams()
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setInput(q)
  }, [searchParams])

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function loadSession(id: string) {
    setActiveId(id)
    setMessages([])
    setError("")
    const res = await fetch(`/api/ai-tutor/sessions/${id}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages ?? [])
    }
  }

  function newConversation() {
    setActiveId(null)
    setMessages([])
    setError("")
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Delete this conversation?")) return
    await fetch(`/api/ai-tutor/sessions/${id}`, { method: "DELETE" })
    if (activeId === id) newConversation()
    refreshSessions()
  }

  async function send() {
    const content = input.trim()
    if (!content || streaming) return
    setError("")
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "", streaming: true }])
    setStreaming(true)
    stopAllAudio()
    let voiceBuf = "" // accumulator for sentence-stream TTS

    try {
      const res = await fetch("/api/ai-tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeId, content }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Request failed")
        if (data.quota) setQuota(data.quota)
        // Roll back the optimistic placeholders
        setMessages((prev) => prev.slice(0, -2))
        return
      }

      if (!res.body) {
        setError("No stream body")
        setMessages((prev) => prev.slice(0, -2))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let landedSessionId = activeId

      // Parse SSE: events separated by \n\n, each line "data: ..."
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""
        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "))
          if (!line) continue
          const payload = line.slice(6)
          try {
            const j = JSON.parse(payload)
            if (j.type === "session") {
              landedSessionId = j.sessionId
              setActiveId(j.sessionId)
            } else if (j.type === "delta") {
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + j.text, streaming: true }
                }
                return next
              })
              // Sentence-stream into TTS so audio starts ~1s after the first
              // tokens land (much better than waiting for the full response).
              if (voiceEnabled) {
                voiceBuf += j.text
                const { chunks, leftover } = chopSentences(voiceBuf)
                voiceBuf = leftover
                for (const chunk of chunks) speakChunk(chunk)
              }
            } else if (j.type === "done") {
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === "assistant") {
                  next[next.length - 1] = { ...last, streaming: false }
                }
                return next
              })
              if (voiceEnabled && voiceBuf.trim().length >= 4) {
                speakChunk(voiceBuf.trim())
                voiceBuf = ""
              }
              if (j.quota) setQuota(j.quota)
            } else if (j.type === "error") {
              setError(j.error)
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      if (landedSessionId && landedSessionId !== activeId) refreshSessions()
      else refreshSessions()
    } catch (e: any) {
      setError(e?.message ?? "Stream failed")
      setMessages((prev) => prev.slice(0, -2))
    } finally {
      setStreaming(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showHero = messages.length === 0 && !streaming

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden md:flex flex-col rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Conversations
          </h2>
          <button
            type="button"
            onClick={newConversation}
            title="New conversation"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/15 text-emerald-400 transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-center py-6 px-3" style={{ color: "var(--text-secondary)" }}>
              No conversations yet — ask Aria something to get started.
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSession(s.id)}
              className="group w-full flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-colors hover:bg-[var(--bg-base)]"
              style={
                activeId === s.id
                  ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }
                  : { border: "1px solid transparent" }
              }
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: activeId === s.id ? "#10b981" : "var(--text-primary)" }}
                >
                  {s.title || "New conversation"}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {s.messageCount} message{s.messageCount === 1 ? "" : "s"}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/15 text-rose-400 cursor-pointer"
              >
                <Trash2 size={11} />
              </span>
            </button>
          ))}
        </div>

        {quota && (
          <div className="px-3 py-2.5 text-[10px]" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                {quota.tier === "premium" ? "Premium" : quota.tier === "pro" ? "Pro" : "Free"}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {quota.limit == null ? "Unlimited" : `${quota.used}/${quota.limit} today`}
              </span>
            </div>
            {quota.limit != null && (
              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, (quota.used / quota.limit) * 100)}%`,
                    background: quota.remaining === 0 ? "#f43f5e" : "#10b981",
                  }}
                />
              </div>
            )}
            {quota.tier !== "premium" && (
              <a
                href={quota.tier === "free" ? "/pro" : "/ai-tutor/upgrade"}
                className="mt-1.5 inline-block text-[10px] font-bold text-emerald-400 hover:underline"
              >
                Upgrade →
              </a>
            )}
          </div>
        )}
      </aside>

      {/* Chat pane */}
      <section className="flex-1 min-w-0 flex flex-col rounded-2xl overflow-hidden" style={cardStyle}>
        {/* Header */}
        <header className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="hidden sm:block" style={{ width: 44, height: 75 }}>
            <AriaAvatar size={44} speaking={speaking} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Aria
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-300 px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)" }}>
                AI Tutor
              </span>
              {speaking && (
                <span className="text-[10px] font-semibold text-emerald-400 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  speaking
                </span>
              )}
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Finance, investing, and markets — explained.
            </p>
          </div>
          <button
            type="button"
            onClick={() => persistVoicePref(!voiceEnabled)}
            title={voiceEnabled ? "Mute voice" : "Read responses aloud"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={
              voiceEnabled
                ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }
                : { background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
            }
          >
            {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">{voiceEnabled ? "Voice on" : "Voice off"}</span>
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {showHero && <AriaHero onPick={(q) => setInput(q)} />}

          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              streaming={!!m.streaming}
              onReplay={m.role === "assistant" && !m.streaming ? () => replayMessage(m.content) : undefined}
            />
          ))}

          {error && (
            <div className="rounded-xl px-3 py-2 text-xs"
              style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.35)", color: "#fb7185" }}>
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                quota?.remaining === 0
                  ? "Daily quota reached — upgrade to keep asking"
                  : "Ask Aria anything about finance, investing, or markets…"
              }
              maxLength={4000}
              disabled={streaming || quota?.remaining === 0}
              className="flex-1 bg-transparent outline-none resize-none px-2 py-1.5 text-sm"
              style={{ color: "var(--text-primary)", maxHeight: 200 }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || streaming || quota?.remaining === 0}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#10b981", color: "#0f1117" }}
            >
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--text-secondary)" }}>
            Aria is an educational tutor — not a licensed financial advisor. Decisions about your own money belong to you.
          </p>
        </div>
      </section>
    </div>
  )
}

function MessageBubble({
  role,
  content,
  streaming,
  onReplay,
}: {
  role: "user" | "assistant"
  content: string
  streaming: boolean
  onReplay?: () => void
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm whitespace-pre-wrap"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "var(--text-primary)" }}
        >
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start gap-2 group">
      <div className="flex-1 max-w-[88%]">
        <div className="rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed relative"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <MarkdownLite text={content} />
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-indigo-400 animate-pulse" aria-hidden />
          )}
          {onReplay && content.length > 0 && (
            <button
              type="button"
              onClick={onReplay}
              title="Read aloud"
              className="absolute -bottom-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <Play size={9} fill="currentColor" /> Read aloud
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Tiny markdown renderer — handles bold, inline code, fenced code blocks,
// and paragraph breaks. We deliberately avoid pulling in a full markdown lib
// since Aria's output is plain prose with occasional code.
function MarkdownLite({ text }: { text: string }) {
  // Split into code-block segments first so inline rules don't run inside code.
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const inner = part.replace(/^```\w*\n?|```$/g, "")
          return (
            <pre key={i} className="my-2 p-3 rounded-lg text-xs font-mono overflow-x-auto"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)" }}>
              <code>{inner}</code>
            </pre>
          )
        }
        return (
          <span key={i}>
            {renderInline(part)}
          </span>
        )
      })}
    </>
  )
}

function renderInline(text: string): React.ReactNode[] {
  // Process **bold**, `inline code`, paragraph breaks, and \n in that order.
  const out: React.ReactNode[] = []
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  let key = 0
  for (const tok of tokens) {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      out.push(<strong key={key++} className="font-semibold">{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      out.push(
        <code key={key++} className="px-1 py-0.5 rounded text-[12px] font-mono"
          style={{ background: "rgba(0,0,0,0.3)" }}>
          {tok.slice(1, -1)}
        </code>,
      )
    } else {
      // preserve newlines as <br/>
      const lines = tok.split("\n")
      lines.forEach((line, idx) => {
        if (idx > 0) out.push(<br key={key++} />)
        if (line) out.push(<span key={key++}>{line}</span>)
      })
    }
  }
  return out
}

const SUGGESTIONS = [
  "What's a short squeeze, in plain language?",
  "Explain dollar-cost averaging with a small example.",
  "How does the Fed setting interest rates affect stock prices?",
  "What's the difference between a market order and a limit order?",
]

function AriaHero({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="text-center py-10 px-4 max-w-xl mx-auto">
      <div className="flex justify-center mb-4">
        <AriaAvatar size={80} />
      </div>
      <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        Hi, I&apos;m Aria
      </h2>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ask me anything about finance, investing, markets, or the math behind them.
        I explain concepts — I don&apos;t give personalized investment advice.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="text-left text-xs px-3 py-2.5 rounded-xl transition-colors hover:bg-emerald-500/10"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <Sparkles size={11} className="inline-block mr-1.5 text-emerald-400" />
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
