"use client"

import { useState } from "react"
import { X, Plus, Loader2, BarChart3 } from "lucide-react"

interface PollComposerDialogProps {
  onCreate: (pollId: string, question: string) => void
  onClose: () => void
}

export default function PollComposerDialog({ onCreate, onClose }: PollComposerDialogProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0)
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= 2 && !submitting

  function setOption(i: number, value: string) {
    setOptions((prev) => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }
  function addOption() {
    if (options.length >= 6) return
    setOptions((prev) => [...prev, ""])
  }
  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), options: trimmedOptions }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Failed to create poll")
        setSubmitting(false)
        return
      }
      const { id } = await res.json()
      onCreate(id, question.trim())
    } catch {
      setError("Network error — please try again")
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Create poll</h3>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
              style={{ color: "var(--text-secondary)" }}>
              Question
            </label>
            <input
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={280}
              placeholder="Ask something…"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1.5"
              style={{ color: "var(--text-secondary)" }}>
              Options ({trimmedOptions.length}/6)
            </label>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={80}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                      title="Remove option"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--bg-base)]"
                style={{ color: "#10b981" }}
              >
                <Plus size={11} /> Add option
              </button>
            )}
          </div>

          {error && (
            <p className="text-[11px] text-rose-400">{error}</p>
          )}
        </div>

        <div className="px-4 py-3 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--bg-base)]"
            style={{ color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            {submitting && <Loader2 size={11} className="animate-spin" />}
            Create poll
          </button>
        </div>
      </div>
    </div>
  )
}
