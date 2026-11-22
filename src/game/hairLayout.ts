export const HAIR_GROUP_COUNT = 13
export const STRANDS_PER_GROUP = 5
export const STRAND_COUNT = HAIR_GROUP_COUNT * STRANDS_PER_GROUP
export const MIN_REACH = 22
// Hair can be cut shorter than any style grows it. At this length a strand has no hair left and the scalp shows.
export const MIN_LENGTH = -0.2
// Cutting this close to the roots (in SVG units) takes the whole strand, so a close shave is easy to reach.
export const BALD_REACH = 12
// Horizontal middle of the head; hair on either side leans away from it.
export const HAIR_CENTER_X = 250

// Every drawn point after the fixed root can be moved independently by the brush.
export const HAIR_POINTS = 24
export const HAIR_SHAPE_LENGTH = HAIR_POINTS * 2
export const HAIR_SHAPE_LIMIT = 300

// x/y pairs for drawn points 1..24; the root point never moves.
export type HairShape = readonly number[]

// One strand's pose as displacements from its saved pose, in the same layout as a brushed shape.
export interface StrandPose {
  index: number
  offsets: HairShape
}

export function isSideStrand(index: number): boolean {
  return index % HAIR_GROUP_COUNT > 10
}

export function lengthScale(index: number): number {
  return isSideStrand(index) ? 107 : 106
}

export function strandReach(length: number, index: number): number {
  return Math.max(0, MIN_REACH + length * lengthScale(index))
}

// A shaved strand is drawn as nothing; growing it brings it back.
export function isBald(length: number): boolean {
  return length <= MIN_LENGTH
}

// 0 below `from`, 1 above `to`, and an eased blend between.
export function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export function isHairShape(value: unknown): value is HairShape {
  return Array.isArray(value) && value.length === HAIR_SHAPE_LENGTH
    && value.every((item) => typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= HAIR_SHAPE_LIMIT)
}

function isLooseShape(value: unknown): value is HairShape {
  return Array.isArray(value) && value.length === HAIR_SHAPE_LENGTH && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

// Returns a bounded shape, or undefined when nothing is bent.
export function normalizeShape(shape: HairShape | null | undefined): HairShape | undefined {
  if (!isLooseShape(shape)) return undefined
  const bounded = shape.map((value) => Math.max(-HAIR_SHAPE_LIMIT, Math.min(HAIR_SHAPE_LIMIT, value)) + 0)
  return bounded.some((value) => value !== 0) ? bounded : undefined
}

export function roundShape(shape: HairShape): number[] {
  return shape.map((value) => Math.round(value * 100) / 100 + 0)
}

export function addShape(base: HairShape | undefined, shift: HairShape): HairShape | undefined {
  return normalizeShape(shift.map((value, slot) => value + (base?.[slot] ?? 0)))
}

// Growing or trimming a whole strand keeps the same overall style.
export function scaleShape(shape: HairShape | undefined, ratio: number): HairShape | undefined {
  if (!shape || ratio === 1 || !Number.isFinite(ratio)) return shape
  return normalizeShape(shape.map((value) => value * ratio))
}

// The first `retained` fraction of a bent strand becomes the whole new strand.
export function truncateShape(shape: HairShape | undefined, retained: number): HairShape | undefined {
  if (!shape) return undefined
  const kept = Math.max(0, Math.min(1, retained))
  return normalizeShape(Array.from({ length: HAIR_SHAPE_LENGTH }, (_, slot) => {
    const axis = slot % 2
    const position = kept * (Math.floor(slot / 2) + 1)
    const lower = Math.floor(position)
    const upper = Math.min(HAIR_POINTS, lower + 1)
    const from = lower === 0 ? 0 : shape[(lower - 1) * 2 + axis]
    const to = shape[(upper - 1) * 2 + axis]
    return from + (to - from) * (position - lower)
  }))
}
