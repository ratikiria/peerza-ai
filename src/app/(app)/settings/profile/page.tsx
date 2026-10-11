import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ProfileEditForm from "@/components/settings/ProfileEditForm"
import UsernameEditor from "@/components/settings/UsernameEditor"

export default async function EditProfilePage() {
  const session = await auth()

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, username: true, bio: true, image: true, coverImage: true, interests: true, links: true },
  })

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-6">
      <div className="flex items-center gap-1">
        <Link href={`/profile/${user.username}`} aria-label="Back to profile" className="w-11 h-11 -ml-2.5 flex items-center justify-center rounded-full transition-colors" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Edit profile</h1>
      </div>
      <UsernameEditor initialUsername={user.username} />
      <ProfileEditForm initial={{ ...user, links: user.links as { twitter?: string; linkedin?: string; youtube?: string; website?: string } | null }} />
    </div>
  )
}
