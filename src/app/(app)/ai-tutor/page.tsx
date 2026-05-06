import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAriaConfigured } from "@/lib/ai-tutor"
import AriaChat from "@/components/ai-tutor/AriaChat"
import Link from "next/link"

export const metadata = {
  title: "Aria · AI Tutor — Peerza.ai",
  description: "Ask Aria anything about finance, investing, and markets. Explanations, not advice.",
}

export default async function AITutorPage() {
  const session = await auth()
  if (!session) redirect("/login")

  if (!isAriaConfigured()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>AI Tutor — coming online</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Aria is configured but missing the Anthropic API key. Add{" "}
          <code className="text-emerald-400">ANTHROPIC_API_KEY</code> to <code>.env</code> to switch her on.
        </p>
        <Link href="/feed" className="inline-block text-emerald-400 hover:underline text-sm">← Back to feed</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <AriaChat />
    </div>
  )
}
