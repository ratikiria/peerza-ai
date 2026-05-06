"use client"

import { useState, useRef } from "react"
import { X, Camera, Upload } from "lucide-react"

async function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) { reject(new Error("Max 8MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const SIZE = 400
        const canvas = document.createElement("canvas")
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext("2d")!
        // Center-crop to square
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface AvatarUploadModalProps {
  currentImage?: string | null
  onClose: () => void
  onUpdated: (newImageUrl: string) => void
}

export default function AvatarUploadModal({ currentImage, onClose, onUpdated }: AvatarUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPreview(await resizeAvatar(file))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
    e.target.value = ""
  }

  async function handleSave() {
    if (!preview || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      })
      if (!res.ok) { setError("Failed to update photo"); return }
      const data = await res.json()
      // Pass a versioned URL for immediate in-session visual feedback.
      // On any refresh the JWT always points to /api/avatar/userId which reads DB fresh (no-store).
      onUpdated(`/api/avatar/${data.id}?v=${Date.now()}`)
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Update Profile Photo
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-base)] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center">
          <div
            className="relative cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              {(preview || currentImage) ? (
                <img src={preview ?? currentImage!} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={28} className="text-emerald-400" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <Upload size={15} />
          Choose photo
        </button>

        {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

        {preview && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "#10b981", color: "#0f1117" }}
          >
            {saving ? "Saving…" : "Save photo"}
          </button>
        )}
      </div>
    </div>
  )
}
