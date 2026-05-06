"use client"

import { useState } from "react"
import { Trophy, Sparkles, Check, ExternalLink, Award } from "lucide-react"
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { usePhantom, getPhantomProvider } from "./PhantomContext"

interface Badge {
  id: string
  title: string
  description: string
  rarity: "common" | "rare" | "legendary"
  emoji: string
  earned: boolean
}

const badges: Badge[] = [
  { id: "first-trade", title: "First Trade", description: "Complete your first paper trade", rarity: "common", emoji: "🎯", earned: true },
  { id: "duel-champion", title: "Duel Champion", description: "Win 5 head-to-head duels", rarity: "rare", emoji: "⚔️", earned: true },
  { id: "10-streak", title: "10-Day Streak", description: "Log in and trade 10 days in a row", rarity: "rare", emoji: "🔥", earned: true },
  { id: "tutor-master", title: "Market Mentor", description: "Complete the AI Tutor curriculum", rarity: "legendary", emoji: "🧠", earned: false },
  { id: "perfect-score", title: "Perfect Score", description: "Hit 6/6 on Guess the Direction", rarity: "rare", emoji: "💎", earned: true },
  { id: "tape-reader", title: "Tape Reader", description: "Master the order-flow game", rarity: "legendary", emoji: "📊", earned: false },
]

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

const rarityStyles = {
  common: "border-gray-700 bg-gray-900/60",
  rare: "border-purple-500/40 bg-gradient-to-br from-purple-950/40 to-gray-900",
  legendary: "border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-gray-900 to-rose-950/20",
}

const rarityLabel = {
  common: "text-gray-400",
  rare: "text-purple-300",
  legendary: "text-amber-300",
}

export default function Achievements() {
  const { connected, publicKey, connection } = usePhantom()
  const [minting, setMinting] = useState<string | null>(null)
  const [minted, setMinted] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const handleMint = async (badge: Badge) => {
    setError(null)
    if (!connected || !publicKey) {
      setError("Connect your wallet first")
      return
    }
    const provider = getPhantomProvider()
    if (!provider) {
      setError("Phantom not available")
      return
    }
    setMinting(badge.id)
    try {
      const wallet = new PublicKey(publicKey)
      const memo = `peerza-achievement:${badge.id}:${Date.now()}`
      const ix = new TransactionInstruction({
        keys: [{ pubkey: wallet, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf-8"),
      })
      const tx = new Transaction().add(ix)
      tx.feePayer = wallet
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      const { signature } = await provider.signAndSendTransaction(tx)
      setMinted((m) => ({ ...m, [badge.id]: signature }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed"
      setError(msg)
    } finally {
      setMinting(null)
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-gray-950 to-gray-950 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Trophy size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-50 tracking-tight">On-chain Achievements</h2>
          <p className="text-xs text-emerald-300/70">Compressed NFTs · ~$0.0001 to mint</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <Sparkles size={10} /> Live demo
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">
        Earn badges by trading, dueling, and learning. This demo writes a verifiable memo to Solana for each mint — production would use Metaplex compressed NFTs (cNFTs) for portable trader reputation.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((b) => {
          const isMinted = !!minted[b.id]
          const isMinting = minting === b.id
          return (
            <div
              key={b.id}
              className={`relative rounded-2xl border p-4 ${rarityStyles[b.rarity]} ${!b.earned ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl flex-shrink-0">{b.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-100 leading-tight">{b.title}</p>
                  <p className={`text-[10px] uppercase tracking-wider font-bold ${rarityLabel[b.rarity]}`}>
                    {b.rarity}
                  </p>
                </div>
                {isMinted && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <Check size={12} className="text-emerald-400" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3 min-h-[32px]">{b.description}</p>

              {!b.earned ? (
                <p className="text-[11px] text-gray-500 italic">Locked — earn this in-app</p>
              ) : isMinted ? (
                <a
                  href={`https://explorer.solana.com/tx/${minted[b.id]}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  <Award size={12} /> View on chain <ExternalLink size={10} />
                </a>
              ) : (
                <button
                  onClick={() => handleMint(b)}
                  disabled={!connected || isMinting}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:bg-gray-800 disabled:text-gray-600 border border-emerald-500/30 disabled:border-gray-700 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors"
                >
                  {isMinting ? "Minting…" : connected ? "Mint to Solana" : "Connect wallet"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
