import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import {
  ARIA_MODEL,
  ARIA_SYSTEM_PROMPT,
  getAnthropic,
  isAriaConfigured,
  toAnthropicMessages,
  type AriaMessage,
} from "@/lib/ai-tutor"
import { checkAndIncrementQuota } from "@/lib/ai-quota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  // Client sends null when starting a new conversation — accept null OR omitted.
  sessionId: z.string().nullable().optional(),
  content: z.string().min(1).max(4000),
})

// Streams Aria's response as Server-Sent Events.
// Event shapes:
//   data: {"type":"session","sessionId":"..."}
//   data: {"type":"delta","text":"..."}
//   data: {"type":"done","quota":{...}}
//   data: {"type":"error","error":"..."}
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isAriaConfigured()) {
    return NextResponse.json(
      { error: "AI Tutor not configured. Set ANTHROPIC_API_KEY in .env to enable." },
      { status: 503 },
    )
  }

  const body = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Quota check BEFORE we open the stream — fail fast if user is rate limited.
  const quota = await checkAndIncrementQuota(session.user.id)
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.reason, quota: quota.status },
      { status: 429 },
    )
  }

  // Load or create the AISession row.
  let aiSession
  if (body.data.sessionId) {
    aiSession = await db.aISession.findFirst({
      where: { id: body.data.sessionId, userId: session.user.id },
    })
    if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  } else {
    aiSession = await db.aISession.create({
      data: { userId: session.user.id, messages: [] },
    })
  }

  const history: AriaMessage[] = Array.isArray(aiSession.messages)
    ? (aiSession.messages as unknown as AriaMessage[])
    : []
  history.push({ role: "user", content: body.data.content })

  const anthropic = getAnthropic()!
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      // Tell client which session it's writing to (for new conversations).
      send({ type: "session", sessionId: aiSession.id })

      let assistantText = ""
      try {
        // Prompt-cache the system prompt — the cache write happens on the
        // first request and every subsequent request reads at ~10x discount.
        const aria = anthropic.messages.stream({
          model: ARIA_MODEL,
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system: [
            {
              type: "text",
              text: ARIA_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: toAnthropicMessages(history),
        })

        aria.on("text", (delta) => {
          assistantText += delta
          send({ type: "delta", text: delta })
        })

        const finalMessage = await aria.finalMessage()

        // Persist the full turn (user + assistant) so reloading the session
        // shows the conversation.
        history.push({ role: "assistant", content: assistantText })
        await db.aISession.update({
          where: { id: aiSession.id },
          data: { messages: history as unknown as object },
        })

        send({
          type: "done",
          quota: quota.status,
          usage: {
            input: finalMessage.usage.input_tokens,
            output: finalMessage.usage.output_tokens,
            cacheRead: finalMessage.usage.cache_read_input_tokens ?? 0,
            cacheWrite: finalMessage.usage.cache_creation_input_tokens ?? 0,
          },
        })
      } catch (e: any) {
        console.error("[ai-tutor stream]", e)
        send({ type: "error", error: e?.message ?? "Stream failed" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
