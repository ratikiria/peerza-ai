"use client"

import { useState } from "react"
import { Camera, User } from "lucide-react"
import AvatarUploadModal from "./AvatarUploadModal"

interface ProfilePhotoButtonProps {
  user: { id: string; name: string; image?: string | null }
  size?: number
  borderColor?: string
}

export default function ProfilePhotoButton({ user, size = 48, borderColor = "var(--bg-card)" }: ProfilePhotoButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [image, setImage] = useState(user.image)

  return (
    <>
      <div
        className="relative group cursor-pointer flex-shrink-0"
        style={{ width: size, height: size, borderRadius: "9999px", border: `3px solid ${borderColor}` }}
        onClick={() => setShowModal(true)}
        title="Change profile photo"
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: "rgba(16,185,129,0.15)" }}
        >
          {image ? (
            <img src={image} alt={user.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            <User size={Math.round(size * 0.38)} className="text-emerald-400" />
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera size={Math.round(size * 0.27)} className="text-white" />
        </div>
      </div>

      {showModal && (
        <AvatarUploadModal
          currentImage={image}
          onClose={() => setShowModal(false)}
          onUpdated={(url) => setImage(url)}
        />
      )}
    </>
  )
}
