"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"

type PhantomProvider = {
  isPhantom?: boolean
  publicKey: { toString(): string } | null
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>
  disconnect: () => Promise<void>
  signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    solana?: PhantomProvider
    phantom?: { solana?: PhantomProvider }
  }
}

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  "https://api.devnet.solana.com"

interface PhantomState {
  available: boolean
  connected: boolean
  publicKey: string | null
  balance: number | null
  connecting: boolean
  /** Last connect() failure reason, or null. UI surfaces this inline. */
  connectError: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  refreshBalance: () => Promise<void>
  connection: Connection
  network: "devnet"
}

const PhantomCtx = createContext<PhantomState | null>(null)

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana
  if (window.solana?.isPhantom) return window.solana
  return null
}

export function PhantomProvider({ children }: { children: React.ReactNode }) {
  const [available, setAvailable] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), [])

  useEffect(() => {
    // Phantom can inject `window.phantom.solana` either before our React mount
    // (legacy timing) or asynchronously after hydration (production builds —
    // we've seen this fail to detect with a single 500ms poll on www.peerza.ai
    // while the same browser + extension works on localhost). Robust strategy:
    //   1. Poll aggressively for the first ~3s, then slow down — covers both
    //      pre-mount and post-mount injection without burning CPU forever.
    //   2. Listen for Wallet Standard's "register-wallet" event — modern
    //      Phantom dispatches this on init and re-dispatches on app-ready.
    //   3. Dispatch "wallet-standard:app-ready" so wallets that initialised
    //      before us re-announce themselves.
    let interval: number | null = null
    let slowInterval: number | null = null
    let stopFast: number | null = null

    const check = () => {
      const present = !!getProvider()
      setAvailable((prev) => (prev === present ? prev : present))
    }
    check()

    interval = window.setInterval(check, 100)
    stopFast = window.setTimeout(() => {
      if (interval) window.clearInterval(interval)
      interval = null
      slowInterval = window.setInterval(check, 1000)
    }, 3000)

    const onRegister = () => check()
    window.addEventListener("wallet-standard:register-wallet", onRegister)
    try {
      window.dispatchEvent(new Event("wallet-standard:app-ready"))
    } catch {}

    return () => {
      if (interval) window.clearInterval(interval)
      if (slowInterval) window.clearInterval(slowInterval)
      if (stopFast) window.clearTimeout(stopFast)
      window.removeEventListener("wallet-standard:register-wallet", onRegister)
    }
  }, [])

  useEffect(() => {
    const p = getProvider()
    if (!p) return
    p.connect({ onlyIfTrusted: true })
      .then((res) => setPublicKey(res.publicKey.toString()))
      .catch(() => {})
    const onAccountChanged = (...args: unknown[]) => {
      const newKey = args[0] as { toString(): string } | null
      if (newKey) setPublicKey(newKey.toString())
      else setPublicKey(null)
    }
    p.on("accountChanged", onAccountChanged)
    return () => {
      p.removeListener?.("accountChanged", onAccountChanged)
    }
  }, [available])

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null)
      return
    }
    try {
      const lamports = await connection.getBalance(new PublicKey(publicKey))
      setBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      setBalance(null)
    }
  }, [publicKey, connection])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  const connect = useCallback(async () => {
    setConnectError(null)
    setConnecting(true)
    try {
      // Phantom may still be injecting at click time (especially right after
      // a hard reload on production). Give it up to ~2s to appear before
      // surfacing an error. We don't auto-redirect to phantom.app anymore —
      // that was confusing users who already had Phantom installed but
      // hit a transient detection miss.
      let p = getProvider()
      if (!p) {
        const start = Date.now()
        while (!p && Date.now() - start < 2000) {
          await new Promise((r) => setTimeout(r, 100))
          p = getProvider()
        }
      }
      if (!p) {
        setConnectError(
          "Phantom not detected in this browser. Make sure the extension is installed and enabled, then refresh the page."
        )
        return
      }
      const res = await p.connect()
      setPublicKey(res.publicKey.toString())
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed"
      // User rejected the popup — no need to alarm them.
      if (/reject|user/i.test(msg)) {
        setConnectError(null)
      } else {
        setConnectError(msg)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    const p = getProvider()
    if (!p) return
    await p.disconnect()
    setPublicKey(null)
    setBalance(null)
  }, [])

  const value: PhantomState = {
    available,
    connected: !!publicKey,
    publicKey,
    balance,
    connecting,
    connectError,
    connect,
    disconnect,
    refreshBalance,
    connection,
    network: "devnet",
  }

  return <PhantomCtx.Provider value={value}>{children}</PhantomCtx.Provider>
}

export function usePhantom() {
  const ctx = useContext(PhantomCtx)
  if (!ctx) throw new Error("usePhantom must be used inside <PhantomProvider>")
  return ctx
}

export function getPhantomProvider() {
  return getProvider()
}
