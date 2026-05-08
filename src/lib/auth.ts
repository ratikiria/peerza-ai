import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { consume, reset } from "@/lib/rate-limit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const LOGIN_MAX_PER_EMAIL = 10
const LOGIN_MAX_PER_IP = 30
const LOGIN_WINDOW_MS = 15 * 60 * 1000

async function clientIpFromHeaders(): Promise<string> {
  const h = await headers()
  const xff = h.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]!.trim()
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-vercel-forwarded-for") ||
    "unknown"
  )
}

async function uniqueUsername(seed: string): Promise<string> {
  const base = seed.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user"
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`
    const taken = await db.user.findUnique({ where: { username: candidate }, select: { id: true } })
    if (!taken) return candidate
  }
  return `${base}${Date.now().toString(36).slice(-5)}`
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.trim().toLowerCase()
        const ip = await clientIpFromHeaders()

        // Per-IP cap blocks credential stuffing across many emails.
        const ipLimit = consume(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS)
        if (!ipLimit.ok) return null

        const emailKey = `login:email:${email}`
        const emailLimit = consume(emailKey, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS)
        if (!emailLimit.ok) return null

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        // Successful login — drop the per-email penalty so a single mistyped
        // password doesn't keep counting after the user gets it right.
        reset(emailKey)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          isPremium: user.isPremium,
          isPro: user.isPro,
          isEmailVerified: !!user.emailVerifiedAt,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (account?.provider === "google" && profile?.email) {
        const existing = await db.user.findUnique({ where: { email: profile.email as string } })
        const dbUser = existing
          ? existing
          : await db.user.create({
              data: {
                email: profile.email as string,
                name: (profile.name as string) || (profile.email as string).split("@")[0],
                username: await uniqueUsername(((profile.email as string).split("@")[0])),
                image: (profile.picture as string) ?? null,
                emailVerifiedAt: new Date(),
              },
            })
        token.id        = dbUser.id
        token.username  = dbUser.username
        token.isPremium = dbUser.isPremium
        token.isPro     = dbUser.isPro
        token.isEmailVerified = !!dbUser.emailVerifiedAt
      } else if (user) {
        token.id        = user.id
        token.username  = (user as any).username
        token.isPremium = (user as any).isPremium
        token.isPro     = (user as any).isPro ?? false
        token.isEmailVerified = (user as any).isEmailVerified ?? false
      }
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, username: true, isPremium: true, isPro: true, emailVerifiedAt: true },
        })
        if (fresh) {
          token.name      = fresh.name
          token.username  = fresh.username
          token.isPremium = fresh.isPremium
          token.isPro     = fresh.isPro
          token.isEmailVerified = !!fresh.emailVerifiedAt
        }
        // If client passed explicit data via update(data), trust it as the freshest source.
        if (session && typeof session === "object") {
          const s = session as Record<string, unknown>
          if (typeof s.username === "string") token.username = s.username
          if (typeof s.name === "string")     token.name     = s.name
        }
      }
      // Always normalise picture on every callback — migrates old cookies and handles first uploads.
      // No DB query: the avatar API itself reads from DB fresh on every browser request (Cache-Control: no-store).
      if (token.id) {
        token.picture = `/api/avatar/${token.id}`
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id       = token.id       as string
        session.user.username = token.username as string
        session.user.isPremium = token.isPremium as boolean
        session.user.isPro    = (token.isPro as boolean) ?? false
        session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false
        session.user.image    = token.picture  as string | null
      }
      return session
    },
  },
})
