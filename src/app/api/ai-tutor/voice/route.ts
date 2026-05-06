import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { ELEVENLABS_MODEL, getVoiceId, isVoiceConfigured } from "@/lib/voice"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  // ElevenLabs accepts up to 5000 chars per call; we cap shorter so latency
  // stays low for the sentence-stream pattern in AriaChat.
  text: z.string().min(1).max(2000),
  voiceId: z.string().optional(),
})

// POST /api/ai-tutor/voice — proxies text → ElevenLabs streaming TTS.
// Audio is streamed straight back to the browser as audio/mpeg so the
// client can pipe it into <audio> as it arrives.
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isVoiceConfigured()) {
    return NextResponse.json(
      { error: "Voice not configured. Set ELEVENLABS_API_KEY in .env to enable." },
      { status: 503 },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const voiceId = parsed.data.voiceId ?? getVoiceId()
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: parsed.data.text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.45,         // a touch of natural variation
        similarity_boost: 0.75,  // stay close to the voice's identity
        style: 0.35,             // mildly expressive (tutoring tone)
        use_speaker_boost: true,
      },
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "")
    console.error("[elevenlabs]", upstream.status, errText.slice(0, 300))
    return NextResponse.json(
      { error: `Voice API error (${upstream.status})` },
      { status: 502 },
    )
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  })
}
