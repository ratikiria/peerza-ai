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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${user.username}`} className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-100">Edit profile</h1>
      </div>
      <UsernameEditor initialUsername={user.username} />
      <ProfileEditForm initial={{ ...user, links: user.links as { twitter?: string; linkedin?: string; youtube?: string; website?: string } | null }} />
    </div>
  )
}
