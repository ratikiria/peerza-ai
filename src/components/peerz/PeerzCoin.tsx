import { cn } from "@/lib/utils"

/**
 * The Peerz coin — a gold moon. `orbit` adds the Peerza rocket circling it,
 * kept for hero moments (wallet header, big rewards), never at small sizes.
 */
export default function PeerzCoin({
  size = 18, orbit = false, float = false, className,
}: {
  size?: number
  orbit?: boolean
  float?: boolean
  className?: string
}) {
  const large = size >= 40
  const coin = (
    <span
      aria-hidden="true"
      className={cn("pz-coin inline-block", large && "pz-coin-lg", !orbit && className)}
      style={{ width: size, height: size }}
    />
  )
  if (!orbit && !float) return coin
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex flex-none", float && "pz-coin-float", className)}
      style={{ width: size, height: size }}
    >
      {coin}
      {orbit && (
        <span className="pz-coin-orbit">
          <svg
            className="absolute left-1/2 top-0 -translate-x-1/2"
            width={Math.max(10, size * 0.11)}
            height={Math.max(15, size * 0.165)}
            viewBox="-2 -2 13 34"
          >
            <rect x="2" y="3" width="6" height="27" rx="1" style={{ fill: "var(--text-primary)" }} />
            <path d="M2 3L8 3L5-1.2Z" style={{ fill: "var(--text-primary)" }} />
            <path d="M8 22L11 28.6L8 26ZM2 22L-1 28.6L2 26Z" fillOpacity=".8" style={{ fill: "var(--text-primary)" }} />
            <circle cx="5" cy="20" r="1.6" fill="#10b981" />
          </svg>
        </span>
      )}
    </span>
  )
}
