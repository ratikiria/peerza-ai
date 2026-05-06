import { Star } from "lucide-react"

interface ProBadgeProps {
  size?: "xs" | "sm" | "md" | "lg"
  withLabel?: boolean
  className?: string
}

const SIZE_PX: Record<NonNullable<ProBadgeProps["size"]>, number> = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
}

export default function ProBadge({ size = "sm", withLabel = false, className = "" }: ProBadgeProps) {
  const px = SIZE_PX[size]
  return (
    <span
      title="Peerza.ai Pro member"
      aria-label="Pro member"
      className={`inline-flex items-center gap-1 align-middle ${className}`}
    >
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: px + 4,
          height: px + 4,
          background: "linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)",
          boxShadow: "0 0 8px rgba(16,185,129,0.45)",
        }}
      >
        <Star size={px - 1} strokeWidth={2.5} className="text-gray-950" fill="#0f1117" />
      </span>
      {withLabel && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide text-emerald-400"
          style={{ letterSpacing: "0.05em" }}
        >
          Pro
        </span>
      )}
    </span>
  )
}
