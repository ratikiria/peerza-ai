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

  const participant = await db.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId: session.user.id } },
    include: {
      holdings: { orderBy: { updatedAt: "desc" } },
      trades: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  return NextResponse.json({
    cashBalance: participant.cashBalance,
    holdings: participant.holdings,
    trades: participant.trades,
  });
}
