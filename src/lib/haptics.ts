// Light tap feedback. Inside the Capacitor app the native Haptics plugin is on
// window.Capacitor.Plugins; in a phone browser we fall back to vibrate()
// (Android only — iOS Safari has none). Never throws.
type HapticStyle = "light" | "medium"
type CapacitorGlobal = {
  isNativePlatform?: () => boolean
  Plugins?: { Haptics?: { impact: (o: { style: "LIGHT" | "MEDIUM" }) => unknown } }
}

export function haptic(style: HapticStyle = "light") {
  if (typeof window === "undefined") return
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
    const native = cap?.isNativePlatform?.() ? cap.Plugins?.Haptics : null
    if (native) {
      native.impact({ style: style === "light" ? "LIGHT" : "MEDIUM" })
      return
    }
    navigator.vibrate?.(style === "light" ? 8 : 14)
  } catch {}
}
