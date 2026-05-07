import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { Noto_Sans_Georgian } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian"],
  variable: "--font-georgian",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Peerza.ai — The AI community for Finance & Investing",
  description:
    "The AI community for Finance & Investing. Share analysis, simulate investments, and learn with an AI tutor — all in one place.",
  applicationName: "Peerza.ai",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Peerza",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: { url: "/icon.svg", type: "image/svg+xml" },
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
}

// Pre-paint script: reads the theme from localStorage (or system pref) and sets
// `data-theme` on <html> before React hydrates. Prevents a flash of the wrong
// theme on first paint. Wrapped in a try so a corrupt value never crashes paint.
const THEME_INIT = `
try {
  var t = localStorage.getItem("peerza-theme-v1");
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`.trim()

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`h-full ${notoGeorgian.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full antialiased" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
