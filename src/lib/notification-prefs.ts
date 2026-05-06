import { db } from "@/lib/db"

export type NotificationKey =
  | "FOLLOW"
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "POST_LIKE"
  | "POST_COMMENT"
  | "POST_SHARE"
  | "MESSAGE"
  | "CALL"
  | "GAME_DUEL_INVITE"
  | "GAME_DUEL_RESULT"

export type NotificationPrefs = Record<NotificationKey, boolean>

export const NOTIFICATION_KEYS: NotificationKey[] = [
  "FOLLOW",
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "POST_LIKE",
  "POST_COMMENT",
  "POST_SHARE",
  "MESSAGE",
  "CALL",
  "GAME_DUEL_INVITE",
  "GAME_DUEL_RESULT",
]

export const NOTIFICATION_LABELS: Record<NotificationKey, { title: string; hint: string }> = {
  FOLLOW: { title: "New followers", hint: "When someone follows you" },
  CONNECTION_REQUEST: { title: "Connection requests", hint: "When someone requests to connect" },
  CONNECTION_ACCEPTED: { title: "Connections accepted", hint: "When your request is accepted" },
  POST_LIKE: { title: "Post & comment reactions", hint: "When someone reacts to your posts or comments" },
  POST_COMMENT: { title: "Comments & replies", hint: "When someone comments on your posts or replies to you" },
  POST_SHARE: { title: "Reposts & shares", hint: "When someone reposts or shares your content" },
  MESSAGE: { title: "Direct messages", hint: "When someone sends you a DM" },
  CALL: { title: "Audio & video calls", hint: "When someone calls you" },
  GAME_DUEL_INVITE: { title: "Game challenges", hint: "When someone challenges you to a game duel" },
  GAME_DUEL_RESULT: { title: "Game duel results", hint: "When your opponent finishes a duel you started" },
}

export const DEFAULT_PREFS: NotificationPrefs = {
  FOLLOW: true,
  CONNECTION_REQUEST: true,
  CONNECTION_ACCEPTED: true,
  POST_LIKE: true,
  POST_COMMENT: true,
  POST_SHARE: true,
  MESSAGE: true,
  CALL: true,
  GAME_DUEL_INVITE: true,
  GAME_DUEL_RESULT: true,
}

function normalize(raw: unknown): NotificationPrefs {
  const out: NotificationPrefs = { ...DEFAULT_PREFS }
  if (raw && typeof raw === "object") {
    for (const key of NOTIFICATION_KEYS) {
      const v = (raw as Record<string, unknown>)[key]
      if (typeof v === "boolean") out[key] = v
    }
  }
  return out
}

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  })
  return normalize(u?.notificationPrefs)
}

export async function setPrefs(userId: string, prefs: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const current = await getPrefs(userId)
  const merged: NotificationPrefs = { ...current }
  for (const key of NOTIFICATION_KEYS) {
    if (typeof prefs[key] === "boolean") merged[key] = prefs[key] as boolean
  }
  await db.user.update({
    where: { id: userId },
    data: { notificationPrefs: merged },
  })
  return merged
}

export async function shouldNotify(userId: string, type: NotificationKey): Promise<boolean> {
  const prefs = await getPrefs(userId)
  return prefs[type] ?? true
}
