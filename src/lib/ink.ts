// Accent hexes in this codebase were picked for dark backgrounds and wash out
// as text on white. ink() turns a hex into a CSS color that is unchanged in
// dark mode and swaps to a deeper shade in light mode: globals.css defines
// --ink-<hex> only under [data-theme="light"], so dark falls back to the hex.
//
// Use it for text colors only — tinted backgrounds/borders (`${hex}22`) read
// fine on white and should keep the raw hex.
export function ink(color: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color
  return `var(--ink-${color.slice(1).toLowerCase()}, ${color})`
}
