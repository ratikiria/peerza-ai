"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export interface PollData {
  id: string
  question: string
  options: string[]
  authorId: string
  votes: { userId: string; optionIndex: number }[]
}

interface PollCardProps {
  poll: PollData
  currentUserId: string
  isMe: boolean
}

export default function PollCard({ poll, currentUserId, isMe }: PollCardProps) {
  const [votes, setVotes] = useState(poll.votes)
  const [submitting, setSubmitting] = useState(false)

  const myVote = votes.find((v) => v.userId === currentUserId)
  const total = votes.length
  const leadingCount = poll.options.reduce((max, _, i) => {
    const c = votes.filter((v) => v.optionIndex === i).length
    return c > max ? c : max
  }, 0)

  async function vote(optionIndex: number) {
    if (submitting) return
    setSubmitting(true)
    const next = myVote?.optionIndex === optionIndex ? null : optionIndex
    setVotes((prev) => {
      const without = prev.filter((v) => v.userId !== currentUserId)
      return next === null ? without : [...without, { userId: currentUserId, optionIndex: next }]
    })
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex: next }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.votes)) setVotes(data.votes)
      }
    } catch {
      setVotes(poll.votes)
    } finally {
      setSubmitting(false)
    }
  }

  // Color tokens. Match the solid bubble look of regular text messages so the
  // poll has proper contrast against the chat background.
  const c = isMe
    ? {
        cardBg:    "#10b981",         // matches "me" text bubble
        question:  "#0f1117",
        rowBg:     "rgba(255,255,255,0.22)",
        rowFill:   "rgba(15,17,23,0.18)",
        rowFillMine: "rgba(15,17,23,0.34)",
        text:      "#0f1117",
        muted:     "rgba(15,17,23,0.70)",
        accent:    "#0f1117",
        radioDot:  "#10b981",
      }
    : {
        cardBg:    "#1f2937",         // matches "them" text bubble (gray-800)
        question:  "#ffffff",
        rowBg:     "rgba(255,255,255,0.08)",
        rowFill:   "rgba(16,185,129,0.28)",
        rowFillMine: "rgba(16,185,129,0.50)",
        text:      "#ffffff",
        muted:     "rgba(255,255,255,0.60)",
        accent:    "#10b981",
        radioDot:  "#0f1117",
      }

  return (
    <div
      className={cn("rounded-2xl p-3.5 space-y-3", isMe ? "rounded-tr-sm" : "rounded-tl-sm")}
      style={{ background: c.cardBg }}
    >
      <p className="text-sm font-semibold leading-snug" style={{ color: c.question }}>
        {poll.question}
      </p>

      <div className="space-y-1.5">
        {poll.options.map((opt, idx) => {
          const count = votes.filter((v) => v.optionIndex === idx).length
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const mine = myVote?.optionIndex === idx
          const leading = total > 0 && count === leadingCount && count > 0
          return (
            <button
              key={idx}
              type="button"
              onClick={() => vote(idx)}
              disabled={submitting}
              className="w-full text-left relative overflow-hidden rounded-xl transition-all disabled:opacity-60 hover:translate-y-[-1px] active:translate-y-0"
              style={{ background: c.rowBg }}
            >
              {/* Filled bar shows result */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300 ease-out rounded-xl"
                style={{
                  width: `${pct}%`,
                  background: mine ? c.rowFillMine : c.rowFill,
                }}
              />
              <div className="relative flex items-center gap-2.5 px-3 py-2">
                {/* Radio indicator */}
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all"
                  style={{
                    border: `2px solid ${mine ? c.accent : c.muted}`,
                    background: mine ? c.accent : "transparent",
                  }}
                >
                  {mine && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: c.radioDot }}
                    />
                  )}
                </span>

                <span
                  className="text-[13px] font-medium flex-1 min-w-0 truncate"
                  style={{ color: c.text, fontWeight: leading ? 600 : 500 }}
                >
                  {opt}
                </span>

                <span
                  className="text-[11px] font-semibold tabular-nums flex-shrink-0"
                  style={{ color: leading && total > 0 ? c.accent : c.muted }}
                >
                  {pct}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[10px] tabular-nums" style={{ color: c.muted }}>
        {total === 0 ? "No votes yet" : `${total} ${total === 1 ? "vote" : "votes"}`}
      </p>
    </div>
  )
}
