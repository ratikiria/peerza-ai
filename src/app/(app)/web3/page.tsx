import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import LeftPanel from "@/components/layout/LeftPanel"
import Web3Page from "@/components/web3/Web3Page"

export const metadata: Metadata = {
  title: "Web3 · Peerza.ai",
  description: "On-chain achievements, prediction stakes, and creator tipping powered by Solana.",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login")

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, image: true, coverImage: true, isPremium: true, isPro: true },
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
          <Web3Page />
        </div>
      </div>
    </div>
  )
}
