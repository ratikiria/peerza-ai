// UI locales for the app's interface chrome (navbar, sidebar, settings, …).
// Distinct from the dictionary languages in src/lib/dictionary.ts — those
// describe content translations for the Economic Calendar dictionary, while
// these describe the UI shell language.

export const UI_LOCALES = [
  { code: "en", label: "English",  native: "English",   flag: "us" },
  { code: "es", label: "Spanish",  native: "Español",   flag: "es" },
  { code: "tr", label: "Turkish",  native: "Türkçe",    flag: "tr" },
  { code: "ka", label: "Georgian", native: "ქართული",   flag: "ge" },
] as const

export type UiLocale = (typeof UI_LOCALES)[number]["code"]

export const DEFAULT_LOCALE: UiLocale = "en"
export const LOCALE_COOKIE = "peerza-locale"

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && UI_LOCALES.some((l) => l.code === value)
}
