import type { Metadata } from "next"
import Workspace from "@/components/workspace/Workspace"

export const metadata: Metadata = {
  title: "Workspace · Peerza.ai",
  description: "Pro charts, indicators, and tools for serious analysis.",
}

export default function WorkspacePage() {
  return <Workspace />
}
