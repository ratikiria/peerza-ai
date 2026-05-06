import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import EconomicCalendar from "@/components/calendar/EconomicCalendar"
import CalendarRightPanel from "@/components/calendar/CalendarRightPanel"
import LeftPanel from "@/components/layout/LeftPanel"

export const metadata = {
  title: "Economic Calendar — Peerza.ai",
  description: "Upcoming central-bank decisions, CPI prints, jobs reports, and macro data — across the world's biggest economies.",
}

export default async function CalendarPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Same fresh-from-DB pattern as /feed — JWT can lag for username/name/isPro.
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
          <EconomicCalendar />
        </div>
        <CalendarRightPanel />
      </div>
    </div>
  )
}
