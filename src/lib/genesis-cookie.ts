// The waitlist status page is opened by a secret manage token, kept in an
// httpOnly cookie after confirming so returning visitors land on their page.
export const GENESIS_COOKIE = "pz_genesis"

export function baseUrlFrom(req: Request): string {
  return process.env.NEXTAUTH_URL || `https://${req.headers.get("host") || "www.peerza.ai"}`
}
