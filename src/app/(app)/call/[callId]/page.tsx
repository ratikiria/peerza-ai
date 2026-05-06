import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ActiveCallView from "@/components/calls/ActiveCallView"

export default async function CallPage({ params }: { params: Promise<{ callId: string }> }) {
  const session = await auth()
  const userId = session!.user.id
  const { callId } = await params

  const call = await db.call.findUnique({
    where: { id: callId },
    include: {
      initiator: { select: { id: true, name: true, username: true, image: true } },
      receiver: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  if (!call) notFound()

  const isInitiator = call.initiatorId === userId
  const isReceiver = call.receiverId === userId

  if (!isInitiator && !isReceiver) redirect("/feed")
  if (call.status === "ENDED" || call.status === "DECLINED" || call.status === "MISSED") {
    redirect("/messages")
  }

  const partner = isInitiator ? call.receiver : call.initiator

  return (
    <ActiveCallView
      callId={call.id}
      isInitiator={isInitiator}
      partner={partner}
      currentUserId={userId}
      kind={call.kind}
    />
  )
}
