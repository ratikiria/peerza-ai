interface MascotProps {
  size?: number
  className?: string
  withGlow?: boolean
  withTrail?: boolean
}

// Bear mascot — Microsoft Fluent Emoji 3D, same source/license as the Bull.
const BEAR_SRC = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Bear/3D/bear_3d.png"

export default function BearMascot({ size = 56, className = "", withGlow = true, withTrail = false }: MascotProps) {
  void withTrail
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {withGlow && (
        <div
          className="absolute inset-0 rounded-full blur-xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(244,63,94,0.5) 0%, transparent 70%)" }}
          aria-hidden
        />
      )}
      <img
        src={BEAR_SRC}
        alt="Bearish"
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        className="relative drop-shadow-[0_2px_8px_rgba(244,63,94,0.4)]"
      />
    </div>
  )
}
