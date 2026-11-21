import { closestPointOnStroke } from './hair'
import type { Point } from './hair'
import { HAIR_CENTER_X } from './hairLayout'

// Roughly a fingertip in the 500-unit-wide hair studio.
export const BRUSH_RADIUS = 18
// Hair inside this inner fraction follows the finger completely; it fades out beyond it.
const CORE = 0.35
// A touch very close to the scalp still bends the strand over at least this many points.
const ANCHOR_POINTS = 4
// Hair beyond the touch keeps leaning the way it was swept.
const TAIL_LEAN = 0.6
// Hair can bunch up a little when pushed along its length, but never folds away entirely.
const SQUASH = 0.5
// Share of a push along the strand toward the scalp that makes the hair buckle sideways instead.
const BUCKLE = 0.75
// After this much travel the finger slides past a strand instead of dragging it further.
export const BRUSH_MAX_CARRY = 100

export interface BrushContact {
  weight: number
  point: number
}

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export function brushSlip(carried: Point, delta: Point): number {
  const distance = Math.hypot(carried.x, carried.y)
  const pushingFurther = delta.x * carried.x + delta.y * carried.y > 0
  return pushingFurther ? 1 - smoothstep(BRUSH_MAX_CARRY * 0.6, BRUSH_MAX_CARRY, distance) : 1
}

// Where the swept fingertip touches the strand, if at all.
export function brushContact(points: readonly Point[], from: Point, to: Point): BrushContact | null {
  let nearest = Infinity
  let point = 0
  for (let step = 1; step < points.length; step++) {
    const closest = closestPointOnStroke(points[step], from, to)
    const distance = Math.hypot(points[step].x - closest.x, points[step].y - closest.y)
    if (distance < nearest) {
      nearest = distance
      point = step
    }
  }
  const weight = 1 - smoothstep(CORE, 1, nearest / BRUSH_RADIUS)
  return weight > 0 ? { weight, point } : null
}

function spanBetween(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

// How much of the finger's push each point of the strand follows: a gentle arc up to the touch,
// then a lean that keeps swinging the hair beyond the finger the same way.
function follow(step: number, anchor: number, last: number): number {
  if (step <= anchor) return (step / anchor) ** 2
  const t = (step - anchor) / (last - anchor)
  return 1 + TAIL_LEAN * (1 - (1 - t) ** 2)
}

// Pushing hair straight toward the scalp can't just squash it, so part of that push bends the strand
// sideways instead, away from the middle of the head unless the finger already points a side.
function buckle(points: readonly Point[], contactPoint: number, delta: Point): Point {
  const from = points[Math.max(0, contactPoint - 2)]
  const to = points[Math.min(points.length - 1, contactPoint + 2)]
  const span = spanBetween(from, to)
  if (span === 0) return delta
  const tx = (to.x - from.x) / span
  const ty = (to.y - from.y) / span
  const along = delta.x * tx + delta.y * ty
  if (along >= 0) return delta
  const nx = -ty
  const ny = tx
  const across = delta.x * nx + delta.y * ny
  const outward = points[0].x >= HAIR_CENTER_X ? 1 : -1
  const side = Math.abs(across) > -along * 0.5 ? Math.sign(across) : Math.abs(nx) > 0.25 ? Math.sign(nx * outward) : 1
  const sideways = across - side * along * BUCKLE
  const kept = along * (1 - BUCKLE)
  return { x: nx * sideways + tx * kept, y: ny * sideways + ty * kept }
}

// Bends one strand around the touched point. The root stays fixed and the segments keep
// their length, so the hair swings and curves like hair instead of stretching.
export function bendStrand(points: readonly Point[], contact: BrushContact, delta: Point, natural: readonly Point[]): Point[] {
  const last = points.length - 1
  const anchor = Math.max(contact.point, ANCHOR_POINTS)
  const push = buckle(points, contact.point, delta)
  const pushed = points.map((point, step) => {
    if (step === 0) return point
    const amount = contact.weight * follow(step, anchor, last)
    return { x: point.x + push.x * amount, y: point.y + push.y * amount }
  })
  const bent: Point[] = [points[0]]
  for (let step = 1; step <= last; step++) {
    const current = spanBetween(points[step - 1], points[step])
    const rest = spanBetween(natural[step - 1], natural[step])
    const dx = pushed[step].x - pushed[step - 1].x
    const dy = pushed[step].y - pushed[step - 1].y
    const span = Math.hypot(dx, dy)
    const length = Math.max(Math.min(current, rest * SQUASH), Math.min(Math.max(current, rest), span))
    const previous = bent[step - 1]
    bent.push(span === 0
      ? { x: previous.x + points[step].x - points[step - 1].x, y: previous.y + points[step].y - points[step - 1].y }
      : { x: previous.x + dx / span * length, y: previous.y + dy / span * length })
  }
  return bent
}
