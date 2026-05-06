"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          background: "#0f1117",
          color: "#f0f2f5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something broke.</h2>
          <p style={{ fontSize: 14, color: "#8a8d9a", marginBottom: 20 }}>
            We logged the error and we&rsquo;ll look into it. Try reloading.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#10b981",
              color: "#0f1117",
              padding: "0.6rem 1.2rem",
              borderRadius: 12,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
