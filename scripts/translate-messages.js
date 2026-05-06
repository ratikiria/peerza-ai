#!/usr/bin/env node
/**
 * Translate the canonical English UI strings (messages/en.json) into the
 * configured target locales using Claude Haiku 4.5.
 *
 * Mirrors scripts/translate-dictionary.js but for the next-intl message
 * catalogue rather than the economic-indicator dictionary.
 *
 * Usage:
 *   node scripts/translate-messages.js                # translate all targets, skip existing
 *   node scripts/translate-messages.js --force        # re-translate everything
 *   node scripts/translate-messages.js --lang=es      # only translate one language
 *
 * Output is written next to en.json as messages/<code>.json with the same
 * nested namespace shape. Reviewers should validate against
 * translation/high-risk-terms.md and translation/do-not-translate.md.
 */

require("dotenv").config({ path: ".env" })
const fs = require("fs")
const path = require("path")
const Anthropic = require("@anthropic-ai/sdk").default

const TARGET_LANGUAGES = [
  { code: "es", name: "Spanish (Español)", note: "Use neutral Latin American Spanish — avoid regional slang. Use the second-person informal 'tú' (retail-trading app convention). Numbers use period thousands and comma decimals (1.234,56). Use established financial terminology." },
  { code: "tr", name: "Turkish (Türkçe)",  note: "Use the second-person plural 'siz' for app UI (standard for Turkish apps). Numbers use period thousands and comma decimals (1.234,56). Use established Turkish financial terminology." },
]

const SOURCE_FILE = path.join(__dirname, "..", "messages", "en.json")
const OUTPUT_DIR  = path.join(__dirname, "..", "messages")
const MODEL       = "claude-haiku-4-5"

const args    = process.argv.slice(2)
const force   = args.includes("--force")
const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? null

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your-")) {
  console.error("ANTHROPIC_API_KEY not set in .env")
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(targetLang) {
  return `You are an expert financial-app UI translator. You translate next-intl JSON message catalogues from English to ${targetLang.name}.

${targetLang.note}

TRANSLATION RULES:
1. Output VALID JSON ONLY. Same nested shape as input. No prose, no preamble, no markdown fences.
2. Translate the VALUES only. Keep all KEYS exactly as in English (they are stable identifiers).
3. Preserve placeholders verbatim: {count}, {username}, {ticker}, ICU plural syntax {n, plural, one {…} other {…}}, etc. Translate the words inside the {…} braces but NEVER alter the braces or token names.
4. Brand names stay in English: Peerza.ai, TradersHub, TradingView, PRO. Currency codes stay (USD, EUR, etc).
5. Keep punctuation and ellipses (…) as in source.
6. Match register: this is a retail-trading social app. Use the app-standard formality for the target language (see context note above).
7. For finance-specific UI verbs (Buy/Sell/Place Order/Cancel) use the convention real local brokers use, not literal MT.
8. Keep button/label text concise — UI strings should not balloon in length. If a translation is much longer than the source, prefer a shorter idiomatic alternative.

The input is the full JSON file. Return the full translated JSON file with identical structure.`
}

async function translateFile(sourceJson, targetLang) {
  const systemPrompt = buildSystemPrompt(targetLang)
  const userPrompt = `Translate this entire JSON message catalogue to ${targetLang.name}. Return only the translated JSON.

${JSON.stringify(sourceJson, null, 2)}`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()

  // Defensive: strip accidental markdown fences if Haiku emits them.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(`Failed to parse model output as JSON for ${targetLang.code}: ${err.message}\n---\n${cleaned.slice(0, 500)}…`)
  }

  return parsed
}

async function main() {
  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"))

  const targets = langArg
    ? TARGET_LANGUAGES.filter((l) => l.code === langArg)
    : TARGET_LANGUAGES

  if (targets.length === 0) {
    console.error(`No target language matched --lang=${langArg}`)
    process.exit(1)
  }

  for (const lang of targets) {
    const outPath = path.join(OUTPUT_DIR, `${lang.code}.json`)
    if (!force && fs.existsSync(outPath)) {
      console.log(`✓ ${lang.code}.json already exists — skip (use --force to overwrite)`)
      continue
    }

    process.stdout.write(`→ Translating to ${lang.name}… `)
    const t0 = Date.now()
    const translated = await translateFile(source, lang)
    const ms = Date.now() - t0

    fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + "\n", "utf8")
    console.log(`done (${ms}ms) → ${outPath}`)
  }
}

main().catch((err) => {
  console.error("Translation failed:", err)
  process.exit(1)
})
