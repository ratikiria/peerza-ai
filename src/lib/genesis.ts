// Genesis waitlist and Genesis/Pioneer numbers.
//
// Numbers come from one Postgres sequence (genesis_number_seq) shared by the
// waitlist and direct signups, so the two can never hand out the same number.
// A waitlist number is taken only when the email is confirmed; when that email
// later registers, the number moves onto User.genesisNo.

import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { credit } from "@/lib/peerz-server"
import { sendEmail, genesisConfirmEmail, genesisClaimedEmail } from "@/lib/email"
import { PIONEER_LIMIT, numberTier as tierOf, tierLabel as tierName, type NumberTier } from "@/lib/peerz"

export const REFERRAL_PEERZ = 250
export const REFERRAL_MAX = 10
export const RECRUITER_MIN = 3

// The seeded demo accounts never take a number — those go to real people.
const DEMO_EMAILS = new Set([
  "human@peerza.ai", "david@peerza.ai", "emma@peerza.ai", "james@peerza.ai", "marcus@peerza.ai",
  "olivia@peerza.ai", "priya@peerza.ai", "ryan@peerza.ai", "sarah@peerza.ai", "sofia@peerza.ai",
])

// Throwaway inboxes can't hold a number.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com",
  "temp-mail.org", "tempmail.com", "tempmail.net", "yopmail.com", "trashmail.com", "getnada.com",
  "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "mohmal.com",
  "emailondeck.com", "tempr.email", "discard.email",
])

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(email.split("@")[1]?.toLowerCase() ?? "")
}

function token(bytes = 24): string {
  return randomBytes(bytes).toString("base64url")
}

function newRefCode(): string {
  // 7 chars from an alphabet without look-alikes (0/o, 1/l/i).
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(7)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "P2002"
}

/** Next number from the shared sequence, or null once Pioneer is full. */
async function takeNumber(): Promise<number | null> {
  const rows = await db.$queryRaw<{ n: number }[]>`SELECT nextval('"genesis_number_seq"')::int AS n`
  const n = rows[0]?.n
  return n != null && n <= PIONEER_LIMIT ? n : null
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/** Numbers handed out so far (waitlist + accounts, each number counted once). */
export async function claimedCount(): Promise<number> {
  const rows = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT "number" AS v FROM "WaitlistEntry" WHERE "number" IS NOT NULL
      UNION
      SELECT "genesisNo" AS v FROM "User" WHERE "genesisNo" IS NOT NULL
    ) t`
  return rows[0]?.n ?? 0
}

/**
 * The number the next confirmed person will get. Read from the sequence, not
 * counted, because an aborted confirm can leave a gap.
 */
export async function nextNumberPreview(): Promise<number> {
  const rows = await db.$queryRaw<{ last_value: bigint; is_called: boolean }[]>`
    SELECT last_value, is_called FROM "genesis_number_seq"`
  const r = rows[0]
  if (!r) return 1
  return Number(r.last_value) + (r.is_called ? 1 : 0)
}

// ─── Usernames ──────────────────────────────────────────────────────────────

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/

/** True when someone else has reserved this @username on the waitlist. */
export async function isUsernameReserved(username: string, forEmail?: string): Promise<boolean> {
  const hit = await db.waitlistEntry.findUnique({ where: { username }, select: { email: true, userId: true } })
  if (!hit || hit.userId) return false
  return hit.email !== forEmail?.toLowerCase()
}

// ─── Join + confirm ─────────────────────────────────────────────────────────

export type JoinResult = "sent" | "resent" | "has_account" | "disposable"

export async function joinWaitlist(input: {
  email: string
  username?: string | null
  ref?: string | null
  locale?: string | null
  ip?: string | null
  baseUrl: string
}): Promise<JoinResult> {
  const email = input.email.trim().toLowerCase()
  if (isDisposableEmail(email)) return "disposable"
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return "has_account"

  const requestedUsername = input.username && USERNAME_RE.test(input.username) ? input.username : null
  const existing = await db.waitlistEntry.findUnique({ where: { email } })

  if (existing) {
    if (existing.confirmedAt) {
      // Already in: send their page link again instead of a new confirmation.
      await sendClaimedEmail(existing.id, input.baseUrl)
      return "resent"
    }
    const fresh = await db.waitlistEntry.update({
      where: { id: existing.id },
      data: { confirmToken: token(), requestedUsername: requestedUsername ?? existing.requestedUsername },
    })
    await sendEmail({ to: email, ...genesisConfirmEmail(`${input.baseUrl}/api/genesis/confirm?token=${fresh.confirmToken}`) })
    return "resent"
  }

  const referrer = input.ref
    ? await db.waitlistEntry.findUnique({ where: { refCode: input.ref }, select: { id: true } })
    : null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = await db.waitlistEntry.create({
        data: {
          email, requestedUsername, refCode: newRefCode(), confirmToken: token(), manageToken: token(32),
          referredById: referrer?.id ?? null, locale: input.locale ?? null, ip: input.ip ?? null,
        },
      })
      await sendEmail({ to: email, ...genesisConfirmEmail(`${input.baseUrl}/api/genesis/confirm?token=${entry.confirmToken}`) })
      return "sent"
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      // refCode collision (or a double submit) — try again.
      if (await db.waitlistEntry.findUnique({ where: { email }, select: { id: true } })) return "resent"
    }
  }
  throw new Error("Could not create waitlist entry")
}

/** Confirm an email: take a number, lock the @username. Returns the manage token. */
export async function confirmWaitlist(confirmToken: string, baseUrl: string): Promise<string | null> {
  const entry = await db.waitlistEntry.findUnique({ where: { confirmToken } })
  if (!entry) return null
  if (entry.confirmedAt) return entry.manageToken

  // Someone with this email may have registered since joining.
  const account = await db.user.findUnique({ where: { email: entry.email }, select: { id: true } })
  const number = account ? null : await takeNumber()

  let username: string | null = null
  if (entry.requestedUsername) {
    const taken = await db.user.findUnique({ where: { username: entry.requestedUsername }, select: { id: true } })
    if (!taken) username = entry.requestedUsername
  }

  const confirmed = await db.waitlistEntry.updateMany({
    where: { id: entry.id, confirmedAt: null },
    data: { confirmedAt: new Date(), number },
  })
  if (confirmed.count === 0) return entry.manageToken // a parallel click got there first
  if (username) {
    // Separate write: losing the name to someone faster must not undo the confirm.
    await db.waitlistEntry.update({ where: { id: entry.id }, data: { username } }).catch((err) => {
      if (!isUniqueViolation(err)) throw err
    })
  }
  if (account) await claimForUser(account.id)

  // The friend who invited them may already be on Peerza: pay them now.
  if (entry.referredById) {
    const referrer = await db.waitlistEntry.findUnique({ where: { id: entry.referredById }, select: { userId: true } })
    if (referrer?.userId) await settleReferrals(referrer.userId)
  }

  await sendClaimedEmail(entry.id, baseUrl)
  return entry.manageToken
}

async function sendClaimedEmail(entryId: string, baseUrl: string) {
  const e = await db.waitlistEntry.findUnique({ where: { id: entryId } })
  if (!e) return
  await sendEmail({
    to: e.email,
    ...genesisClaimedEmail({
      number: e.number,
      tierName: tierName(tierOf(e.number)),
      inviteUrl: `${baseUrl}/g/${e.refCode}`,
      manageUrl: `${baseUrl}/genesis/me?t=${e.manageToken}`,
    }),
  })
}

// ─── Accounts ───────────────────────────────────────────────────────────────

/**
 * Move a confirmed waitlist entry onto the account with the same email:
 * number, verified email, referral Peerz. Safe to call repeatedly.
 */
export async function claimForUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, genesisNo: true, emailVerifiedAt: true },
  })
  if (!user) return
  const entry = await db.waitlistEntry.findUnique({ where: { email: user.email.toLowerCase() } })
  if (!entry?.confirmedAt) return

  if (!entry.userId) {
    await db.waitlistEntry.update({ where: { id: entry.id }, data: { userId } })
  }
  const data: { genesisNo?: number; emailVerifiedAt?: Date } = {}
  if (user.genesisNo == null && entry.number != null) data.genesisNo = entry.number
  // Confirming the waitlist email already proved they own it.
  if (!user.emailVerifiedAt) data.emailVerifiedAt = entry.confirmedAt
  if (Object.keys(data).length) await db.user.update({ where: { id: userId }, data })

  await settleReferrals(userId)
}

/** Credit +250 Peerz for each confirmed friend, up to 10. Idempotent. */
export async function settleReferrals(userId: string): Promise<void> {
  const entry = await db.waitlistEntry.findUnique({ where: { userId }, select: { id: true } })
  if (!entry) return
  const friends = await db.waitlistEntry.findMany({
    where: { referredById: entry.id, confirmedAt: { not: null } },
    orderBy: { confirmedAt: "asc" },
    take: REFERRAL_MAX,
    select: { id: true },
  })
  // Skip friends already paid so re-runs don't lean on the unique key.
  const paid = new Set((await db.peerzLedger.findMany({
    where: { userId, reason: "REFERRAL" },
    select: { refId: true },
  })).map((r) => r.refId))
  for (const f of friends) {
    if (!paid.has(f.id)) await credit({ userId, amount: REFERRAL_PEERZ, reason: "REFERRAL", refId: f.id })
  }
}

/**
 * Number for a signed-in user: a waitlist number if their email has one,
 * otherwise the next one from the sequence. Demo accounts get none.
 */
export async function ensureGenesis(userId: string): Promise<number | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { genesisNo: true, email: true } })
  if (!user) return null
  if (user.genesisNo != null) return user.genesisNo
  if (DEMO_EMAILS.has(user.email.toLowerCase())) return null

  await claimForUser(userId)
  const claimed = await db.user.findUnique({ where: { id: userId }, select: { genesisNo: true } })
  if (claimed?.genesisNo != null) return claimed.genesisNo

  const n = await takeNumber()
  if (n == null) return null
  const res = await db.user.updateMany({ where: { id: userId, genesisNo: null }, data: { genesisNo: n } })
  if (res.count > 0) return n
  // A parallel request numbered this user first; the number we took stays unused.
  return (await db.user.findUnique({ where: { id: userId }, select: { genesisNo: true } }))?.genesisNo ?? null
}

// ─── Status page ────────────────────────────────────────────────────────────

export interface WaitlistStatus {
  number: number | null
  tier: NumberTier | null
  username: string | null
  refCode: string
  confirmed: boolean
  hasAccount: boolean
  friends: { label: string; confirmed: boolean }[]
  confirmedFriends: number
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local.slice(0, 1)}***@${domain}`
}

export async function getWaitlistStatus(manageToken: string): Promise<WaitlistStatus | null> {
  const e = await db.waitlistEntry.findUnique({
    where: { manageToken },
    include: {
      referrals: {
        orderBy: { createdAt: "asc" },
        take: 50,
        select: { email: true, username: true, confirmedAt: true },
      },
    },
  })
  if (!e) return null
  const friends = e.referrals.map((r) => ({
    label: r.confirmedAt && r.username ? `@${r.username}` : maskEmail(r.email),
    confirmed: !!r.confirmedAt,
  }))
  return {
    number: e.number,
    tier: tierOf(e.number),
    username: e.username,
    refCode: e.refCode,
    confirmed: !!e.confirmedAt,
    hasAccount: !!e.userId,
    friends,
    confirmedFriends: friends.filter((f) => f.confirmed).length,
  }
}

/** Public info for an invite link: who invited (by @username only). */
export async function inviterFor(refCode: string): Promise<{ username: string | null; number: number | null } | null> {
  const e = await db.waitlistEntry.findUnique({
    where: { refCode },
    select: { username: true, number: true, confirmedAt: true },
  })
  if (!e?.confirmedAt) return null
  return { username: e.username, number: e.number }
}
