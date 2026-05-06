// Tiny rectangular flag image. Uses flagcdn.com — same provider as the navbar
// CountryFlag, so requests get cached cross-component.
//
// Country code = 2-letter ISO (lowercased). EU is supported (eu.png).

interface FlagImageProps {
  code: string
  alt?: string
  size?: number    // height in px (default 14)
  rounded?: boolean
}

export default function FlagImage({ code, alt, size = 14, rounded = true }: FlagImageProps) {
  const cc = (code || "").toLowerCase()
  const w = Math.round(size * 4 / 3)  // 4:3 aspect ratio matches flagcdn renditions
  return (
    <img
      src={`https://flagcdn.com/40x30/${cc}.png`}
      srcSet={`https://flagcdn.com/80x60/${cc}.png 2x`}
      width={w}
      height={size}
      alt={alt ?? cc.toUpperCase()}
      className={`inline-block select-none flex-shrink-0 ${rounded ? "rounded-[2px]" : ""}`}
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.4)" }}
      draggable={false}
    />
  )
}
