"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({
  value,
  duration = 700,
  format = (v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  className,
  style,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const isFirst = useRef(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className} style={style}>{format(display)}</span>;
}

interface FlashCellProps {
  value: number | null;
  children: ReactNode;
  className?: string;
}

// Wraps content; briefly applies a green/red background tint when `value` changes.
export function FlashCell({ value, children, className = "" }: FlashCellProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) return;
    if (prevRef.current == null) {
      prevRef.current = value;
      return;
    }
    if (value === prevRef.current) return;
    const dir: "up" | "down" = value > prevRef.current ? "up" : "down";
    prevRef.current = value;
    setFlash(dir);
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={`inline-block rounded px-1 -mx-1 ${className}`}
      style={{
        background:
          flash === "up" ? "rgba(74,222,128,0.22)" :
          flash === "down" ? "rgba(248,113,113,0.22)" :
          "transparent",
        transition: flash ? "none" : "background 800ms ease-out",
      }}
    >
      {children}
    </span>
  );
}
