import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ChatWindow from "@/components/messages/ChatWindow"
import CallButton from "@/components/messages/CallButton"
import ProBadge from "@/components/shared/ProBadge"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"

export default async function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  const { userId } = await params

  const partner = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, image: true, isPremium: true, isPro: true },
  })

  if (!partner) notFound()

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-800 flex-shrink-0">
        <Link href="/messages" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Link href={`/profile/${partner.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            {partner.image ? (
              <img src={partner.image} alt={partner.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User size={16} className="text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-100 group-hover:text-emerald-400 transition-colors truncate">
                {partner.name}
              </span>
              {partner.isPro && <ProBadge size="sm" />}
            </div>
            <p className="text-xs text-gray-500">@{partner.username}</p>
          </div>
        </Link>
        <CallButton partnerId={partner.id} />
      </div>

      {/* Chat window — client component handles polling + send */}
      <ChatWindow currentUserId={session!.user.id} partnerId={partner.id} />
    </div>
  )
}
