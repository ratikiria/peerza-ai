#!/usr/bin/env node
/**
 * Translate the canonical English dictionary to Georgian / Russian / Turkish / Spanish.
 *
 * Usage:
 *   node scripts/translate-dictionary.js
 *   node scripts/translate-dictionary.js --force      # re-translate everything (otherwise skips already-translated)
 *   node scripts/translate-dictionary.js --lang=ka    # only translate one language
 *
 * Cost estimate: ~30 entries × 4 languages × ~600 output tokens each via Haiku 4.5 ($5/M output)
 *               = ~72k output tokens × $5/M = ~$0.36
 *               + cached system prompt amortizes input cost across all entries.
 */

require("dotenv").config({ path: ".env" })
const fs = require("fs")
const path = require("path")
const Anthropic = require("@anthropic-ai/sdk").default

const TARGET_LANGUAGES = [
  { code: "ka", name: "Georgian (ქართული)",  note: "Use Georgian Mkhedruli script. Use established financial terms, e.g. ფედერალური სარეზერვო ბანკი for Federal Reserve." },
  { code: "ru", name: "Russian (Русский)",    note: "Use Russian Cyrillic. Use established Russian financial terminology." },
  { code: "tr", name: "Turkish (Türkçe)",     note: "Use established Turkish financial terminology." },
  { code: "es", name: "Spanish (Español)",    note: "Use neutral Latin American Spanish — avoid regional slang. Use established financial terminology." },
]

const SOURCE_FILE   = path.join(__dirname, "..", "src", "data", "dictionary", "en.json")
const OUTPUT_DIR    = path.join(__dirname, "..", "src", "data", "dictionary")
const MODEL         = "claude-haiku-4-5"

const args  = process.argv.slice(2)
const force = args.includes("--force")
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? null

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your-")) {
  console.error("ANTHROPIC_API_KEY not set in .env")
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(targetLang) {
  return `You are an expert financial translator. You will translate JSON dictionary entries about economic indicators from English into ${targetLang.name}.

${targetLang.note}

TRANSLATION RULES:
1. Translate the human-readable text fields (name, frequency, definition, whyItMatters, marketReaction.higher, marketReaction.lower).
2. DO NOT translate: id, abbreviation, category, country, watchedAssets (these are stable identifiers / ticker symbols).
3. Keep the meaning precise and educational. The audience is retail traders and investors learning these concepts.
4. Use established local financial terminology. If a concept doesn't have a clean local term, transliterate or use the English term in parentheses.
5. Match the tone of the source: clear, direct, plain-language. No filler or pleasantries.
6. Output VALID JSON ONLY. No prose, no preamble, no markdown code fences.

You must return the EXACT same JSON shape as the input — same field names, same structure, only the human-readable values translated.`
}

async function translateEntry(entry, targetLang) {
  const systemPrompt = buildSystemPrompt(targetLang)
  const userPrompt = `Translate this entry to ${targetLang.name}. Return only the translated JSON object.

${JSON.stringify(entry, null, 2)}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  })

  const block = resp.content.find((b) => b.type === "text")
  if (!block) throw new Error("No text block in response")
  let raw = block.text.trim()
  // Strip code fences if Claude added them despite instructions
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\n?/, "").replace(/```$/, "").trim()

  const translated = JSON.parse(raw)
  // Force-preserve identifiers
  translated.id            = entry.id
  translated.abbreviation  = entry.abbreviation
  translated.category      = entry.category
  translated.country       = entry.country
  translated.watchedAssets = entry.watchedAssets
  return translated
}

async function processLanguage(targetLang, source) {
  const outFile = path.join(OUTPUT_DIR, `${targetLang.code}.json`)
  let existing = { language: targetLang.code, generatedAt: "", entries: [] }
  if (fs.existsSync(outFile) && !force) {
    try { existing = JSON.parse(fs.readFileSync(outFile, "utf8")) } catch {}
  }
  const existingIds = new Set((existing.entries || []).map((e) => e.id))

  const out = {
    language: targetLang.code,
    generatedAt: new Date().toISOString().slice(0, 10),
    entries: [],
  }

  console.log(`\n→ ${targetLang.name} (${targetLang.code})`)
  for (let i = 0; i < source.entries.length; i++) {
    const entry = source.entries[i]
    if (!force && existingIds.has(entry.id)) {
      const cached = existing.entries.find((e) => e.id === entry.id)
      if (cached) {
        out.entries.push(cached)
        process.stdout.write(`  ${i + 1}/${source.entries.length} ${entry.id} [cached]\n`)
        continue
      }
    }
    process.stdout.write(`  ${i + 1}/${source.entries.length} ${entry.id} ... `)
    try {
      const translated = await translateEntry(entry, targetLang)
      out.entries.push(translated)
      process.stdout.write("ok\n")
    } catch (e) {
      console.error(`  failed: ${e.message}`)
      // Fallback: keep the source entry so the file always has all IDs
      out.entries.push(entry)
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8")
  console.log(`✓ wrote ${outFile}`)
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Source file not found: ${SOURCE_FILE}`)
    process.exit(1)
  }
  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"))
  console.log(`Source: ${source.entries.length} entries (en)`)

  const langs = langArg ? TARGET_LANGUAGES.filter((l) => l.code === langArg) : TARGET_LANGUAGES
  if (langs.length === 0) {
    console.error(`No matching language for --lang=${langArg}`)
    process.exit(1)
  }

  for (const lang of langs) {
    await processLanguage(lang, source)
  }
  console.log(`\nDone.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
