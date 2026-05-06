import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getPrefs, setPrefs, NOTIFICATION_KEYS, NotificationKey } from "@/lib/notification-prefs"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const prefs = await getPrefs(session.user.id)
  return NextResponse.json({ prefs })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const sanitized: Partial<Record<NotificationKey, boolean>> = {}
  for (const key of NOTIFICATION_KEYS) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === "boolean") sanitized[key] = v
  }

  const prefs = await setPrefs(session.user.id, sanitized)
  return NextResponse.json({ prefs })
}
