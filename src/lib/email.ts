import { Resend } from "resend"

// Lazy singleton — instantiated only when first sendEmail call happens.
// Returns null when no API key is set so dev environments don't crash.
let _resend: Resend | null | undefined

function getResend(): Resend | null {
  if (_resend !== undefined) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) {
    _resend = null
    return null
  }
  _resend = new Resend(key)
  return _resend
}

const FROM = process.env.EMAIL_FROM || "Peerza <hello@peerza.ai>"
const REPLY_TO = process.env.EMAIL_REPLY_TO

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] RESEND_API_KEY not set — skipping send to", params.to)
    }
    return { ok: false, error: "email_not_configured" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: REPLY_TO,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    console.error("[email] send failed:", message)
    return { ok: false, error: message }
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────
// Plain HTML, inlined styles, no external assets — best deliverability.

export function welcomeEmail(name: string, url = "https://peerza.ai") {
  return {
    subject: "Welcome to Peerza",
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#15171c">
        <h2 style="margin:0 0 16px">Welcome, ${escape(name)}.</h2>
        <p style="line-height:1.55;color:#3a3f4a">
          Peerza is the social investing community. Learn with AI tutors, practice
          with paper portfolios, compete in trading games, and share with people
          who get it.
        </p>
        <p style="margin:24px 0">
          <a href="${url}/feed" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
            Open your feed
          </a>
        </p>
        <p style="font-size:13px;color:#7a7f8a">— Peerza</p>
      </div>
    `,
    text: `Welcome, ${name}. Peerza is live for you. Open your feed: ${url}/feed`,
  }
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your Peerza password",
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#15171c">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p style="line-height:1.55;color:#3a3f4a">
          We got a request to reset your Peerza password. Click below within
          30 minutes to choose a new one.
        </p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
            Reset password
          </a>
        </p>
        <p style="font-size:13px;color:#7a7f8a">
          Didn't request this? Ignore the email — your password stays the same.
        </p>
      </div>
    `,
    text: `Reset your Peerza password: ${resetUrl} (valid for 30 minutes)`,
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
