import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service · Peerza.ai",
  description: "The agreement between you and Peerza.ai.",
}

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="meta">Last updated: May 8, 2026</p>

      <p>
        These Terms of Service (the &quot;Terms&quot;) form a binding agreement between you and
        Peerza, Inc., a Delaware corporation that operates Peerza.ai (&quot;Peerza&quot;,
        &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an account or using the platform you
        agree to these Terms. If you do not agree, do not use Peerza.ai.
      </p>

      <h2>1. Who can use Peerza.ai</h2>
      <p>
        You must be at least 13 years old to register. Some features (including paid Pro
        subscriptions) require you to be of legal age to enter into contracts in your
        jurisdiction. You may not use the platform if you are barred from doing so under any
        applicable law.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You are responsible for keeping your password secret and your account secure.</li>
        <li>You are responsible for everything that happens under your account.</li>
        <li>You may not share, sell, or transfer your account.</li>
        <li>One person, one account. Bots and automated accounts require our written consent.</li>
        <li>We may suspend or close accounts that violate these Terms.</li>
      </ul>

      <h2>3. The service</h2>
      <p>
        Peerza.ai is an educational social platform for people interested in financial markets.
        Core features include posts, comments, messaging, simulated trading (paper money), an
        AI tutor (Aria), market data widgets, an economic calendar, games, and an in-app
        dictionary. Peerza.ai is <strong>not</strong> a brokerage, exchange, custodian, or
        regulated financial institution. We do not execute real trades and we do not hold
        client funds.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of everything you post. By posting content you grant us a worldwide,
        non-exclusive, royalty-free licence to host, display, copy, and distribute that content
        for the purpose of operating and promoting Peerza.ai. This licence ends when you delete
        the content, except where it has already been re-shared by other users or where we are
        required to retain it for legal reasons.
      </p>
      <p>
        You are solely responsible for what you post. Do not post anything you do not have the
        right to share.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Post illegal, infringing, defamatory, harassing, or hateful content.</li>
        <li>Spam, scrape, or otherwise misuse the platform or our APIs.</li>
        <li>Attempt to manipulate markets, mislead other users about your track record, or run pump-and-dump schemes.</li>
        <li>Pretend to be a registered investment professional unless you are one and willing to prove it.</li>
        <li>Reverse-engineer, probe, or attack the service.</li>
        <li>Use the platform to give individualized financial advice for compensation outside the platform&apos;s sanctioned features.</li>
      </ul>

      <h2>6. Pro subscription</h2>
      <p>
        Pro is a paid subscription billed through Stripe at the price shown in-app (currently
        US$10/month, subject to change). Subscriptions renew automatically until you cancel.
        You can cancel any time from your settings; your Pro features stay active until the end
        of the period you have already paid for. We do not offer refunds for partial periods
        unless required by law.
      </p>

      <h2>7. Simulated trading and games</h2>
      <p>
        All trading on Peerza.ai is simulated. Balances, positions, P&amp;L, leaderboards, prizes
        within the platform, and game outcomes have no real-world monetary value and cannot be
        redeemed for cash. Treat them as practice and entertainment.
      </p>

      <h2>8. AI features (Aria, the AI tutor)</h2>
      <p>
        Aria generates responses using third-party AI models. Output is for educational purposes
        only and may be inaccurate, incomplete, or out of date. Do not rely on Aria for
        investment, legal, tax, or medical decisions. We may log your prompts to operate and
        improve the service; see the Privacy Policy for details.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        Peerza.ai is provided &quot;as is&quot; and &quot;as available&quot;. We do not guarantee uptime,
        accuracy of market data, accuracy of user-generated analysis, or that any feature will
        keep working in any particular form. Nothing on Peerza.ai is financial, investment,
        legal, accounting, or tax advice. See the <a href="/legal/disclaimer">Financial Disclaimer</a>.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Peerza.ai and its operators are not liable for
        any indirect, incidental, special, consequential, or punitive damages, or for any loss
        of profits, revenues, data, or goodwill arising out of your use of the service. Our
        total liability to you for any claim is limited to the greater of US$100 or the amount
        you paid us in the twelve months before the claim.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to defend and indemnify Peerza.ai against claims arising from your content,
        your use of the service, or your violation of these Terms.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms when the platform changes. If a change is material, we will
        notify you in-app or by email at least 14 days before it takes effect. Continued use
        after the effective date means you accept the new Terms.
      </p>

      <h2>13. Termination</h2>
      <p>
        You can delete your account at any time from settings. We may suspend or terminate
        accounts that violate these Terms, that create legal risk, or that we reasonably believe
        are operated by automated software.
      </p>

      <h2>14. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, USA, without regard to
        its conflict-of-laws rules. Any dispute arising out of or relating to these Terms or
        your use of Peerza.ai will be brought exclusively in the state or federal courts located
        in New Castle County, Delaware, and you consent to personal jurisdiction there. This
        clause does not limit any non-waivable right you may have, under mandatory
        consumer-protection laws of your country of residence, to bring proceedings in your
        local courts.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Email <a href="mailto:legal@peerza.ai">legal@peerza.ai</a>.
      </p>
    </>
  )
}
