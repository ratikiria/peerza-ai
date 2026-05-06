import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const body = await req.json().catch(() => ({}));

  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { _count: { select: { participants: true } } },
  });

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status === "ENDED")
    return NextResponse.json({ error: "Challenge has ended" }, { status: 400 });
  if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants)
    return NextResponse.json({ error: "Challenge is full" }, { status: 400 });
  if (challenge.type === "PASSWORD_PROTECTED") {
    if (!body.password || body.password !== challenge.password)
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  const existing = await db.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already joined" }, { status: 400 });

  const participant = await db.challengeParticipant.create({
    data: {
      challengeId,
      userId: session.user.id,
      cashBalance: challenge.virtualCapital,
    },
  });

  return NextResponse.json({ participant }, { status: 201 });
}
