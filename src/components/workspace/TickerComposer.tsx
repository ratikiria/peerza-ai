"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, Send, Image as ImageIcon, X, Loader2 } from "lucide-react"

type Direction = "bullish" | "bearish" | "neutral"
type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M"

interface Props {
  ticker: string
  onPosted: () => void
  onClose: () => void
}

const TIMEFRAMES: Timeframe[] = ["1H", "4H", "1D", "1W", "1M"]

export default function TickerComposer({ ticker, onPosted, onClose }: Props) {
  const [content, setContent]       = useState("")
  const [direction, setDirection]   = useState<Direction>("neutral")
  const [conviction, setConviction] = useState<number>(3)
  const [timeframe, setTimeframe]   = useState<Timeframe>("1D")
  const [imageUrl, setImageUrl]     = useState<string | null>(null)
  const [crossPost, setCrossPost]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!content.trim()) {
      setError("Write something first")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl ?? undefined,
          analysis: {
            ticker,
            direction,
            timeframe,
            conviction,
          },
          tickerOnly: !crossPost,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Could not post")
        setSubmitting(false)
        return
      }
      onPosted()
      onClose()
    } catch {
      setError("Could not post")
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}>
          New idea on ${ticker}
        </p>
        <button
          onClick={() => { setError(null); onClose() }}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Close composer"
        >
          <X size={11} />
        </button>
      </div>

      {/* Direction pills */}
      <div className="flex gap-1">
        <DirChip value="bullish" current={direction} onClick={setDirection} />
        <DirChip value="neutral" current={direction} onClick={setDirection} />
        <DirChip value="bearish" current={direction} onClick={setDirection} />
      </div>

      {/* Timeframe + conviction */}
      <div className="flex items-center gap-2">
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="text-[10px] px-2 py-1 rounded-md outline-none"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <div className="flex items-center gap-0.5 ml-auto">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setConviction(v)}
              className="w-4 h-4 flex items-center justify-center"
              title={`Conviction ${v}/5`}
              aria-label={`Conviction ${v} out of 5`}
            >
              <span style={{
                fontSize: 12,
                color: v <= conviction ? "#eab308" : "var(--text-secondary)",
                opacity: v <= conviction ? 1 : 0.4,
              }}>★</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`What's your take on $${ticker}?`}
        rows={3}
        maxLength={1000}
        className="w-full text-xs px-3 py-2 rounded-xl outline-none resize-none"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {/* Image preview */}
      {imageUrl && (
        <div className="relative">
          <img src={imageUrl} alt="attached" className="w-full rounded-lg max-h-32 object-cover" />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            aria-label="Remove image"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Cross-post toggle */}
      <label className="flex items-start gap-2 cursor-pointer text-[11px]"
        style={{ color: "var(--text-secondary)" }}>
        <input
          type="checkbox"
          checked={crossPost}
          onChange={(e) => setCrossPost(e.target.checked)}
          className="mt-0.5 accent-emerald-500"
        />
        <span>
          <strong style={{ color: "var(--text-primary)" }}>Cross-post to main feed</strong>
          <br />
          <span className="opacity-80">
            {crossPost
              ? "Followers will see this in their home feed."
              : `Only people viewing $${ticker} will see this.`}
          </span>
        </span>
      </label>

      {error && (
        <p className="text-[10px] text-rose-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <label
          className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer hover:bg-[var(--bg-base)]"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          title="Attach image"
        >
          <ImageIcon size={12} />
          <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </label>
        <span className="text-[10px] tabular-nums ml-auto" style={{ color: "var(--text-secondary)" }}>
          {content.length}/1000
        </span>
        <button
          onClick={submit}
          disabled={submitting || !content.trim()}
          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {submitting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  )
}

function DirChip({
  value, current, onClick,
}: {
  value: Direction
  current: Direction
  onClick: (v: Direction) => void
}) {
  const active = current === value
  const color = value === "bullish" ? "#10b981" : value === "bearish" ? "#ef4444" : "#eab308"
  const Icon = value === "bullish" ? TrendingUp : value === "bearish" ? TrendingDown : Minus
  return (
    <button
      onClick={() => onClick(value)}
      className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all"
      style={{
        background: active ? `${color}22` : "var(--bg-base)",
        color: active ? color : "var(--text-secondary)",
        border: `1px solid ${active ? color : "var(--border)"}`,
      }}
    >
      <Icon size={10} /> {value}
    </button>
  )
}
