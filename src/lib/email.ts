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
// Table layout + inlined styles, no external assets — renders in Gmail,
// Outlook and Apple Mail. Gradients degrade to the solid bgcolor fallback.

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const SITE = "https://www.peerza.ai"

interface LayoutParams {
  preheader: string
  eyebrow: string
  heading: string
  body: string
  cta: { label: string; url: string }
  meta: string[]
  extra?: string
  footnote: string
}

function layout(p: LayoutParams): string {
  const meta = p.meta
    .map(
      (m) =>
        `<td style="padding:0 6px 8px 0"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#161b24;border:1px solid #232a36;font-size:12px;color:#9aa3b2;white-space:nowrap">${m}</span></td>`,
    )
    .join("")

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${p.heading}</title>
</head>
<body style="margin:0;padding:0;background:#0a0c11;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${p.preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0c11" style="background:#0a0c11;background-image:radial-gradient(ellipse at top,#0f2a22 0%,#0a0c11 55%)">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT}">

    <!-- Brand -->
    <tr><td align="center" style="padding:0 0 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40" height="40" align="center" valign="middle" bgcolor="#10b981" style="width:40px;height:40px;border-radius:12px;background:#10b981;background-image:linear-gradient(135deg,#34d399 0%,#10b981 45%,#0d9488 100%);font-size:22px;font-weight:800;color:#04130d;line-height:40px">P</td>
        <td style="padding-left:12px;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#f3f5f8">Peerza</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td bgcolor="#11151d" style="background:#11151d;border:1px solid #1e2430;border-radius:20px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="4" bgcolor="#10b981" style="height:4px;line-height:4px;font-size:0;background:#10b981;background-image:linear-gradient(90deg,#34d399,#10b981,#06b6d4,#8b5cf6)">&nbsp;</td></tr>
        <tr><td style="padding:40px 40px 8px">
          <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#34d399;margin:0 0 14px">${p.eyebrow}</div>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-0.8px;color:#f3f5f8">${p.heading}</h1>
          <p style="margin:0;font-size:16px;line-height:1.65;color:#aab2c0">${p.body}</p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:32px 40px 8px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="#10b981" style="border-radius:14px;background:#10b981;background-image:linear-gradient(135deg,#34d399 0%,#10b981 50%,#0d9488 100%);box-shadow:0 8px 24px rgba(16,185,129,0.35)">
              <a href="${p.cta.url}" target="_blank" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:16px;font-weight:700;color:#04130d;text-decoration:none;border-radius:14px">${p.cta.label} &rarr;</a>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:20px 40px 8px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${meta}</tr></table>
        </td></tr>

        ${p.extra ?? ""}

        <!-- Fallback link -->
        <tr><td style="padding:24px 40px 36px">
          <div style="border-top:1px solid #1e2430;padding-top:20px;font-size:12px;line-height:1.6;color:#6b7383">
            Button not working? Paste this link into your browser:<br>
            <a href="${p.cta.url}" style="color:#34d399;text-decoration:none;word-break:break-all">${p.cta.url}</a>
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding:28px 24px 0;font-size:12px;line-height:1.7;color:#5b6272">
      <div style="font-size:14px;font-weight:700;color:#8a93a3;margin-bottom:6px">Investing, made social.</div>
      ${p.footnote}<br>
      <a href="${SITE}" style="color:#8a93a3;text-decoration:none">peerza.ai</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE}/legal/privacy" style="color:#8a93a3;text-decoration:none">Privacy</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE}/legal/terms" style="color:#8a93a3;text-decoration:none">Terms</a>
      <div style="margin-top:12px;color:#454b58">&copy; ${new Date().getFullYear()} Peerza, Inc. Educational platform &mdash; not investment advice.</div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

function featureGrid(items: { icon: string; title: string; text: string }[]): string {
  const rows = items
    .map(
      (f) => `<tr><td style="padding:0 0 12px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#161b24" style="background:#161b24;border:1px solid #232a36;border-radius:14px"><tr>
          <td width="44" valign="top" style="padding:16px 0 16px 16px;font-size:22px;line-height:1">${f.icon}</td>
          <td style="padding:14px 16px 14px 12px">
            <div style="font-size:14px;font-weight:700;color:#e6e9ee;margin-bottom:2px">${f.title}</div>
            <div style="font-size:13px;line-height:1.5;color:#8a93a3">${f.text}</div>
          </td>
        </tr></table>
      </td></tr>`,
    )
    .join("")
  return `<tr><td style="padding:24px 40px 0">
    <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7383;margin:0 0 14px">What's waiting for you</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  </td></tr>`
}

const FEATURES = [
  { icon: "📈", title: "Paper portfolios", text: "Trade real markets with virtual money. Zero risk, real lessons." },
  { icon: "🤖", title: "Aria, your AI tutor", text: "Ask anything about investing and get answers at your level." },
  { icon: "🏆", title: "Games & Ranked Calls", text: "Duel friends, make calls, and build a public track record." },
]

export function welcomeEmail(name: string, url = SITE) {
  return {
    subject: `Welcome to Peerza, ${name} 🚀`,
    html: layout({
      preheader: "Your investing community is ready. Here's where to start.",
      eyebrow: "You're in",
      heading: `Welcome aboard, ${escape(name)}.`,
      body: "Peerza is where investors learn, practice and compete together. Your account is live — jump into the feed and see what the community is trading today.",
      cta: { label: "Open your feed", url: `${url}/feed` },
      meta: ["✨ Free to start", "👥 Join the community"],
      extra: featureGrid(FEATURES),
      footnote: "You're receiving this because you created a Peerza account.",
    }),
    text: `Welcome to Peerza, ${name}. Your account is live. Open your feed: ${url}/feed`,
  }
}

export function verifyEmailEmail(name: string, verifyUrl: string) {
  return {
    subject: "Confirm your email to unlock Peerza ✅",
    html: layout({
      preheader: "One tap to confirm your email and secure your account.",
      eyebrow: "Account security",
      heading: `One quick step, ${escape(name)}.`,
      body: "Tap the button below to confirm this is your email. It keeps your Peerza account secure and makes sure important updates reach you.",
      cta: { label: "Verify my email", url: verifyUrl },
      meta: ["⏱ Expires in 24 hours", "🔒 Takes 2 seconds"],
      extra: featureGrid(FEATURES),
      footnote: "Didn't sign up for Peerza? You can safely ignore this email.",
    }),
    text: `Verify your Peerza email: ${verifyUrl} (valid for 24 hours). Didn't sign up? Ignore this email.`,
  }
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your Peerza password",
    html: layout({
      preheader: "Choose a new password within 30 minutes.",
      eyebrow: "Password reset",
      heading: "Let's get you back in.",
      body: "We got a request to reset your Peerza password. Tap below within 30 minutes to choose a new one.",
      cta: { label: "Reset password", url: resetUrl },
      meta: ["⏱ Expires in 30 minutes", "🔒 One-time link"],
      footnote: "Didn't request this? Ignore the email — your password stays the same.",
    }),
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
