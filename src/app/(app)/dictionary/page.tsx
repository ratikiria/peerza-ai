import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import LeftPanel from "@/components/layout/LeftPanel"
import DictionaryClient from "@/components/dictionary/DictionaryClient"

export const metadata = {
  title: "Economic Dictionary — Peerza.ai",
  description: "Plain-language explanations of every economic indicator that moves markets. Available in English, Georgian, Russian, Turkish, and Spanish.",
}

export default async function DictionaryPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, coverImage: true, isPremium: true, isPro: true },
  })

  const freshUser = {
    ...session.user,
    name: me?.name ?? session.user.name,
    username: me?.username ?? session.user.username,
    isPremium: me?.isPremium ?? session.user.isPremium,
    isPro: me?.isPro ?? false,
    coverImage: me?.coverImage ?? null,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-5">
        <LeftPanel user={freshUser} />
        <div className="flex-1 min-w-0">
          <DictionaryClient />
        </div>
      </div>
    </div>
  )
}
