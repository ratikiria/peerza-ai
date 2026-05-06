import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { DEFAULT_LOCALE, LOCALE_COOKIE, isUiLocale, type UiLocale } from "@/lib/locale"

export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieValue = store.get(LOCALE_COOKIE)?.value
  const locale: UiLocale = isUiLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
