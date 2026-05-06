import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy · Peerza.ai",
  description: "How Peerza.ai collects and uses your data.",
}

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="meta">Last updated: April 30, 2026</p>

      <p>
        This Privacy Policy explains what personal data Peerza.ai collects, why we collect it,
        and the choices you have. It applies to everyone who uses the platform.
      </p>

      <h2>1. Data we collect</h2>

      <h3>Account information</h3>
      <ul>
        <li>Name, username, email, hashed password, date of birth, profile photo (optional).</li>
        <li>Security question and (hashed) answer used for password recovery.</li>
        <li>Interests selected during signup.</li>
      </ul>

      <h3>Content you create</h3>
      <ul>
        <li>Posts, comments, polls, direct messages, group messages, profile updates.</li>
        <li>Trade ideas, simulated trades, watchlists, track-record entries.</li>
        <li>Files you upload (images, short videos, voice notes).</li>
      </ul>

      <h3>Activity data</h3>
      <ul>
        <li>Posts and profiles you view, follow relationships, likes, votes, game results, chat metadata.</li>
        <li>Device, browser, approximate location (from IP), and pages visited, used for analytics and abuse prevention.</li>
      </ul>

      <h3>Payment data</h3>
      <ul>
        <li>If you subscribe to Pro, payment is processed by <strong>Stripe</strong>. We never see or store your full card number — Stripe gives us a customer ID and your subscription status.</li>
      </ul>

      <h3>AI tutor (Aria) prompts</h3>
      <ul>
        <li>Your prompts and Aria&apos;s responses are sent to Anthropic to generate replies, and may be retained by us for safety, debugging, and quality improvement.</li>
      </ul>

      <h3>Cookies</h3>
      <ul>
        <li>We use cookies for authentication (NextAuth session), preferences (theme, currency, layout), and basic analytics. You can clear cookies via your browser, but some features will stop working without them.</li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To operate the service — show you the right feed, deliver messages, run paper trades, render market data.</li>
        <li>To keep the service safe — detect spam, abuse, and policy violations.</li>
        <li>To communicate with you — service emails, security alerts, optional product updates.</li>
        <li>To improve the product — diagnose bugs, measure feature use, train internal tooling.</li>
        <li>To process payments through Stripe.</li>
        <li>To meet legal obligations (e.g. responding to lawful requests, tax records).</li>
      </ul>

      <h2>3. Who we share your data with</h2>
      <p>We do not sell your personal data. We share it with:</p>
      <ul>
        <li><strong>Stripe</strong> — payments and subscriptions.</li>
        <li><strong>Anthropic</strong> — to power Aria, the AI tutor.</li>
        <li><strong>Sentry</strong> — error monitoring (may include your user ID and the URL where the error happened).</li>
        <li><strong>Google</strong> — only if you sign in via Google OAuth.</li>
        <li><strong>Hosting and infrastructure providers</strong> that operate the database and servers Peerza.ai runs on.</li>
        <li><strong>Other users</strong> — content you make public (posts, comments, profile, public stats) is visible to anyone who can see it on the platform.</li>
        <li><strong>Authorities</strong> — when required by valid legal process.</li>
        <li><strong>A successor</strong> — if Peerza.ai is acquired, your data may transfer to the buyer, subject to this policy.</li>
      </ul>

      <h2>4. International transfers</h2>
      <p>
        Peerza.ai is operated globally and your data may be processed in countries other than
        your own, including the United States. We rely on standard contractual clauses or
        equivalent safeguards where required by law.
      </p>

      <h2>5. How long we keep your data</h2>
      <ul>
        <li>Account data: while your account is active.</li>
        <li>Content: until you delete it (or your account). Some copies may persist briefly in backups.</li>
        <li>Payment records: as long as required by tax and accounting law.</li>
        <li>Logs and abuse-prevention data: typically up to 12 months.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your account and associated personal data.</li>
        <li>Export your data in a portable format.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Withdraw consent (for processing that relies on consent).</li>
        <li>Lodge a complaint with your local data-protection authority.</li>
      </ul>
      <p>
        To exercise any of these rights, email <a href="mailto:privacy@peerza.ai">privacy@peerza.ai</a>.
        We will respond within 30 days.
      </p>

      <h2>7. Children</h2>
      <p>
        Peerza.ai is intended for users 13 and older. We do not knowingly collect personal data
        from children under 13. If you believe we have, please contact us and we will delete it.
      </p>

      <h2>8. Security</h2>
      <p>
        We protect your data with industry-standard measures, including bcrypt password hashing,
        HTTPS in transit, and access controls on our database. No system is perfectly secure;
        we cannot guarantee absolute security but we will tell you about a breach affecting
        your data without undue delay.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Privacy Policy. If a change is material, we will notify you in-app
        or by email before it takes effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about your privacy? Email <a href="mailto:privacy@peerza.ai">privacy@peerza.ai</a>.
      </p>
    </>
  )
}
