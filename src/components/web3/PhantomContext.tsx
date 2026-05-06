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

  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), [])

  useEffect(() => {
    const check = () => setAvailable(!!getProvider())
    check()
    const t = setInterval(check, 500)
    return () => clearInterval(t)
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
    const p = getProvider()
    if (!p) {
      window.open("https://phantom.app/", "_blank")
      return
    }
    setConnecting(true)
    try {
      const res = await p.connect()
      setPublicKey(res.publicKey.toString())
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
