interface MascotProps {
  size?: number
  className?: string
  withGlow?: boolean
  withTrail?: boolean
}

// Bull mascot — uses Microsoft Fluent Emoji 3D (free, MIT-licensed) loaded
// from jsdelivr CDN. Rendered 3D illustration looks polished out of the box;
// we wrap it in a soft emerald halo to match the brand.
//
// Source: https://github.com/microsoft/fluentui-emoji
const BULL_SRC = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Ox/3D/ox_3d.png"

export default function BullMascot({ size = 56, className = "", withGlow = true, withTrail = false }: MascotProps) {
  // withTrail kept in props for API compatibility with the prior version.
  void withTrail
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {withGlow && (
        <div
          className="absolute inset-0 rounded-full blur-xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 70%)" }}
          aria-hidden
        />
      )}
      <img
        src={BULL_SRC}
        alt="Bullish"
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        className="relative drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]"
      />
    </div>
  )
}
