import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// In-memory signaling store — works for single-server dev/MVP environments
// Key = callId, value = WebRTC signal data
const store = new Map<
  string,
  {
    offer?: string
    answer?: string
    initiatorCandidates: string[]
    receiverCandidates: string[]
  }
>()

function getOrCreate(callId: string) {
  if (!store.has(callId)) {
    store.set(callId, { initiatorCandidates: [], receiverCandidates: [] })
  }
  return store.get(callId)!
}

// GET /api/calls/signal/[callId] — poll for signal data
export async function GET(_req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { callId } = await params
  const call = await db.call.findUnique({ where: { id: callId } })
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isParticipant = call.initiatorId === session.user.id || call.receiverId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const data = getOrCreate(callId)
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ callId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { callId } = await params
  const call = await db.call.findUnique({ where: { id: callId } })
  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isParticipant = call.initiatorId === session.user.id || call.receiverId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const isInitiator = call.initiatorId === session.user.id
  const body = await req.json()
  const data = getOrCreate(callId)

  if (body.offer && isInitiator) data.offer = body.offer
  if (body.answer && !isInitiator) data.answer = body.answer
  if (body.candidate) {
    if (isInitiator) data.initiatorCandidates.push(body.candidate)
    else data.receiverCandidates.push(body.candidate)
  }
  if (body.clear) store.delete(callId)

  return NextResponse.json({ ok: true })
}
