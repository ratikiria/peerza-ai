"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { AtSign, Check, Loader2, Save, X } from "lucide-react"

interface Props {
  initialUsername: string
}

type CheckState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" } // same as the current username
  | { kind: "available" }
  | { kind: "invalid"; reason: string; suggestions: string[] }
  | { kind: "taken"; suggestions: string[] }

const cardStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
}

const inputStyle = {
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
}

export default function UsernameEditor({ initialUsername }: Props) {
  const { update: updateSession } = useSession()
  const [current, setCurrent] = useState(initialUsername)
  const [draft, setDraft] = useState(initialUsername)
  const [check, setCheck] = useState<CheckState>({ kind: "idle" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedFlash, setSavedFlash] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setError("")
    if (!draft) {
      setCheck({ kind: "idle" })
      return
    }
    if (draft === current) {
      setCheck({ kind: "current" })
      return
    }
    setCheck({ kind: "checking" })
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/username?u=${encodeURIComponent(draft)}`)
        const data = await res.json()
        if (data.current) setCheck({ kind: "current" })
        else if (data.valid && data.available) setCheck({ kind: "available" })
        else if (!data.valid)
          setCheck({ kind: "invalid", reason: data.reason ?? "Invalid username", suggestions: data.suggestions ?? [] })
        else setCheck({ kind: "taken", suggestions: data.suggestions ?? [] })
      } catch {
        setCheck({ kind: "idle" })
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draft, current])

  async function handleSave() {
    if (check.kind !== "available") return
    setSaving(true)
    setError("")
    const res = await fetch("/api/profile/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: draft }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 409 && Array.isArray(data.suggestions)) {
        setCheck({ kind: "taken", suggestions: data.suggestions })
        setError("Someone just took it — try a suggestion below.")
      } else {
        setError(data.error ?? "Failed to save")
      }
      setSaving(false)
      return
    }
    setCurrent(data.username)
    setDraft(data.username)
    setCheck({ kind: "current" })
    setSavedFlash(true)
    // Pass the new username explicitly so the JWT picks it up even if the
    // DB-refresh path inside the jwt callback misses for any reason.
    await updateSession({ username: data.username })
    // Hard reload so every server-rendered page (feed, sidebar, profile links)
    // re-reads the new session cookie — router.refresh() alone doesn't always
    // surface the new JWT to deeply cached layouts.
    setTimeout(() => {
      window.location.assign(`/profile/${data.username}`)
    }, 600)
  }

  function pickSuggestion(s: string) {
    setDraft(s)
  }

  return (
    <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Username
        </label>
        {savedFlash && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Check size={12} /> Saved
          </span>
        )}
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Your @handle. Lowercase letters, numbers, underscores. 3–20 characters.
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center rounded-xl overflow-hidden" style={inputStyle}>
          <span className="pl-3 pr-1 py-2.5 flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
            <AtSign size={14} />
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/\s/g, ""))}
            maxLength={20}
            className="flex-1 pl-1 pr-3 py-2.5 text-sm bg-transparent outline-none font-mono"
            style={{ color: "var(--text-primary)" }}
            placeholder="your_handle"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="pr-3 flex-shrink-0" aria-hidden="true">
            <StatusIcon state={check} />
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || check.kind !== "available"}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90"
          style={{ background: "#10b981", color: "#0f1117" }}
        >
          <Save size={14} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <StatusLine state={check} currentUsername={current} draft={draft} />

      {(check.kind === "taken" || check.kind === "invalid") && check.suggestions.length > 0 && (
        <div className="pt-1">
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Try one of these:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {check.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSuggestion(s)}
                className="text-xs font-mono px-2.5 py-1 rounded-full transition-all hover:opacity-90"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  color: "#10b981",
                }}
              >
                @{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-400 flex items-center gap-1">
          <X size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function StatusIcon({ state }: { state: CheckState }) {
  if (state.kind === "checking") return <Loader2 size={14} className="text-gray-500 animate-spin" />
  if (state.kind === "available") return <Check size={14} className="text-emerald-400" />
  if (state.kind === "taken" || state.kind === "invalid") return <X size={14} className="text-rose-400" />
  return null
}

function StatusLine({
  state,
  currentUsername,
  draft,
}: {
  state: CheckState
  currentUsername: string
  draft: string
}) {
  if (state.kind === "current") {
    return (
      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        That&apos;s your current username — change it to claim a new one.
      </p>
    )
  }
  if (state.kind === "available") {
    return (
      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
        <Check size={11} /> @{draft} is available — looks great.
      </p>
    )
  }
  if (state.kind === "taken") {
    return (
      <p className="text-[11px] text-amber-400">
        @{draft} is already taken.
      </p>
    )
  }
  if (state.kind === "invalid") {
    return <p className="text-[11px] text-rose-400">{state.reason}</p>
  }
  if (state.kind === "checking") {
    return (
      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Checking availability…
      </p>
    )
  }
  return (
    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
      Currently: <span className="font-mono text-emerald-400">@{currentUsername}</span>
    </p>
  )
}
