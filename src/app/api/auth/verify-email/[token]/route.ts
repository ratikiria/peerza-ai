import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host") || "peerza.ai"}`

  const record = await db.emailVerificationToken.findUnique({ where: { token } })

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.redirect(`${baseUrl}/login?verify=expired`)
  }

  await db.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() },
  })

  await db.emailVerificationToken.deleteMany({ where: { userId: record.userId } })

  return NextResponse.redirect(`${baseUrl}/feed?verified=1`)
}
