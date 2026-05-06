import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // UPCOMING | ACTIVE | ENDED
  const type = searchParams.get("type");     // PUBLIC | mine

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (type === "mine") {
    where.participants = { some: { userId: session.user.id } };
  } else {
    // Default: show PUBLIC + PASSWORD_PROTECTED challenges only
    where.type = { in: ["PUBLIC", "PASSWORD_PROTECTED"] };
  }

  const challenges = await db.challenge.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
      _count: { select: { participants: true } },
      participants: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({ challenges });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    description,
    type = "PUBLIC",
    style = "MIXED",
    password,
    startDate,
    endDate,
    virtualCapital = 100000,
    assetClasses = ["crypto", "stocks"],
    maxParticipants,
    leaderboardVisible = true,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!startDate || !endDate) return NextResponse.json({ error: "Dates are required" }, { status: 400 });
  if (new Date(startDate) >= new Date(endDate))
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  if (type === "PASSWORD_PROTECTED" && !password?.trim())
    return NextResponse.json({ error: "Password is required for protected challenges" }, { status: 400 });
  if (!["INVESTMENT", "TRADING", "MIXED"].includes(style))
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });

  const now = new Date();
  const start = new Date(startDate);
  const status = start <= now ? "ACTIVE" : "UPCOMING";

  const challenge = await db.challenge.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      creatorId: session.user.id,
      type,
      style,
      password: type === "PASSWORD_PROTECTED" ? password.trim() : null,
      startDate: start,
      endDate: new Date(endDate),
      virtualCapital,
      assetClasses,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      leaderboardVisible,
      status,
      // Auto-join creator
      participants: {
        create: {
          userId: session.user.id,
          cashBalance: virtualCapital,
        },
      },
    },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
      _count: { select: { participants: true } },
    },
  });

  return NextResponse.json({ challenge }, { status: 201 });
}
