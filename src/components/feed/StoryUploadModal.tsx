"use client"

import { useState, useRef } from "react"
import { X, ImageIcon, Send } from "lucide-react"

async function resizeStory(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 20 * 1024 * 1024) { reject(new Error("Max 20MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 900
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.88))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface StoryUploadModalProps {
  onClose: () => void
  onUploaded: () => void
}

export default function StoryUploadModal({ onClose, onUploaded }: StoryUploadModalProps) {
  const [preview, setPreview]   = useState<string | null>(null)
  const [caption, setCaption]   = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPreview(await resizeStory(file))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
    e.target.value = ""
  }

  async function handleShare() {
    if (!preview || uploading) return
    setUploading(true)
    setError(null)
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: preview,
          ...(caption.trim() ? { caption: caption.trim() } : {}),
        }),
      })
      if (!res.ok) { setError("Failed to share story"); return }
      onUploaded()
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden w-full max-w-md"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Add to Your Story
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-base)] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Preview area — Facebook/Instagram-style 9:16 frame: foreground image
            preserved (`object-contain`), empty space filled with a blurred
            copy of the same image so the preview matches what the viewer
            will see. */}
        {preview ? (
          <div
            className="relative mx-auto overflow-hidden"
            style={{ aspectRatio: "9 / 16", width: "min(360px, 90%)", background: "#000" }}
          >
            {/* Blurred background fill */}
            <img
              src={preview}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
            />
            {/* Foreground — full image, never cropped */}
            <img
              src={preview}
              alt="Story preview"
              className="absolute inset-0 w-full h-full object-contain"
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 cursor-pointer transition-colors hover:bg-[var(--bg-base)]"
            onClick={() => fileRef.current?.click()}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <ImageIcon size={28} className="text-emerald-400" />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Choose a photo
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Tap to select from your device
            </p>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {/* Caption + actions */}
        <div className="px-5 py-4 space-y-3">
          {preview && (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption… (optional)"
              maxLength={200}
              className="w-full bg-transparent text-sm outline-none px-3 py-2.5 rounded-xl"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2">
            {!preview && (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
              >
                <ImageIcon size={15} />
                Select photo
              </button>
            )}
            {preview && (
              <button
                onClick={handleShare}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#10b981", color: "#0f1117" }}
              >
                <Send size={14} />
                {uploading ? "Sharing…" : "Share story"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
