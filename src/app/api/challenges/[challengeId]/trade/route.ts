import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAssetPrice } from "@/lib/prices";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const body = await req.json();
  const { symbol, name, assetType, priceKey, side, quantity } = body;

  if (!symbol || !name || !assetType || !priceKey || !side || !quantity)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!["BUY", "SELL"].includes(side))
    return NextResponse.json({ error: "Invalid side" }, { status: 400 });
  if (quantity <= 0)
    return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.status !== "ACTIVE")
    return NextResponse.json({ error: "Challenge is not active" }, { status: 400 });

  const participant = await db.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId: session.user.id } },
    include: { holdings: { where: { symbol } } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  // Fetch current price directly from the upstream providers — no HTTP
  // self-loop through /api/market/prices, which adds latency and an extra
  // failure mode (TLS / proxy / loopback) without giving us anything in return.
  const price = await fetchAssetPrice(priceKey, assetType);
  if (price == null) {
    return NextResponse.json(
      { error: "Could not fetch current price. Try again in a moment." },
      { status: 502 },
    );
  }

  const total = price * quantity;
  const existingHolding = participant.holdings[0] ?? null;

  if (side === "BUY") {
    if (participant.cashBalance < total)
      return NextResponse.json({ error: "Insufficient cash" }, { status: 400 });

    // Update or create holding
    if (existingHolding) {
      const newQty = existingHolding.quantity + quantity;
      const newAvgCost =
        (existingHolding.avgCost * existingHolding.quantity + total) / newQty;
      await db.holding.update({
        where: { id: existingHolding.id },
        data: { quantity: newQty, avgCost: newAvgCost },
      });
    } else {
      await db.holding.create({
        data: {
          participantId: participant.id,
          symbol,
          name,
          assetType,
          priceKey,
          quantity,
          avgCost: price,
        },
      });
    }

    await db.challengeParticipant.update({
      where: { id: participant.id },
      data: { cashBalance: { decrement: total } },
    });
  } else {
    // SELL
    if (!existingHolding || existingHolding.quantity < quantity)
      return NextResponse.json({ error: "Insufficient holdings" }, { status: 400 });

    const newQty = existingHolding.quantity - quantity;
    if (newQty < 0.000001) {
      await db.holding.delete({ where: { id: existingHolding.id } });
    } else {
      await db.holding.update({
        where: { id: existingHolding.id },
        data: { quantity: newQty },
      });
    }

    await db.challengeParticipant.update({
      where: { id: participant.id },
      data: { cashBalance: { increment: total } },
    });
  }

  const trade = await db.trade.create({
    data: {
      participantId: participant.id,
      symbol,
      name,
      assetType,
      priceKey,
      side,
      quantity,
      price,
      total,
    },
  });

  return NextResponse.json({ trade, price }, { status: 201 });
}
