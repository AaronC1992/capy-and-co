import type { Look, Strand } from './model'
import { HAIR_GROUP_COUNT, HAIR_POINTS, isBald, isSideStrand, smoothstep, strandReach } from './hairLayout'
import type { HairShape } from './hairLayout'
import { hairRoot } from './hairline'

export { isSideStrand, lengthScale, MIN_REACH } from './hairLayout'

export interface Point { x: number; y: number }
// Temporary brush motion per strand; undefined means the strand is at rest.
export type HairOffsets = readonly (HairShape | undefined)[]
export const FLOW_DISTANCE = 25

// `extra` is transient motion layered over the saved style while the hair is being brushed. This is the strand's own
// line; curls are drawn around it (see `curlyPoints`), so they never change where a tool finds the hair.
export function strandPoints(strand: Strand, index: number, extra?: HairShape): Point[] {
  const group = index % HAIR_GROUP_COUNT
  const side = isSideStrand(index)
  const { x: rootX, y: rootY } = hairRoot(index)
  const reach = strandReach(strand.length, index)
  return Array.from({ length: HAIR_POINTS + 1 }, (_, step) => {
    const t = step / HAIR_POINTS
    const sway = Math.sin(t * Math.PI) * 7
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
// drawn through every other point, so only the odd points that sit on a visible bend are kept.
export function pathThrough(points: readonly Point[]): string {
  return linePath(points.filter((point, step) => step % 2 === 0 || step === HAIR_POINTS
    || distanceToChord(point, points[step - 1], points[step + 1]) > PATH_TOLERANCE))
}

export function linePath(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

// Curls need several drawn points for every point of the strand's own line to stay round.
export const CURL_DENSITY = 3
// Turning the wave into loops starts around half curl; golden-angle phases keep neighbouring strands out of step.
const CURL_PHASE_STEP = 2.399963

// Curls are drawn around the strand's own line: a gentle wave at first, then loops, then tight ringlets as `curl`
// grows from 0 to 1. The line itself never moves, so every tool still finds and styles the strand as one piece.
// Point `step * CURL_DENSITY` of the result is where the strand's own point `step` is drawn.
export function curlyPoints(points: readonly Point[], curl: number, seed: number): Point[] {
  if (points.length < 2) return [...points]
  const amount = Math.max(0, Math.min(1, curl))
  const line: Point[] = []
  for (let step = 0; step < points.length - 1; step += 1) {
    const from = points[step]
    const to = points[step + 1]
    for (let part = 0; part < CURL_DENSITY; part += 1) {
      const share = part / CURL_DENSITY
      line.push({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share })
    }
  }
  line.push(points[points.length - 1])
  const travelled: number[] = [0]
  for (let i = 1; i < line.length; i += 1) travelled.push(travelled[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y))
  const total = travelled[travelled.length - 1]
  const pitch = 64 - 43 * amount
  const radius = 3 + 7.5 * amount
  // The roots stay put on the scalp; the curls build over the first stretch of hair.
  const ramp = Math.max(8, Math.min(30, total * 0.3))
  const phase = (seed * CURL_PHASE_STEP) % (Math.PI * 2)
  let tangentX = 0
  let tangentY = 1
  return line.map((point, i) => {
    const before = line[Math.max(0, i - 1)]
    const after = line[Math.min(line.length - 1, i + 1)]
    const span = Math.hypot(after.x - before.x, after.y - before.y)
    if (span > 1e-6) {
      tangentX = (after.x - before.x) / span
      tangentY = (after.y - before.y) / span
    }
    const angle = (travelled[i] / pitch) * Math.PI * 2 + phase
    const size = radius * smoothstep(0, ramp, travelled[i])
    const forward = Math.sin(angle) * size
    const sideways = Math.cos(angle) * size
    return {
      x: point.x + tangentX * forward - tangentY * sideways,
      y: point.y + tangentY * forward + tangentX * sideways,
    }
  })
}

// How a strand is painted: the points it is drawn through and the path along them. Curls are drawn through more points
// than the strand has, so point `step * stride` of `line` is where the strand's own point `step` is painted.
export interface DrawnStrand { line: readonly Point[]; stride: number; path: string }

export function drawStrand(strand: Strand, index: number, points: readonly Point[]): DrawnStrand {
  if (strand.curl > 0) {
    const line = curlyPoints(points, strand.curl, index)
    return { line, stride: CURL_DENSITY, path: linePath(line) }
  }
  return { line: points, stride: 1, path: pathThrough(points) }
}

export function strandPath(strand: Strand, index: number, extra?: HairShape): string {
  return drawStrand(strand, index, strandPoints(strand, index, extra)).path
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

// Pick the swept finger area against the displayed curves, not the resting hair. Shaved scalp has no hair to pick.
export function hitHairStroke(look: Look, from: Point, to: Point, offsets?: HairOffsets, radius = 26): number[] {
  return touchStrands(look, from, to, offsets, radius).filter((index) => !isBald(look.hair[index].length))
}

// Every strand the swept finger reaches, shaved ones included, because growing is what brings them back.
export function touchStrands(look: Look, from: Point, to: Point, offsets?: HairOffsets, radius = 26): number[] {
  return look.hair.flatMap((strand, index) =>
    strandPoints(strand, index, offsets?.[index]).some((point) => {
      const closest = closestPointOnStroke(point, from, to)
      return Math.hypot(point.x - closest.x, point.y - closest.y) < radius
    }) ? [index] : [],
  )
}
