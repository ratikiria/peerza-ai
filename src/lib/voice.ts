// ElevenLabs voice config + helpers. The actual API call lives in
// /api/ai-tutor/voice — keys never leave the server.

// "Aria" — ElevenLabs' built-in warm female voice. Matches the tutor persona.
export const DEFAULT_ARIA_VOICE_ID = "9BWtsMINqrJLrRacOk9x"

// Turbo v2.5: ~50% cheaper than Multilingual v2, sub-300ms latency, English-first.
// Switch to "eleven_multilingual_v2" if we ever ship Aria in non-English markets.
export const ELEVENLABS_MODEL = "eleven_turbo_v2_5"

export function isVoiceConfigured(): boolean {
  const key = process.env.ELEVENLABS_API_KEY
  return !!key && !key.startsWith("your-") && key !== "placeholder"
}

export function getVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_ARIA_VOICE_ID
}
