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

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.creatorId === session.user.id)
    return NextResponse.json({ error: "Creator cannot leave — delete the challenge instead" }, { status: 400 });

  const participant = await db.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 400 });

  await db.challengeParticipant.delete({ where: { id: participant.id } });

  return NextResponse.json({ success: true });
}
