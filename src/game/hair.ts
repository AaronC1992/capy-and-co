import type { Look, Strand } from './model'
import { HAIR_GROUP_COUNT, HAIR_POINTS, isSideStrand, strandReach } from './hairLayout'
import type { HairShape } from './hairLayout'
import { hairRoot } from './hairline'

export { isSideStrand, lengthScale, MIN_REACH } from './hairLayout'

export interface Point { x: number; y: number }
// Temporary brush motion per strand; undefined means the strand is at rest.
export type HairOffsets = readonly (HairShape | undefined)[]
export const FLOW_DISTANCE = 25

// `extra` is transient motion layered over the saved style while the hair is being brushed.
export function strandPoints(strand: Strand, index: number, extra?: HairShape): Point[] {
  const group = index % HAIR_GROUP_COUNT
  const side = isSideStrand(index)
  const { x: rootX, y: rootY } = hairRoot(index)
  const reach = strandReach(strand.length, index)
  return Array.from({ length: HAIR_POINTS + 1 }, (_, step) => {
    const t = step / HAIR_POINTS
    const sway = strand.curl ? Math.sin(t * Math.PI * 4) * 10 * t : Math.sin(t * Math.PI) * 7
    const slot = (step - 1) * 2
    const shapeX = step > 0 ? (strand.shape?.[slot] ?? 0) + (extra?.[slot] ?? 0) : 0
    const shapeY = step > 0 ? (strand.shape?.[slot + 1] ?? 0) + (extra?.[slot + 1] ?? 0) : 0
    return {
      x: rootX + (side ? (group === 11 ? -16 : 16) : (group - 5) * 4) * t
        + (strand.flow * FLOW_DISTANCE + (strand.bendX ?? 0)) * t * t + sway + shapeX,
      y: rootY + (side ? reach : -reach) * t + (strand.bendY ?? 0) * t * t + shapeY,
    }
  })
}

// A point that could be skipped without moving the drawn line more than this many SVG units.
export const PATH_TOLERANCE = 0.8

function distanceToChord(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  return length === 0
    ? Math.hypot(point.x - from.x, point.y - from.y)
    : Math.abs((point.x - from.x) * dy - (point.y - from.y) * dx) / length
}

// Painting is what slows the studio down when plenty of hair moves at once. Straight hair looks just as smooth
// drawn through every other point, so only the odd points that sit on a visible bend are kept. Curls need all.
export function pathThrough(points: readonly Point[], curly: boolean): string {
  return points
    .filter((point, step) => curly || step % 2 === 0 || step === HAIR_POINTS
      || distanceToChord(point, points[step - 1], points[step + 1]) > PATH_TOLERANCE)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
}

export function strandPath(strand: Strand, index: number, extra?: HairShape): string {
  return pathThrough(strandPoints(strand, index, extra), Boolean(strand.curl))
}

export function hitHair(look: Look, point: Point, offsets?: HairOffsets): number[] {
  return hitHairStroke(look, point, point, offsets)
}

export function closestPointOnStroke(point: Point, from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distanceSquared = dx * dx + dy * dy
  const t = distanceSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / distanceSquared))
  return { x: from.x + dx * t, y: from.y + dy * t }
}

// Pick the swept finger area against the displayed curves, not the resting hair.
export function hitHairStroke(look: Look, from: Point, to: Point, offsets?: HairOffsets, radius = 26): number[] {
  return look.hair.flatMap((strand, index) =>
    strandPoints(strand, index, offsets?.[index]).some((point) => {
      const closest = closestPointOnStroke(point, from, to)
      return Math.hypot(point.x - closest.x, point.y - closest.y) < radius
    }) ? [index] : [],
  )
}
