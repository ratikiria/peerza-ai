import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

// Hosts the browser is allowed to talk to. Audited 2026-05-04 — see security
// hardening session memory. When adding a new external SDK or fetch target,
// add the host here AND swap CSP to enforcing only after monitoring Report-Only
// for a full session with no console violations.
const CONNECT_SRC = [
  "'self'",
  // Solana RPC (env override for Helius, fallback to public devnet)
  "https://*.helius-rpc.com",
  "https://api.devnet.solana.com",
  "https://api.mainnet-beta.solana.com",
  // Market data
  "https://api.coingecko.com",
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
  "https://stooq.com",
  "https://open.er-api.com",
  "https://financialmodelingprep.com",
  // Geo
  "https://api.country.is",
  "https://ipwho.is",
  "http://ip-api.com",
  // GIFs
  "https://api.giphy.com",
  // Monitoring
  "https://*.ingest.sentry.io",
  "https://*.sentry.io",
  // OAuth + payments (top-level redirects, but listed for safety)
  "https://accounts.google.com",
  "https://api.stripe.com",
  "https://api.commerce.coinbase.com",
].join(" ")

const SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'", // pre-paint theme script + Next.js hydration; tighten with nonce later
  "'unsafe-eval'",   // Turbopack dev + TradingView library
  "https://s3.tradingview.com",
  "https://www.tradingview.com",
].join(" ")

const STYLE_SRC = "'self' 'unsafe-inline'"

const IMG_SRC = [
  "'self'",
  "data:",
  "blob:",
  "https:", // permissive: post media, brand logos, stock thumbnails come from many hosts
].join(" ")

const MEDIA_SRC = "'self' data: blob:"

const FRAME_SRC = [
  "'self'",
  "https://s3.tradingview.com",
  "https://www.tradingview.com",
  "https://www.tradingview-widget.com",
  "https://accounts.google.com",
  "https://js.stripe.com",
].join(" ")

const FONT_SRC = "'self' data:"

const CSP_DIRECTIVES = [
  `default-src 'self'`,
  `script-src ${SCRIPT_SRC}`,
  `style-src ${STYLE_SRC}`,
  `img-src ${IMG_SRC}`,
  `media-src ${MEDIA_SRC}`,
  `connect-src ${CONNECT_SRC}`,
  `frame-src ${FRAME_SRC}`,
  `font-src ${FONT_SRC}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `form-action 'self' https://accounts.google.com`,
  ...(isProd ? [`upgrade-insecure-requests`] : []),
].join("; ")

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // Allow camera/mic/screen share for video calls; deny everything we don't use.
    value: [
      "camera=(self)",
      "microphone=(self)",
      "display-capture=(self)",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
      "interest-cohort=()",
    ].join(", "),
  },
  // Report-Only — violations log to console, page still works.
  // Flip the key name to "Content-Security-Policy" once verified clean.
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_DIRECTIVES,
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained .next/standalone directory
  // with only the files needed at runtime — small Docker images, fast boot.
  output: "standalone",
  // Allow dev resources (HMR, /_next/* assets) to be loaded from these hosts.
  // Required when sharing the dev server through ngrok or a LAN IP.
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "10.11.11.67",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
  // Hidden pitch deck — clean URL /pitch-deck serves the static public file.
  // No nav link points here; reachable by direct link only (noindex set in the file).
  async rewrites() {
    return [
      {
        source: "/pitch-deck",
        destination: "/pitch-deck.html",
      },
    ]
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry build-time options. Source-map upload only runs when SENTRY_AUTH_TOKEN
  // is set (CI/CD); local dev builds are unaffected.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
