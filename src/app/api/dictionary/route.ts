import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import fs from "node:fs/promises"
import path from "node:path"
import { DICTIONARY_LANGUAGES, type DictionaryFile, type DictionaryLang } from "@/lib/dictionary"

export const runtime = "nodejs"

// Cache the loaded files in memory — they're tiny and don't change at runtime.
const memCache = new Map<DictionaryLang, DictionaryFile>()

async function loadLanguage(lang: DictionaryLang): Promise<DictionaryFile> {
  const cached = memCache.get(lang)
  if (cached) return cached

  const filePath = path.join(process.cwd(), "src", "data", "dictionary", `${lang}.json`)
  try {
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as DictionaryFile
    memCache.set(lang, parsed)
    return parsed
  } catch (e) {
    // Fall back to English if the requested file is missing.
    if (lang !== "en") {
      console.warn(`[dictionary] ${lang}.json missing — falling back to en.json`)
      return loadLanguage("en")
    }
    throw e
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const langParam = (url.searchParams.get("lang") || "en") as DictionaryLang
  const lang = DICTIONARY_LANGUAGES.find((l) => l.code === langParam) ? langParam : "en"
  const id = url.searchParams.get("id")

  const file = await loadLanguage(lang)

  if (id) {
    const entry = file.entries.find((e) => e.id === id)
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ entry })
  }

  return NextResponse.json({
    language: file.language,
    generatedAt: file.generatedAt,
    entries: file.entries,
  })
}
