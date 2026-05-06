"use client"

import { Sparkles, Zap, Shield, Globe } from "lucide-react"
import { PhantomProvider } from "./PhantomContext"
import WalletConnect from "./WalletConnect"
import Achievements from "./Achievements"
import GamesWeb3 from "./GamesWeb3"
import PredictionLeague from "./PredictionLeague"
import TipDemo from "./TipDemo"

export default function Web3Page() {
  return (
    <PhantomProvider>
      <div className="space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-gray-950 to-indigo-950/40">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl animate-[w3-blob_12s_ease-in-out_infinite]" />
            <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-[w3-blob2_14s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl animate-[w3-blob3_16s_ease-in-out_infinite]" />
          </div>

          <div className="relative p-8 sm:p-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Sparkles size={12} /> Devnet preview
              </span>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 via-pink-400 to-amber-400 flex items-center justify-center shadow-lg shadow-purple-500/40">
                <span className="text-2xl">◎</span>
                <span className="absolute -inset-1 rounded-2xl bg-purple-400/30 blur-md -z-10 animate-[w3-glow_3s_ease-in-out_infinite]" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-gray-50 tracking-tight leading-none">
                  WEB3
                </h1>
                <p className="text-sm text-purple-300/80 font-medium mt-1">Bringing trader reputation, prediction markets, and creator economy on-chain</p>
              </div>
            </div>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-6">
              Peerza already runs the social, simulation, and games layer for finance-curious users. We're adding non-custodial Solana rails so reputation, predictions, and tips settle on-chain.
            </p>

            {/* Why Solana strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-amber-400" />
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Sub-cent fees</p>
                </div>
                <p className="text-sm font-bold text-gray-100">Per-action minting viable</p>
              </div>
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={12} className="text-emerald-400" />
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Non-custodial</p>
                </div>
                <p className="text-sm font-bold text-gray-100">Users own their assets</p>
              </div>
              <div className="rounded-xl bg-gray-900/60 border border-gray-800 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={12} className="text-purple-400" />
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Global rails</p>
                </div>
                <p className="text-sm font-bold text-gray-100">USDC payouts worldwide</p>
              </div>
            </div>
          </div>
        </section>

        {/* Wallet */}
        <WalletConnect />

        {/* Achievements */}
        <Achievements />

        {/* Games × Web3 */}
        <GamesWeb3 />

        {/* Prediction League */}
        <PredictionLeague />

        {/* Tipping */}
        <TipDemo />

        {/* Roadmap footer */}
        <section className="rounded-3xl border border-gray-800 bg-gray-900/40 p-6">
          <h2 className="text-lg font-black text-gray-100 mb-4">Solana integration roadmap</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-2">Phase 1 — Devnet (now)</p>
              <ul className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                <li>• Phantom wallet connect</li>
                <li>• Memo-based achievement proofs</li>
                <li>• SOL micro-tipping</li>
                <li>• Prediction League UI</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-purple-400 mb-2">Phase 2 — Mainnet beta</p>
              <ul className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                <li>• Compressed NFT achievements</li>
                <li>• Prediction-pool program (audited)</li>
                <li>• On-chain VRF for fair settlement</li>
                <li>• USDC tipping + Pro subscription</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400 mb-2">Phase 3 — Public</p>
              <ul className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                <li>• Tokenized strategies / copy-trading</li>
                <li>• Game-duel stake escrow</li>
                <li>• Creator monetization payouts</li>
                <li>• Open-source program release</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes w3-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(1.1); }
        }
        @keyframes w3-blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.08); }
        }
        @keyframes w3-blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -25px) scale(0.92); }
        }
        @keyframes w3-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </PhantomProvider>
  )
}
