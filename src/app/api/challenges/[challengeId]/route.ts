import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
      _count: { select: { participants: true } },
      participants: {
        where: { userId: session.user.id },
        select: { id: true, cashBalance: true },
      },
    },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip password from response
  const { password: _, ...safe } = challenge;

  return NextResponse.json({ challenge: safe });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.challenge.delete({ where: { id: challengeId } });

  return NextResponse.json({ success: true });
}
