import type { Strand } from './model'
import { HAIR_GROUP_COUNT, isSideStrand, STRAND_COUNT, STRANDS_PER_GROUP } from './hairLayout'

export interface Pt { x: number; y: number }
export type Curve = readonly [Pt, Pt, Pt, Pt]

// The top of the drawn head, shared with the artwork so hair roots and the scalp cover follow its exact curve.
export const HEAD_TOP_PATH = 'M168 246c-1-60 40-74 81-74s84 13 84 73'
export const LEFT_CURVE: Curve = [{ x: 168, y: 246 }, { x: 167, y: 186 }, { x: 208, y: 172 }, { x: 249, y: 172 }]
export const RIGHT_CURVE: Curve = [{ x: 249, y: 172 }, { x: 290, y: 172 }, { x: 333, y: 185 }, { x: 333, y: 245 }]

export function bezier([a, b, c, d]: Curve, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  }
}

export function headTopY(x: number): number {
  const curve = x < RIGHT_CURVE[0].x ? LEFT_CURVE : RIGHT_CURVE
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    if (bezier(curve, middle).x < x) low = middle
    else high = middle
  }
  return bezier(curve, (low + high) / 2).y
}

// How far each layer's roots sit inside the head outline, so the hairline is slightly uneven and natural.
const ROOT_DEPTH = [5, 9, 13, 9, 13] as const
const ROOT_SPREAD = [0, -6, -3, 3, 6] as const
const SIDE_ROOT_Y = 211
export const TOP_ROOT_X = 175
export const TOP_ROOT_GAP = 15

const ROOTS: readonly Pt[] = Array.from({ length: STRAND_COUNT }, (_, index) => {
  const group = index % HAIR_GROUP_COUNT
  const layer = Math.floor(index / HAIR_GROUP_COUNT)
  if (isSideStrand(index)) return { x: (group === 11 ? 166 : 334) + ROOT_SPREAD[layer], y: SIDE_ROOT_Y }
  const x = TOP_ROOT_X + group * TOP_ROOT_GAP + ROOT_SPREAD[layer]
  return { x, y: headTopY(x) + ROOT_DEPTH[layer] }
})

export function hairRoot(index: number): Pt {
  return ROOTS[index]
}

const CAP_CENTER: Pt = { x: 250, y: 248 }
const CAP_BOTTOM = 238
const CAP_SAMPLES = 18

function scaledHeadTop(scale: number): Pt[] {
  const samples = [LEFT_CURVE, RIGHT_CURVE].flatMap((curve, side) =>
    Array.from({ length: CAP_SAMPLES + 1 }, (_, step) => step / CAP_SAMPLES).filter((t) => side === 0 || t > 0).map((t) => bezier(curve, t)))
  return samples
    .map((p) => ({ x: CAP_CENTER.x + (p.x - CAP_CENTER.x) * scale, y: CAP_CENTER.y + (p.y - CAP_CENTER.y) * scale }))
    .filter((p) => p.y <= CAP_BOTTOM)
}

function pointList(points: readonly Pt[]): string {
  return points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')
}

// A band of hair that hugs the head from the outline down to a hairline, so brushing strands away never shows bare scalp.
export const SCALP_CAP_POINTS: readonly Pt[] = [...scaledHeadTop(1.04), ...scaledHeadTop(0.72).reverse()]
export const SCALP_CAP_PATH = `M${pointList(SCALP_CAP_POINTS)}Z`
// Faint flowing lines across the band so it reads as hair rather than a flat helmet.
export const SCALP_SHEEN_PATHS: readonly string[] = [0.8, 0.9, 0.97].map((scale) => `M${pointList(scaledHeadTop(scale))}`)

export interface ScalpTint { x: number; color: string; wetness: number; soap: number }

function blend(colors: readonly string[]): string {
  if (colors.length === 0 || colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) return colors[0] ?? '#eb9c95'
  const channel = (offset: number) => Math.round(colors.reduce((sum, color) => sum + parseInt(color.slice(offset, offset + 2), 16), 0) / colors.length)
  return `#${[1, 3, 5].map((offset) => channel(offset).toString(16).padStart(2, '0')).join('')}`
}

// Each top-of-head column takes the color, wetness and soap of the strands growing from it.
export function scalpTints(hair: readonly Strand[]): ScalpTint[] {
  return Array.from({ length: HAIR_GROUP_COUNT }, (_, group) => group).filter((group) => !isSideStrand(group)).map((group) => {
    const strands = Array.from({ length: STRANDS_PER_GROUP }, (_, layer) => hair[layer * HAIR_GROUP_COUNT + group])
    return {
      x: TOP_ROOT_X + group * TOP_ROOT_GAP,
      color: blend(strands.map((strand) => strand.color)),
      wetness: strands.reduce((sum, strand) => sum + (strand.wetness ?? 0), 0) / strands.length,
      soap: strands.filter((strand) => strand.soapy).length / strands.length,
    }
  })
}
