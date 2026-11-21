const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

// Blends one #rrggbb color toward another. Anything that is not a plain hex color comes back untouched.
export function mixColor(from: string, toward: string, amount: number): string {
  const start = HEX.exec(from)
  const end = HEX.exec(toward)
  if (!start || !end) return from
  const share = Math.max(0, Math.min(1, amount))
  const channel = (index: number) => Math.round(parseInt(start[index], 16) * (1 - share) + parseInt(end[index], 16) * share).toString(16).padStart(2, '0')
  return `#${channel(1)}${channel(2)}${channel(3)}`
}
