import { closestPointOnStroke, isSideStrand, strandPoints, touchStrands } from './hair'
import type { Point } from './hair'
import { BALD_REACH, fullReach, HAIR_POINTS, isBald, lengthForReach, MAX_LENGTH, MIN_LENGTH, strandReach, truncateShape } from './hairLayout'
import type { HairLengthEdit, Look, Strand } from './model'

// The fraction along the strand where its height matches the cut. Hair that has been brushed into
// a shape is a chain of short pieces, so each piece is solved on its own.
function shapedCutFraction(strand: Strand, reach: number, direction: number, height: number, nearestT: number): number {
  const shape = strand.shape ?? []
  const bendY = strand.bendY ?? 0
  const roots: number[] = []
  for (let piece = 0; piece < HAIR_POINTS; piece++) {
    const start = piece / HAIR_POINTS
    const end = (piece + 1) / HAIR_POINTS
    const startY = piece === 0 ? 0 : shape[(piece - 1) * 2 + 1] ?? 0
    const endY = shape[piece * 2 + 1] ?? 0
    const slope = (endY - startY) * HAIR_POINTS
    const linear = direction * reach + slope
    const constant = startY - slope * start - height
    const candidates = bendY === 0
      ? (linear === 0 ? [] : [-constant / linear])
      : (() => {
        const discriminant = linear * linear - 4 * bendY * constant
        return discriminant < 0 ? [] : [(-linear + Math.sqrt(discriminant)) / (2 * bendY), (-linear - Math.sqrt(discriminant)) / (2 * bendY)]
      })()
    roots.push(...candidates.filter((t) => t >= start - 1e-9 && t <= end + 1e-9).map((t) => Math.max(start, Math.min(end, t))))
  }
  return roots.length ? roots.reduce((best, t) => Math.abs(t - nearestT) < Math.abs(best - nearestT) ? t : best) : nearestT
}

// How close the scissors have to come to a lock to cut it.
const CUT_REACH = 16

// Where along two straight pieces they come closest: `along` is the share of the way from `a` to `b`.
function closestApproach(a: Point, b: Point, from: Point, to: Point): { distance: number; along: number } {
  const ax = b.x - a.x
  const ay = b.y - a.y
  const sx = to.x - from.x
  const sy = to.y - from.y
  const across = ax * sy - ay * sx
  if (Math.abs(across) > 1e-9) {
    const along = ((from.x - a.x) * sy - (from.y - a.y) * sx) / across
    const stroke = ((from.x - a.x) * ay - (from.y - a.y) * ax) / across
    if (along >= 0 && along <= 1 && stroke >= 0 && stroke <= 1) return { distance: 0, along }
  }
  const lengthSquared = ax * ax + ay * ay
  const onPiece = (point: Point) => lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * ax + (point.y - a.y) * ay) / lengthSquared))
  const candidates = [0, 1, onPiece(from), onPiece(to)].map((along) => {
    const point = { x: a.x + ax * along, y: a.y + ay * along }
    const closest = closestPointOnStroke(point, from, to)
    return { distance: Math.hypot(point.x - closest.x, point.y - closest.y), along }
  })
  return candidates.reduce((best, candidate) => candidate.distance < best.distance ? candidate : best)
}

// Long hair falls in a winding line, so the cut is found on the drawn line itself: the share of the way along the
// strand where the scissors come closest, or null when they miss it.
function fallenCutFraction(points: readonly Point[], from: Point, to: Point): number | null {
  let best: { distance: number; fraction: number } | null = null
  for (let piece = 0; piece < HAIR_POINTS; piece++) {
    const { distance, along } = closestApproach(points[piece], points[piece + 1], from, to)
    if (distance < CUT_REACH && (!best || distance < best.distance)) best = { distance, fraction: (piece + along) / HAIR_POINTS }
  }
  return best && best.fraction
}

export function cutHairStroke(look: Look, from: Point, to: Point): HairLengthEdit[] {
  return look.hair.flatMap((strand, index) => {
    if (isBald(strand.length)) return []
    const points = strandPoints(strand, index)
    const reach = strandReach(strand.length, index)
    const full = fullReach(index)
    if (reach > full) {
      const fraction = fallenCutFraction(points, from, to)
      return fraction === null ? [] : trimmed(strand, index, reach, full, fraction)
    }
    let distance = CUT_REACH
    let contact: Point | null = null
    let nearestT = 0
    for (const [step, point] of points.entries()) {
      const closest = closestPointOnStroke(point, from, to)
      const separation = Math.hypot(point.x - closest.x, point.y - closest.y)
      if (separation < distance) {
        distance = separation
        contact = closest
        nearestT = step / (points.length - 1)
      }
    }
    if (!contact) return []
    const direction = isSideStrand(index) ? 1 : -1
    const height = contact.y - points[0].y
    const bendY = strand.bendY ?? 0
    let fraction = height / (direction * reach)
    if (strand.shape) {
      fraction = shapedCutFraction(strand, reach, direction, height, nearestT)
    } else if (bendY !== 0) {
      // Folded hair can cross the same height twice; keep the contact nearest the finger.
      const discriminant = reach * reach + 4 * bendY * height
      const roots = discriminant < 0 ? [] : [
        (-direction * reach + Math.sqrt(discriminant)) / (2 * bendY),
        (-direction * reach - Math.sqrt(discriminant)) / (2 * bendY),
      ].filter((t) => t >= -1e-9 && t <= 1 + 1e-9).map((t) => Math.max(0, Math.min(1, t)))
      fraction = roots.length ? roots.reduce((best, t) => Math.abs(t - nearestT) < Math.abs(best - nearestT) ? t : best) : nearestT
    }
    return trimmed(strand, index, reach, full, fraction)
  })
}

// Cuts a strand `fraction` of the way along it.
function trimmed(strand: Strand, index: number, reach: number, full: number, fraction: number): HairLengthEdit[] {
  const length = Math.max(MIN_LENGTH, Math.min(strand.length, lengthForReach(reach * fraction, index)))
  if (strand.length - length <= 0.000001) return []
  const keptReach = strandReach(length, index)
  // A cut down at the scalp takes the whole strand, so shaving the head is easy to do.
  if (keptReach < BALD_REACH) return [{ index, length: MIN_LENGTH }]
  const kept = keptReach / reach
  // Standing hair bends over its whole height, so a shorter strand keeps a smaller bend; hair standing at full height
  // keeps all of it.
  const retained = (Math.min(keptReach, full) / Math.min(reach, full)) ** 2
  return [{
    index, length,
    ...(strand.bendX === undefined ? {} : { bendX: strand.bendX * retained }),
    ...(strand.bendY === undefined ? {} : { bendY: strand.bendY * retained }),
    ...(strand.shape ? { shape: truncateShape(strand.shape, kept) ?? null } : {}),
  }]
}

// How fast held hair grows, as a share of its full length every second: under two seconds for a bald scalp to grow back,
// and a few more for it to reach the floor.
export const GROWTH_PER_SECOND = 0.8

export class HairGrowth {
  private last: Point
  private lastTime: number
  private targets: number[]
  private active = true

  constructor(look: Look, point: Point, now: number) {
    this.last = point
    this.lastTime = now
    this.targets = touchStrands(look, point, point)
  }

  private advance(look: Look, targets: number[], now: number): HairLengthEdit[] {
    const seconds = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05))
    this.lastTime = Math.max(this.lastTime, now)
    if (!this.active || seconds === 0) return []
    return targets.flatMap((index) => {
      const before = look.hair[index].length
      const length = Math.min(MAX_LENGTH, before + GROWTH_PER_SECOND * seconds)
      return length > before ? [{ index, length }] : []
    })
  }

  // Growing reaches shaved scalp as well as hair, so a cut-bald head can always grow back.
  move(look: Look, point: Point, now: number): HairLengthEdit[] {
    if (point.x === this.last.x && point.y === this.last.y) return this.hold(look, now)
    const edits = this.advance(look, touchStrands(look, this.last, point), now)
    // Retain only this area's locks for holding, not every lock crossed earlier.
    this.targets = touchStrands(look, point, point)
    this.last = point
    return edits
  }

  hold(look: Look, now: number): HairLengthEdit[] {
    // Keep this selection while tips grow away from a stationary finger.
    return this.advance(look, this.targets, now)
  }

  canGrow(look: Look): boolean {
    return this.active && this.targets.some((index) => look.hair[index].length < MAX_LENGTH)
  }

  stop() {
    this.active = false
    this.targets = []
  }
}
