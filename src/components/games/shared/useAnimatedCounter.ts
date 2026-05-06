"use client"

import { useEffect, useRef, useState } from "react"

export function useAnimatedCounter(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    const startTime = performance.now()
    let raf: number | null = null

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (target - from) * eased
      setDisplay(v)
      fromRef.current = v
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [target, duration])

  return display
}
