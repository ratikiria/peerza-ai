"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Save, X, Plus, Camera, User } from "lucide-react"

interface ProfileEditFormProps {
  initial: {
    name: string
    bio?: string | null
    image?: string | null
    coverImage?: string | null
    interests: string[]
    username: string
    links?: {
      twitter?: string; linkedin?: string; youtube?: string
      instagram?: string; facebook?: string; website?: string
    } | null
  }
}

async function resizeCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) { reject(new Error("Cover must be under 8 MB")); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX_W = 1600
        const ratio = Math.min(MAX_W / img.width, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const INTEREST_SUGGESTIONS = [
  "Stocks", "Crypto", "Forex", "ETFs", "Options", "Real Estate",
  "Bonds", "Commodities", "Day Trading", "Value Investing", "DeFi", "Web3",
]

async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("File too large. Max 5MB."))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 400
        let { width, height } = img
        if (width > height) {
          if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
        } else {
          if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProfileEditForm({ initial }: ProfileEditFormProps) {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial.name)
  const [bio, setBio] = useState(initial.bio ?? "")
  const [image, setImage] = useState(initial.image ?? "")
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? "")
  const [twitter, setTwitter] = useState(initial.links?.twitter ?? "")
  const [linkedin, setLinkedin] = useState(initial.links?.linkedin ?? "")
  const [youtube, setYoutube] = useState(initial.links?.youtube ?? "")
  const [instagram, setInstagram] = useState(initial.links?.instagram ?? "")
  const [facebook, setFacebook] = useState(initial.links?.facebook ?? "")
  const [website, setWebsite] = useState(initial.links?.website ?? "")
  const [interests, setInterests] = useState<string[]>(initial.interests)
  const [customInterest, setCustomInterest] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [uploadError, setUploadError] = useState("")

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  function addCustomInterest() {
    const trimmed = customInterest.trim()
    if (trimmed && !interests.includes(trimmed) && interests.length < 10) {
      setInterests((prev) => [...prev, trimmed])
      setCustomInterest("")
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError("")
    try {
      const base64 = await resizeImage(file)
      setImage(base64)
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to process image")
    }
    e.target.value = ""
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadError("")
    try {
      const base64 = await resizeCover(file)
      setCoverImage(base64)
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to process cover image")
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError("")

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        bio: bio.trim() || undefined,
        image: image || "",
        coverImage: coverImage || "",
        interests,
        links: {
          ...(twitter.trim()   && { twitter: twitter.trim() }),
          ...(linkedin.trim()  && { linkedin: linkedin.trim() }),
          ...(youtube.trim()   && { youtube: youtube.trim() }),
          ...(instagram.trim() && { instagram: instagram.trim() }),
          ...(facebook.trim()  && { facebook: facebook.trim() }),
          ...(website.trim()   && { website: website.trim() }),
        },
      }),
    })

    if (res.ok) {
      // Refresh the JWT so the new photo/name shows everywhere immediately
      await updateSession()
      router.push(`/profile/${initial.username}`)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed to save")
      setSaving(false)
    }
  }

  const cardStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
  }

  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-2xl mx-auto">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Cover photo upload */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cover photo</p>
          {coverImage && (
            <button type="button" onClick={() => setCoverImage("")}
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: "#ef4444" }}>
              <X size={11} /> Remove
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="w-full h-32 sm:h-40 rounded-xl overflow-hidden flex items-center justify-center transition-opacity hover:opacity-90 relative"
          style={{
            background: coverImage
              ? "transparent"
              : "linear-gradient(135deg, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.25) 50%, rgba(139,92,246,0.2) 100%)",
            border: "1px dashed var(--border)",
          }}
        >
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}>
              <Camera size={14} /> Click to upload a cover photo
            </span>
          )}
        </button>
        <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          Recommended: wide image, ~1600×400. Max 8 MB.
        </p>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </div>

      {/* Profile photo upload */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Profile photo</p>

        <div className="flex items-center gap-5">
          {/* Avatar preview */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "rgba(16,185,129,0.15)",
                border: "3px solid var(--border)",
              }}
            >
              {image ? (
                <img src={image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-emerald-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-colors hover:scale-110"
              style={{ background: "#10b981" }}
              title="Upload photo"
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>

          {/* Upload controls */}
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              Choose from computer
            </button>
            {image && (
              <button
                type="button"
                onClick={() => setImage("")}
                className="block text-xs transition-colors hover:text-rose-400"
                style={{ color: "var(--text-secondary)" }}
              >
                Remove photo
              </button>
            )}
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              JPG, PNG or GIF · Max 5MB · Resized to 400×400
            </p>
            {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Display name */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          className="w-full text-sm px-4 py-2.5 rounded-xl outline-none transition-all"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#10b981")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Bio */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Bio</label>
          <span className="text-xs" style={{ color: bio.length > 180 ? "#f59e0b" : "var(--text-secondary)" }}>
            {bio.length}/200
          </span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Tell others what you trade…"
          className="w-full text-sm px-4 py-2.5 rounded-xl outline-none resize-none leading-relaxed transition-all"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#10b981")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Financial interests */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Financial interests
          </label>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{interests.length}/10</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {INTEREST_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => toggleInterest(s)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: interests.includes(s) ? "rgba(16,185,129,0.2)" : "var(--bg-base)",
                border: `1px solid ${interests.includes(s) ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
                color: interests.includes(s) ? "#10b981" : "var(--text-secondary)",
              }}>
              {s}
            </button>
          ))}
        </div>

        {interests.filter((i) => !INTEREST_SUGGESTIONS.includes(i)).map((i) => (
          <span key={i}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full mr-2"
            style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}>
            {i}
            <button type="button" onClick={() => toggleInterest(i)}><X size={10} /></button>
          </span>
        ))}

        {interests.length < 10 && (
          <div className="flex gap-2">
            <input
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInterest())}
              placeholder="Add custom interest…"
              maxLength={30}
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button type="button" onClick={addCustomInterest}
              disabled={!customInterest.trim()}
              className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 transition-colors">
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Social links */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Links</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Type just the username/handle — we&apos;ll build the full link. Or paste a full URL.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <LinkRow label="X (Twitter)" prefix="x.com/"
            value={twitter} onChange={setTwitter} placeholder="username" />
          <LinkRow label="LinkedIn" prefix="linkedin.com/in/"
            value={linkedin} onChange={setLinkedin} placeholder="username" />
          <LinkRow label="YouTube" prefix="youtube.com/@"
            value={youtube} onChange={setYoutube} placeholder="channel" />
          <LinkRow label="Instagram" prefix="instagram.com/"
            value={instagram} onChange={setInstagram} placeholder="username" />
          <LinkRow label="Facebook" prefix="facebook.com/"
            value={facebook} onChange={setFacebook} placeholder="username" />
          <LinkRow label="Website" prefix=""
            value={website} onChange={setWebsite} placeholder="https://yoursite.com" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90"
          style={{ background: "#10b981", color: "#0f1117" }}>
          <Save size={16} />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  )
}

function LinkRow({ label, prefix, value, onChange, placeholder }: {
  label: string; prefix: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wide block mb-1"
        style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="flex items-center rounded-xl overflow-hidden"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
        {prefix && (
          <span className="text-[11px] pl-3 pr-1 py-2 flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}>{prefix}</span>
        )}
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 ${prefix ? "pl-1" : "pl-3"} pr-3 py-2 text-sm bg-transparent outline-none`}
          style={{ color: "var(--text-primary)" }} />
      </div>
    </div>
  )
}
