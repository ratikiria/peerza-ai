import { NextResponse } from "next/server"
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { auth } from "@/lib/auth"
import { consume, getClientIp, tooManyRequests } from "@/lib/rate-limit"

// Devnet airdrop relay — the user's client request to `api.devnet.solana.com`
// counts against their home IP's per-hour quota; ours counts against Railway's
// IP. Different bucket = the demo doesn't break just because the user already
// tested the button a few times today.
//
// We always go through `api.devnet.solana.com` here, even if the public
// NEXT_PUBLIC_SOLANA_RPC_URL is set to Helius or another provider — third-party
// RPCs typically disable `requestAirdrop` entirely.
const AIRDROP_RPC = "https://api.devnet.solana.com"
const AMOUNT_SOL = 1
const AMOUNT_LAMPORTS = AMOUNT_SOL * LAMPORTS_PER_SOL

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Per-user + per-IP rate cap: 3 successful requests per 10 minutes. Stops a
  // single account hammering the relay (which would burn through Railway's
  // shared quota and break everyone else's airdrops).
  const ip = getClientIp(req)
  const ipBucket = consume(`airdrop:ip:${ip}`, 3, 10 * 60 * 1000)
  const userBucket = consume(`airdrop:user:${session.user.id}`, 3, 10 * 60 * 1000)
  if (!ipBucket.ok || !userBucket.ok) {
    return tooManyRequests(
      Math.max(ipBucket.retryAfter, userBucket.retryAfter),
      "Server airdrop limit reached. Use the web faucet links below for now.",
    )
  }

  const body = await req.json().catch(() => null)
  const recipient = typeof body?.recipient === "string" ? body.recipient.trim() : ""
  if (!recipient) {
    return NextResponse.json({ error: "recipient address required" }, { status: 400 })
  }

  let pubkey: PublicKey
  try {
    pubkey = new PublicKey(recipient)
  } catch {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 })
  }

  try {
    const conn = new Connection(AIRDROP_RPC, "confirmed")
    const signature = await conn.requestAirdrop(pubkey, AMOUNT_LAMPORTS)
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash()
    await conn.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    )
    return NextResponse.json({ signature, amount: AMOUNT_SOL })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "airdrop failed"
    const rateLimited = /429|rate|too many|airdrop limit/i.test(msg)
    return NextResponse.json(
      {
        error: rateLimited
          ? "Devnet airdrop is busy right now. Use the web faucet links below — your address has been copied to your clipboard."
          : msg,
        rateLimited,
      },
      { status: rateLimited ? 429 : 502 },
    )
  }
}
