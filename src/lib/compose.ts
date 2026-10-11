// Opening the feed composer from elsewhere (the phone Create sheet).
// On /feed the sheet fires COMPOSE_EVENT; from any other page it navigates to
// /feed?compose=<mode> and the composer picks the mode up on mount.
export type ComposeMode = "post" | "idea" | "ranked" | "poll" | "story"

export const COMPOSE_EVENT = "peerza:compose"

/** Returns the ?compose= mode if it is one of `modes`, and strips it from the URL. */
export function takeComposeParam(modes: readonly ComposeMode[]): ComposeMode | null {
  if (typeof window === "undefined") return null
  const url = new URL(window.location.href)
  const mode = url.searchParams.get("compose") as ComposeMode | null
  if (!mode || !modes.includes(mode)) return null
  url.searchParams.delete("compose")
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  return mode
}
