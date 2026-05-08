import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Navbar from "@/components/layout/Navbar"
import IncomingCallOverlay from "@/components/calls/IncomingCallOverlay"
import ChatDock from "@/components/chat/ChatDock"
import CommandPalette from "@/components/search/CommandPalette"
import ToastHost from "@/components/notifications/ToastHost"
import GuidedTour from "@/components/onboarding/GuidedTour"
import VerifyEmailBanner from "@/components/auth/VerifyEmailBanner"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  // The JWT cookie can lag behind DB after a username/name change. Always read
  // the canonical fields from the DB so the Navbar reflects the current values.
  const fresh = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, email: true, isPremium: true, isPro: true, emailVerifiedAt: true },
  })

  const navUser = {
    ...session.user,
    name: fresh?.name ?? session.user.name,
    username: fresh?.username ?? session.user.username,
    isPremium: fresh?.isPremium ?? session.user.isPremium,
    isPro: fresh?.isPro ?? false,
  }

  const needsVerification = !fresh?.emailVerifiedAt

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {needsVerification && fresh?.email && <VerifyEmailBanner email={fresh.email} />}
      <Navbar user={navUser} />
      <main className="pt-16">
        {children}
      </main>
      <IncomingCallOverlay />
      <ChatDock currentUserId={session.user.id} />
      <CommandPalette />
      <ToastHost />
      <GuidedTour />
    </div>
  )
}
