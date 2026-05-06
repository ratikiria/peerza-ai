import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { User, Heart, MessageCircle, UserPlus, Bell, Swords } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

const notificationMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  FOLLOW: {
    label: "followed you",
    icon: <UserPlus size={14} />,
    color: "text-emerald-400 bg-emerald-500/10",
  },
  CONNECTION_REQUEST: {
    label: "sent you a connection request",
    icon: <UserPlus size={14} />,
    color: "text-blue-400 bg-blue-500/10",
  },
  CONNECTION_ACCEPTED: {
    label: "accepted your connection request",
    icon: <UserPlus size={14} />,
    color: "text-blue-400 bg-blue-500/10",
  },
  POST_LIKE: {
    label: "liked your post",
    icon: <Heart size={14} />,
    color: "text-rose-400 bg-rose-500/10",
  },
  POST_COMMENT: {
    label: "commented on your post",
    icon: <MessageCircle size={14} />,
    color: "text-amber-400 bg-amber-500/10",
  },
  POST_SHARE: {
    label: "shared your post",
    icon: <MessageCircle size={14} />,
    color: "text-purple-400 bg-purple-500/10",
  },
  MESSAGE: {
    label: "sent you a message",
    icon: <MessageCircle size={14} />,
    color: "text-sky-400 bg-sky-500/10",
  },
  CALL: {
    label: "called you",
    icon: <Bell size={14} />,
    color: "text-orange-400 bg-orange-500/10",
  },
  GAME_DUEL_INVITE: {
    label: "challenged you to a game duel",
    icon: <Swords size={14} />,
    color: "text-indigo-400 bg-indigo-500/10",
  },
  GAME_DUEL_RESULT: {
    label: "finished your duel",
    icon: <Swords size={14} />,
    color: "text-emerald-400 bg-emerald-500/10",
  },
}

export default async function NotificationsPage() {
  const session = await auth()

  const notifications = await db.notification.findMany({
    where: { receiverId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      triggerer: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  })

  // Mark all as read (fire-and-forget — no await needed for UI)
  db.notification.updateMany({
    where: { receiverId: session!.user.id, isRead: false },
    data: { isRead: true },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-100">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const meta = notificationMeta[n.type] ?? {
              label: n.type.toLowerCase().replace(/_/g, " "),
              icon: <Bell size={14} />,
              color: "text-gray-400 bg-gray-800",
            }
            const href =
              n.type === "GAME_DUEL_INVITE" || n.type === "GAME_DUEL_RESULT"
                ? "/games/duels"
                : n.entityId
                ? n.type.includes("POST")
                  ? `/posts/${n.entityId}`
                  : `/profile/${n.triggerer.username}`
                : `/profile/${n.triggerer.username}`

            return (
              <Link
                key={n.id}
                href={href}
                className={`flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-gray-800/50 ${
                  !n.isRead ? "bg-gray-900 border border-gray-800" : "bg-gray-900/50 border border-transparent"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    {n.triggerer.image ? (
                      <img
                        src={n.triggerer.image}
                        alt={n.triggerer.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={18} className="text-emerald-400" />
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${meta.color}`}>
                    {meta.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">
                    <span className="font-semibold">{n.triggerer.name}</span>{" "}
                    <span className="text-gray-400">{meta.label}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
