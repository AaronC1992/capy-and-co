import { closestPointOnStroke, isSideStrand, lengthScale, strandPoints, touchStrands } from './hair'
import type { Point } from './hair'
import { BALD_REACH, HAIR_POINTS, isBald, MIN_LENGTH, MIN_REACH, strandReach, truncateShape } from './hairLayout'
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

export function cutHairStroke(look: Look, from: Point, to: Point): HairLengthEdit[] {
  return look.hair.flatMap((strand, index) => {
    if (isBald(strand.length)) return []
    const points = strandPoints(strand, index)
    let distance = 16
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
    const reach = strandReach(strand.length, index)
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
    const length = Math.max(MIN_LENGTH, Math.min(strand.length, (reach * fraction - MIN_REACH) / lengthScale(index)))
    if (strand.length - length <= 0.000001) return []
    const keptReach = strandReach(length, index)
    // A cut down at the scalp takes the whole strand, so shaving the head is easy to do.
    if (keptReach < BALD_REACH) return [{ index, length: MIN_LENGTH }]
    const kept = keptReach / reach
    const retained = kept ** 2
    return [{
      index, length,
      ...(strand.bendX === undefined ? {} : { bendX: strand.bendX * retained }),
      ...(strand.bendY === undefined ? {} : { bendY: strand.bendY * retained }),
      ...(strand.shape ? { shape: truncateShape(strand.shape, kept) ?? null } : {}),
    }]
  })
}

// How fast held hair grows, as a share of its full length every second: a few seconds for a bald scalp to grow back.
export const GROWTH_PER_SECOND = 0.5

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
      const length = Math.min(1, before + GROWTH_PER_SECOND * seconds)
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
    return this.active && this.targets.some((index) => look.hair[index].length < 1)
  }

  stop() {
    this.active = false
    this.targets = []
  }
}
