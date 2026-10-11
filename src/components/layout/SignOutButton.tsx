"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function SignOutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-3 px-4 min-h-[48px] w-full text-sm font-semibold text-rose-400"
    >
      <LogOut size={18} /> {label}
    </button>
  )
}
