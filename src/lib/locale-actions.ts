"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { LOCALE_COOKIE, isUiLocale, type UiLocale } from "@/lib/locale"

const ONE_YEAR = 60 * 60 * 24 * 365

export async function setUiLocale(locale: UiLocale) {
  if (!isUiLocale(locale)) return { ok: false as const, error: "invalid_locale" }

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  })

  // For logged-in users, persist on the User record so the choice follows them
  // across browsers and devices on next sign-in.
  const session = await auth()
  if (session?.user?.id) {
    await db.user.update({
      where: { id: session.user.id },
      data: { locale },
    }).catch(() => {
      // Non-fatal: the cookie still wins for the current browser. We swallow
      // the DB error rather than failing the whole locale switch.
    })
  }

  // Force re-render of all server components so translated strings refresh.
  revalidatePath("/", "layout")

  return { ok: true as const }
}
