import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Liveness + DB connectivity check. Railway hits this on every deploy and
// at intervals afterward. Keep it cheap — no auth, no heavy queries.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json(
      { ok: true, ts: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: "db_unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
