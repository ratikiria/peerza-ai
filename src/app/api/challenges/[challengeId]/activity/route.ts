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

  // Confirm challenge exists (and exposes activity to anyone who can see it)
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const trades = await db.trade.findMany({
    where: { participant: { challengeId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      participant: {
        select: {
          user: { select: { id: true, username: true, name: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({
    trades: trades.map((t) => ({
      id: t.id,
      side: t.side,
      symbol: t.symbol,
      name: t.name,
      assetType: t.assetType,
      quantity: t.quantity,
      price: t.price,
      total: t.total,
      createdAt: t.createdAt,
      user: t.participant.user,
    })),
  });
}
