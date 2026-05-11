"use client"

import { useState } from "react"
import { Wallet, Copy, Check, ExternalLink, RefreshCw, LogOut, Droplet } from "lucide-react"
import { PublicKey } from "@solana/web3.js"
import { usePhantom } from "./PhantomContext"

function shortAddr(a: string) {
  return a.slice(0, 4) + "…" + a.slice(-4)
}

export default function WalletConnect() {
  const { available, connected, publicKey, balance, connecting, connectError, connect, disconnect, refreshBalance, connection } = usePhantom()
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [airdropping, setAirdropping] = useState(false)
  const [airdropMsg, setAirdropMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const onCopy = () => {
    if (!publicKey) return
    navigator.clipboard.writeText(publicKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshBalance()
    setTimeout(() => setRefreshing(false), 600)
  }

  const onAirdrop = async () => {
    if (!publicKey) return
    setAirdropping(true)
    setAirdropMsg(null)
    try {
      const sig = await connection.requestAirdrop(new PublicKey(publicKey), 1_000_000_000)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed")
      await refreshBalance()
      setAirdropMsg({ type: "ok", text: "1 SOL airdropped to your wallet." })
    } catch (e) {
      const m = e instanceof Error ? e.message : "Airdrop failed"
      const pretty = m.includes("429") || m.toLowerCase().includes("rate")
        ? "RPC airdrop is rate-limited. Try one of the web faucets below, or wait a few minutes."
        : m
      setAirdropMsg({ type: "err", text: pretty })
    } finally {
      setAirdropping(false)
      setTimeout(() => setAirdropMsg(null), 6000)
    }
  }

  return (
    <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-gray-950 to-indigo-950/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <Wallet size={20} className="text-purple-300" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-50 tracking-tight">Wallet</h2>
          <p className="text-xs text-purple-300/70">Solana · Devnet</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>

      {!connected ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 leading-relaxed">
            Connect your Phantom wallet to demo on-chain achievements, prediction stakes, and creator tipping. All transactions run on Solana <strong className="text-purple-300">devnet</strong> — no real funds used.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:bg-purple-700 text-white font-bold px-5 py-3 text-sm tracking-wide transition-colors shadow-lg shadow-purple-500/30"
          >
            <Wallet size={16} />
            {connecting ? "Connecting…" : "Connect Phantom"}
          </button>
          {connectError && (
            <p className="text-xs text-rose-300 leading-relaxed">
              {connectError}{" "}
              <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline">
                Get Phantom →
              </a>
            </p>
          )}
          {!connectError && !available && (
            <p className="text-xs text-gray-500">
              Don't have Phantom yet?{" "}
              <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline">
                Install the extension →
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Address</span>
            <code className="text-sm font-mono text-gray-200 ml-auto">{shortAddr(publicKey!)}</code>
            <button
              onClick={onCopy}
              className="text-gray-400 hover:text-purple-300 transition-colors"
              title="Copy address"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <a
              href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-300 transition-colors"
              title="View on Solana Explorer"
            >
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Balance</span>
            <span className="text-sm font-bold text-gray-100 ml-auto tabular-nums">
              {balance === null ? "—" : balance.toFixed(4)} <span className="text-purple-300">SOL</span>
            </span>
            <button
              onClick={onRefresh}
              className="text-gray-400 hover:text-purple-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Droplet size={14} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-200">Need devnet SOL?</p>
              </div>
              <button
                onClick={onAirdrop}
                disabled={airdropping}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-gray-950 text-xs font-bold px-3 py-1.5 transition-colors flex-shrink-0"
              >
                {airdropping ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" /> Airdropping…
                  </>
                ) : (
                  <>
                    <Droplet size={11} /> Airdrop 1 SOL
                  </>
                )}
              </button>
            </div>
            {airdropMsg && (
              <div className={`text-[11px] leading-relaxed ${airdropMsg.type === "ok" ? "text-emerald-300" : "text-rose-300"}`}>
                {airdropMsg.text}
              </div>
            )}
            <div className="text-[10px] text-amber-300/70 leading-relaxed">
              Or try a web faucet:{" "}
              <a href="https://faucet.quicknode.com/solana/devnet" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">QuickNode</a>
              {" · "}
              <a href="https://faucet.triangleplatform.com/solana/devnet" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">Triangle</a>
              {" · "}
              <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">Official</a>
            </div>
          </div>

          <button
            onClick={disconnect}
            className="inline-flex items-center gap-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <LogOut size={12} /> Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
