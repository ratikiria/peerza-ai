"use client"

import { useState } from "react"
import { Heart, Send, Check, ExternalLink } from "lucide-react"
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { usePhantom, getPhantomProvider } from "./PhantomContext"

interface Creator {
  id: string
  name: string
  handle: string
  avatar: string
  post: string
  // Devnet recipient — Solana Foundation devnet test wallet (a well-known burn-friendly address)
  // Using a deterministic devnet address so demo recipients are visible on Explorer
  recipient: string
}

const creators: Creator[] = [
  {
    id: "alex",
    name: "Alex Chen",
    handle: "alexchen_fx",
    avatar: "🧑‍💼",
    post: "Just nailed the Brexit scenario in Guess the Direction. Reading the GBP/USD chart in 2016 was wild.",
    recipient: "9pXk9XZTAnFW4xmPNvjwVbzaeSv1oSRZQjLzD8gLk6vR",
  },
  {
    id: "sarah",
    name: "Sarah Patel",
    handle: "sarah_stocks",
    avatar: "👩‍🚀",
    post: "30-day streak on my paper portfolio — diversification works, who knew? 60/40 still slaps.",
    recipient: "9pXk9XZTAnFW4xmPNvjwVbzaeSv1oSRZQjLzD8gLk6vR",
  },
  {
    id: "marcus",
    name: "Marcus Lee",
    handle: "marcus_trades",
    avatar: "👨‍🎓",
    post: "AI Tutor's options chapter 4 finally clicked. The wheel strategy lesson is gold.",
    recipient: "9pXk9XZTAnFW4xmPNvjwVbzaeSv1oSRZQjLzD8gLk6vR",
  },
]

const tipAmounts = [0.001, 0.005, 0.01]

export default function TipDemo() {
  const { connected, publicKey, connection } = usePhantom()
  const [tipping, setTipping] = useState<string | null>(null)
  const [tipped, setTipped] = useState<Record<string, { amount: number; sig: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<Record<string, number>>({})

  const handleTip = async (creator: Creator) => {
    setError(null)
    if (!connected || !publicKey) {
      setError("Connect your wallet first")
      return
    }
    const provider = getPhantomProvider()
    if (!provider) return
    const amount = selectedAmount[creator.id] ?? 0.001
    setTipping(creator.id)
    try {
      const from = new PublicKey(publicKey)
      const to = new PublicKey(creator.recipient)
      const ix = SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
      const tx = new Transaction().add(ix)
      tx.feePayer = from
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      const { signature } = await provider.signAndSendTransaction(tx)
      setTipped((m) => ({ ...m, [creator.id]: { amount, sig: signature } }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed"
      setError(msg)
    } finally {
      setTipping(null)
    }
  }

  return (
    <div className="rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-950/20 via-gray-950 to-rose-950/10 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
          <Heart size={20} className="text-pink-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-50 tracking-tight">Tip Creators</h2>
          <p className="text-xs text-pink-300/70">Solana Pay · sub-cent fees</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live demo
        </span>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed mb-5">
        Reward great posts with SOL. Real devnet transfers — micro-tips become viable on Solana because fees are fractions of a cent.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {creators.map((c) => {
          const result = tipped[c.id]
          const isTipping = tipping === c.id
          const amt = selectedAmount[c.id] ?? 0.001
          return (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xl flex-shrink-0">
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-bold text-gray-100">{c.name}</p>
                    <p className="text-xs text-gray-500">@{c.handle}</p>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mt-0.5">{c.post}</p>
                </div>
              </div>

              {result ? (
                <a
                  href={`https://explorer.solana.com/tx/${result.sig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  <Check size={12} /> Tipped {result.amount} SOL <ExternalLink size={10} />
                </a>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1 rounded-lg bg-gray-800/60 border border-gray-700 p-1">
                    {tipAmounts.map((a) => (
                      <button
                        key={a}
                        onClick={() => setSelectedAmount((s) => ({ ...s, [c.id]: a }))}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                          amt === a
                            ? "bg-pink-500/30 text-pink-200"
                            : "text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleTip(c)}
                    disabled={!connected || isTipping}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 disabled:bg-gray-800 disabled:text-gray-600 border border-pink-500/40 disabled:border-gray-700 px-3 py-1.5 text-xs font-bold text-pink-200 transition-colors"
                  >
                    <Send size={11} />
                    {isTipping ? "Sending…" : connected ? `Tip ${amt} SOL` : "Connect wallet"}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
