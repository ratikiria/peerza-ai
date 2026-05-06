"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2 } from "lucide-react"

export const PICKER_W = 340
export const PICKER_H = 340

interface Gif { id: string; title: string; preview: string; original: string }

interface GifPickerProps {
  onSelect: (url: string) => void
  onClose:  () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery]     = useState("")
  const [gifs, setGifs]       = useState<Gif[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadGifs("")
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadGifs(query), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function loadGifs(q: string) {
    setLoading(true)
    try {
      const url = q.trim() ? `/api/gifs?q=${encodeURIComponent(q)}` : "/api/gifs"
      const res = await fetch(url)
      if (res.ok) setGifs(await res.json())
      else setGifs([])
    } catch { setGifs([]) }
    setLoading(false)
  }

  const label = query.trim() ? `"${query}"` : "Trending"

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
      style={{
        width:      PICKER_W,
        height:     PICKER_H,
        background: "var(--bg-card)",
        border:     "1px solid var(--border)",
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <Search size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {loading
          ? <Loader2 size={13} className="animate-spin text-emerald-400 flex-shrink-0" />
          : query
            ? <button onClick={() => setQuery("")} style={{ color: "var(--text-secondary)" }}>
                <X size={13} />
              </button>
            : null
        }
      </div>

      {/* Label */}
      <div className="px-3 pt-2 pb-0.5 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>

      {/* Grid */}
      <div className="overflow-y-auto flex-1 px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={22} className="animate-spin text-emerald-400" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-2xl">🔍</span>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {query ? "No GIFs found" : "Search to find GIFs"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 pt-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.original); onClose() }}
                className="rounded-lg overflow-hidden hover:opacity-80 hover:scale-[1.03] transition-all aspect-video"
                style={{ background: "var(--bg-base)" }}
              >
                <img src={gif.preview} alt={gif.title}
                  className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 flex justify-end flex-shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}>
        <span className="text-[9px]" style={{ color: "var(--text-secondary)", opacity: 0.35 }}>
          Powered by GIPHY
        </span>
      </div>
    </div>
  )
}
