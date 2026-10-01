export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
    // Settle Ranked Calls every minute. Single-instance deploy, so an in-process
    // timer is enough; set RANKED_RESOLVER=off to disable (e.g. extra replicas).
    if (process.env.RANKED_RESOLVER !== "off" && process.env.NEXT_PHASE !== "phase-production-build") {
      const { startRankedResolver } = await import("./lib/ranked-resolver")
      startRankedResolver()
      // Same single-instance assumption: advance challenge status by date.
      const { startChallengeStatusSync } = await import("./lib/challenge-status")
      startChallengeStatusSync()
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs"
