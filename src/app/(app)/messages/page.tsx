import { auth } from "@/lib/auth"
import ConversationList from "@/components/messages/ConversationList"
import NewChatButton from "@/components/messages/NewChatButton"

export default async function MessagesPage() {
  const session = await auth()

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Messages</h1>
        <NewChatButton />
      </div>
      <ConversationList currentUserId={session!.user.id} />
    </div>
  )
}
