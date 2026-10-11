import { auth } from "@/lib/auth"
import ConversationList from "@/components/messages/ConversationList"
import NewChatButton from "@/components/messages/NewChatButton"

export default async function MessagesPage() {
  const session = await auth()

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] md:text-xl font-bold" style={{ color: "var(--text-primary)" }}>Messages</h1>
        <NewChatButton />
      </div>
      <ConversationList currentUserId={session!.user.id} />
    </div>
  )
}
