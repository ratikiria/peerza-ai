import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Navbar from "@/components/layout/Navbar"
import TickerTape from "@/components/layout/TickerTape"
import MobileTabBar from "@/components/layout/MobileTabBar"
import IncomingCallOverlay from "@/components/calls/IncomingCallOverlay"
import ChatDock from "@/components/chat/ChatDock"
import CommandPalette from "@/components/search/CommandPalette"
import ToastHost from "@/components/notifications/ToastHost"
import GuidedTour from "@/components/onboarding/GuidedTour"
import VerifyEmailBanner from "@/components/auth/VerifyEmailBanner"
import ProTrialEndedBanner from "@/components/peerz/ProTrialEndedBanner"
import { endedProTrialToOffer } from "@/lib/peerz-server"

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

  const trialRef = fresh && !fresh.isPro ? await endedProTrialToOffer(session.user.id) : null

  return (
    <div className="min-h-screen isolate" style={{ background: "var(--bg-base)" }}>
      <div className="pz-backdrop" aria-hidden="true" />
      <Navbar user={navUser} />
      <TickerTape />
      {/* Bottom padding on phones keeps content clear of the floating tab bar. */}
      <main className="pz-main" style={{ paddingTop: "var(--chrome-h)" }}>
        {needsVerification && fresh?.email && <VerifyEmailBanner email={fresh.email} />}
        {trialRef && <ProTrialEndedBanner trialRef={trialRef} />}
        {children}
      </main>
      <MobileTabBar user={{ name: navUser.name, username: navUser.username, image: navUser.image }} />
      <IncomingCallOverlay />
      <ChatDock currentUserId={session.user.id} />
      <CommandPalette />
      <ToastHost />
      <GuidedTour />
    </div>
  )
}
