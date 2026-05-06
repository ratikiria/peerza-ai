import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getEconomicEvents } from "@/lib/calendar"

export const runtime = "nodejs"

// Format date to YYYY-MM-DD for FMP. Always use UTC so caching is consistent.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function clampWindow(window: string | null): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(now)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from)

  switch (window) {
    case "today":
      to.setUTCDate(to.getUTCDate() + 1)
      break
    case "week":
      to.setUTCDate(to.getUTCDate() + 7)
      break
    case "30d":
      to.setUTCDate(to.getUTCDate() + 30)
      break
    default: // "7d" — default rolling 7-day view
      to.setUTCDate(to.getUTCDate() + 7)
  }
  return { from, to }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const window = url.searchParams.get("window")
  const { from, to } = clampWindow(window)

  const payload = await getEconomicEvents(isoDate(from), isoDate(to))
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=300" }, // 5-min browser cache
  })
}
