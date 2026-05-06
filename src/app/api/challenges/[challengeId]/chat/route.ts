import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_MESSAGE_LENGTH = 1000;
const PAGE_SIZE = 50;

// Helper: caller must be a participant of the challenge to read or write.
// Creator counts as a participant via the join row that exists when they
// create the challenge (they auto-join in the create flow).
async function assertParticipant(challengeId: string, userId: string) {
  const participant = await db.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
    select: { id: true },
  });
  return !!participant;
}

// GET /api/challenges/[id]/chat?cursor=<id>
// Returns the most recent N messages (oldest-first within the page) so the UI
// can render bottom-up like a normal chat. Cursor lets older history page in.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const isParticipant = await assertParticipant(challengeId, session.user.id);
  if (!isParticipant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const cursor = new URL(req.url).searchParams.get("cursor");

  const rows = await db.challengeMessage.findMany({
    where: { challengeId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  // Return oldest-first so the client can append directly
  page.reverse();

  return NextResponse.json({
    messages: page,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1]?.id ?? null : null,
    currentUserId: session.user.id,
  });
}

// POST /api/challenges/[id]/chat — body: { body: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const isParticipant = await assertParticipant(challengeId, session.user.id);
  if (!isParticipant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  let body: { body?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const text = (body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "message_too_long", max: MAX_MESSAGE_LENGTH }, { status: 400 });
  }

  const message = await db.challengeMessage.create({
    data: {
      challengeId,
      authorId: session.user.id,
      body: text,
    },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ message });
}
