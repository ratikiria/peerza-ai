"use client"

import { useEffect, useState } from "react"
import { Users, Newspaper } from "lucide-react"
import WorkspaceCommunity from "./WorkspaceCommunity"
import WorkspaceNews from "./WorkspaceNews"

type Tab = "community" | "news"

const TAB_KEY = "peerza-workspace-panel-tab-v1"

interface Props {
  ticker: string
}

export default function WorkspacePanel({ ticker }: Props) {
  const [tab, setTab] = useState<Tab>("community")

  useEffect(() => {
    try {
      const v = localStorage.getItem(TAB_KEY)
      if (v === "community" || v === "news") setTab(v)
    } catch {}
  }, [])

  function pick(t: Tab) {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch {}
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-card)" }}>
      {/* Tab strip */}
      <div
        className="flex items-stretch text-[11px] font-semibold"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <TabButton
          active={tab === "community"}
          onClick={() => pick("community")}
          icon={<Users size={12} />}
          label="Community"
        />
        <TabButton
          active={tab === "news"}
          onClick={() => pick("news")}
          icon={<Newspaper size={12} />}
          label="News"
        />
      </div>

      <div className="flex-1 min-h-0">
        {tab === "community" ? (
          <WorkspaceCommunity ticker={ticker} />
        ) : (
          <WorkspaceNews ticker={ticker} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors relative"
      style={{
        background: active ? "rgba(16,185,129,0.10)" : "transparent",
        color: active ? "#10b981" : "var(--text-secondary)",
      }}
    >
      {icon}
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0"
          style={{ height: 2, background: "#10b981" }}
        />
      )}
    </button>
  )
}
