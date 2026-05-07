import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Logo, { LogoMark } from "@/components/brand/Logo"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 80%, transparent)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <Logo size="sm" />
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card)]"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft size={12} /> Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {/* Sub-nav */}
        <nav className="flex flex-wrap gap-2 mb-8 text-xs font-semibold">
          <LegalLink href="/legal/terms" label="Terms of Service" />
          <LegalLink href="/legal/privacy" label="Privacy Policy" />
          <LegalLink href="/legal/disclaimer" label="Financial Disclaimer" />
        </nav>

        {/* Review banner */}
        <div
          className="rounded-xl px-4 py-3 mb-8 text-[11px] leading-relaxed"
          style={{
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "var(--text-primary)",
          }}
        >
          <strong style={{ color: "#10b981" }}>Plain-language summary, subject to ongoing legal review.</strong>{" "}
          We have written these documents in clear language to describe how Peerza.ai actually works.
          They are subject to attorney review and may be updated; the version on this page is the one
          that applies to your use of the service. Email{" "}
          <a href="mailto:legal@peerza.ai">legal@peerza.ai</a> with any questions.
        </div>

        <article className="legal-prose">{children}</article>

        <footer
          className="mt-16 pt-6 text-xs flex flex-wrap gap-x-4 gap-y-2 justify-between"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span>© {new Date().getFullYear()} Peerza, Inc.</span>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
            <Link href="/legal/disclaimer" className="hover:text-emerald-400 transition-colors">Disclaimer</Link>
          </div>
        </footer>
      </main>

      <style>{`
        .legal-prose { color: var(--text-primary); font-size: 14px; line-height: 1.75; }
        .legal-prose h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; color: var(--text-primary); }
        .legal-prose .meta { color: var(--text-secondary); font-size: 12px; margin-bottom: 32px; }
        .legal-prose h2 { font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 12px; color: var(--text-primary); }
        .legal-prose h3 { font-size: 14px; font-weight: 700; margin-top: 20px; margin-bottom: 8px; color: var(--text-primary); }
        .legal-prose p { margin-bottom: 12px; color: var(--text-primary); opacity: 0.92; }
        .legal-prose ul { margin: 8px 0 16px 0; padding-left: 22px; list-style: disc; }
        .legal-prose li { margin-bottom: 6px; color: var(--text-primary); opacity: 0.92; }
        .legal-prose a { color: #10b981; text-decoration: underline; text-decoration-color: rgba(16,185,129,0.4); text-underline-offset: 2px; }
        .legal-prose a:hover { text-decoration-color: #10b981; }
        .legal-prose strong { color: var(--text-primary); font-weight: 700; }
        .legal-prose code { background: var(--bg-card); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
      `}</style>
    </div>
  )
}

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card)]"
      style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
    >
      {label}
    </Link>
  )
}
