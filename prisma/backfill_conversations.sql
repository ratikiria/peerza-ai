-- One-time backfill: create one Conversation per unique sender/receiver pair,
-- two ConversationParticipant rows per conversation, and set Message.conversationId.

BEGIN;

-- 1. Create a Conversation row per unique pair, capturing the latest message time as updatedAt
WITH pairs AS (
  SELECT
    LEAST("senderId", "receiverId")    AS user_a,
    GREATEST("senderId", "receiverId") AS user_b,
    MIN("createdAt") AS first_at,
    MAX("createdAt") AS last_at
  FROM "Message"
  WHERE "conversationId" IS NULL
  GROUP BY 1, 2
),
inserted_convs AS (
  INSERT INTO "Conversation" ("id", "isGroup", "name", "createdAt", "updatedAt")
  SELECT
    'cnv_' || substr(md5(user_a || '-' || user_b), 1, 21),
    false,
    NULL,
    first_at,
    last_at
  FROM pairs
  RETURNING "id", "createdAt"
)
SELECT 1 FROM inserted_convs LIMIT 1;

-- 2. Create participants (two per conversation) using the same deterministic id derivation
INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt", "lastReadAt")
SELECT
  'cpA_' || substr(md5(LEAST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId") || '-' || LEAST(m."senderId", m."receiverId")), 1, 21),
  'cnv_' || substr(md5(LEAST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId")), 1, 21),
  LEAST(m."senderId", m."receiverId"),
  MIN(m."createdAt"),
  NULL
FROM "Message" m
WHERE m."conversationId" IS NULL
GROUP BY LEAST(m."senderId", m."receiverId"), GREATEST(m."senderId", m."receiverId")
ON CONFLICT DO NOTHING;

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt", "lastReadAt")
SELECT
  'cpB_' || substr(md5(LEAST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId")), 1, 21),
  'cnv_' || substr(md5(LEAST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId")), 1, 21),
  GREATEST(m."senderId", m."receiverId"),
  MIN(m."createdAt"),
  NULL
FROM "Message" m
WHERE m."conversationId" IS NULL
GROUP BY LEAST(m."senderId", m."receiverId"), GREATEST(m."senderId", m."receiverId")
ON CONFLICT DO NOTHING;

-- 3. Backfill conversationId on every existing message
UPDATE "Message" m
SET "conversationId" = 'cnv_' || substr(md5(LEAST(m."senderId", m."receiverId") || '-' || GREATEST(m."senderId", m."receiverId")), 1, 21)
WHERE m."conversationId" IS NULL;

COMMIT;

-- Verify
SELECT
  (SELECT COUNT(*) FROM "Conversation")            AS conversations,
  (SELECT COUNT(*) FROM "ConversationParticipant") AS participants,
  (SELECT COUNT(*) FROM "Message" WHERE "conversationId" IS NOT NULL) AS msgs_linked,
  (SELECT COUNT(*) FROM "Message" WHERE "conversationId" IS NULL)     AS msgs_orphan;
