import type { Strand } from './model'

// Soft rainbow colors that sit well beside the salon's pastel paints, from the roots out to the tips.
export const RAINBOW_COLORS = ['#ee8e8e', '#f3b670', '#f0d878', '#9fcb8b', '#86bcd9', '#b39ddb'] as const

export interface DyeStop {
  // How far along the lock, from 0 at the root to 1 at the tip.
  offset: number
  color: string
}

// Where a dip-dye line sits, and the soft stretch a fade blends over, as shares of the lock from root to tip.
const DIP_LINE = 0.55
const FADE_FROM = 0.15
const FADE_TO = 0.85

// The colors along a lock from root to tip, or null when it is all one plain color.
export function dyeStops(strand: Strand): DyeStop[] | null {
  if (strand.rainbow) return RAINBOW_COLORS.map((color, index) => ({ offset: index / (RAINBOW_COLORS.length - 1), color }))
  if (strand.tip === undefined) return null
  return strand.fade
    ? [{ offset: FADE_FROM, color: strand.color }, { offset: FADE_TO, color: strand.tip }]
    : [{ offset: 0, color: strand.color }, { offset: DIP_LINE, color: strand.color }, { offset: DIP_LINE, color: strand.tip }, { offset: 1, color: strand.tip }]
}

// The color right at the roots, which the scalp takes on.
export function rootColor(strand: Strand): string {
  return strand.rainbow ? RAINBOW_COLORS[0] : strand.color
}
