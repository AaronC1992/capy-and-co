import { closestPointOnStroke, strandPoints } from './hair'
import type { HairOffsets, Point } from './hair'
import { HAIR_POINTS, HAIR_SHAPE_LENGTH, HAIR_SHAPE_LIMIT } from './hairLayout'
import type { HairShape, StrandPose } from './hairLayout'
import { wrapAngle } from './hairWind'
import type { Look, Strand } from './model'

// The comb picks up the strands right under it, a little more finely than a fingertip brush.
export const COMB_RADIUS = 11
// A tap or a wobble moves nothing: hair is only laid along the line once the finger has really travelled.
export const COMB_MIN_PATH = 6
// Finger samples closer together than this are jitter, not a line.
const TRACE_GAP = 0.8
// Which way the line is heading is read from a short stretch of it, so a shaky finger still draws a smooth line.
const LINE_WINDOW = 12
// Gelled hair keeps its old direction only briefly after the comb takes hold, then follows the line.
const GEL_TURN = 7

// The line the finger has drawn, with the distance travelled at every corner.
class Trace {
  private readonly points: Point[]
  private readonly distances = [0]

  constructor(start: Point) {
    this.points = [start]
  }

  get length(): number {
    return this.distances[this.distances.length - 1]
  }

  add(point: Point): boolean {
    const last = this.points[this.points.length - 1]
    const gap = Math.hypot(point.x - last.x, point.y - last.y)
    if (gap < TRACE_GAP) return false
    this.points.push(point)
    this.distances.push(this.length + gap)
    return true
  }

  at(distance: number): Point {
    const target = Math.max(0, Math.min(this.length, distance))
    let low = 0
    let high = this.distances.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (this.distances[middle] <= target) low = middle
      else high = middle
    }
    const span = this.distances[high] - this.distances[low]
    if (span <= 0) return this.points[low]
    const t = (target - this.distances[low]) / span
    const from = this.points[low]
    const to = this.points[high]
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  }

  // The way the line heads around `distance`, using only the part of it after `from`. Past the end of the
  // line this is the heading it finished on, so hair beyond the finger carries straight on.
  heading(distance: number, from: number): number | undefined {
    const span = Math.min(LINE_WINDOW, this.length - from)
    if (span <= 0) return undefined
    const begin = Math.max(from, Math.min(this.length - span, distance - span / 2))
    const start = this.at(begin)
    const end = this.at(begin + span)
    const dx = end.x - start.x
    const dy = end.y - start.y
    return Math.hypot(dx, dy) > 1e-6 ? Math.atan2(dy, dx) : undefined
  }
}

// Everything needed to lay one strand along the line from where the comb took hold of it.
interface Grip {
  // Hair up to this drawn point stays exactly where it was.
  anchor: number
  root: Point
  // The way the hair was heading as it reached the anchor.
  entry: number
  // Natural length of every segment beyond the anchor, and how fast each one turns toward the line.
  lengths: number[]
  turns: number[]
  rest: Point[]
  frozen: number[]
  // How far along the finger's line the strand was picked up.
  start: number
  pose?: number[]
}

function takeHold(saved: Strand, index: number, shown: HairShape | undefined, from: Point, to: Point, travelled: number): Grip | undefined {
  // Combing smooths curls out, so hold the straightened hair that will be saved.
  const style = saved.curl ? { ...saved, curl: false } : saved
  const points = strandPoints(style, index, shown)
  let nearest = Infinity
  let touched = 0
  let along = 0
  for (let step = 1; step < points.length; step++) {
    const closest = closestPointOnStroke(points[step], from, to)
    const distance = Math.hypot(points[step].x - closest.x, points[step].y - closest.y)
    if (distance < nearest) {
      nearest = distance
      touched = step
      along = Math.hypot(closest.x - from.x, closest.y - from.y)
    }
  }
  if (nearest > COMB_RADIUS) return undefined
  // Always leave at least one segment to lay down, even when the tip is what was touched.
  const anchor = Math.min(touched, HAIR_POINTS - 1)
  const natural = strandPoints({ ...style, shape: undefined }, index)
  const lengths: number[] = []
  for (let step = anchor + 1; step <= HAIR_POINTS; step++) {
    lengths.push(Math.hypot(natural[step].x - natural[step - 1].x, natural[step].y - natural[step - 1].y))
  }
  const before = points[Math.max(0, anchor - 3)]
  return {
    anchor,
    root: points[anchor],
    entry: Math.atan2(points[anchor].y - before.y, points[anchor].x - before.x),
    lengths,
    turns: lengths.map((length) => 1 - Math.exp(-length / GEL_TURN)),
    rest: strandPoints(style, index),
    frozen: Array.from({ length: anchor * 2 }, (_, slot) => shown?.[slot] ?? 0),
    start: travelled + along,
  }
}

const limit = (value: number) => Math.max(-HAIR_SHAPE_LIMIT, Math.min(HAIR_SHAPE_LIMIT, value))

// Lays the strand along the finger's line from the point it was picked up at. Every segment keeps its
// length and turns toward the way the line is heading there, so parallel strands comb in parallel.
function lay(grip: Grip, trace: Trace): number[] | undefined {
  const reach = trace.length - grip.start
  if (reach < COMB_MIN_PATH) return undefined
  const offsets = new Array<number>(HAIR_SHAPE_LENGTH).fill(0)
  grip.frozen.forEach((value, slot) => { offsets[slot] = value })
  let x = grip.root.x
  let y = grip.root.y
  let angle = grip.entry
  let along = 0
  grip.lengths.forEach((length, step) => {
    const line = trace.heading(grip.start + Math.min(reach, along + length / 2), grip.start)
    if (line !== undefined) angle += wrapAngle(line - angle) * grip.turns[step]
    x += length * Math.cos(angle)
    y += length * Math.sin(angle)
    along += length
    const point = grip.anchor + 1 + step
    const slot = (point - 1) * 2
    offsets[slot] = limit(x - grip.rest[point].x)
    offsets[slot + 1] = limit(y - grip.rest[point].y)
  })
  return offsets
}

// A gel comb. Hair the comb touches is held, and everything from the touch toward the tip is laid along
// the line the finger traces; the hair before the touch stays put. Hair stays held until the finger lifts.
export class HairComb {
  private finger: Point
  private readonly trace: Trace
  private readonly grips = new Map<number, Grip>()

  constructor(point: Point) {
    this.finger = point
    this.trace = new Trace(point)
  }

  // Moves the comb to `point`. `shown` is the hair as the studio is drawing it right now. Returns the
  // strands the comb has just taken hold of.
  move(look: Look, point: Point, shown: HairOffsets): number[] {
    const taken: number[] = []
    const travelled = this.trace.length
    look.hair.forEach((strand, index) => {
      if (this.grips.has(index)) return
      const grip = takeHold(strand, index, shown[index], this.finger, point, travelled)
      if (!grip) return
      this.grips.set(index, grip)
      taken.push(index)
    })
    this.finger = point
    if (!this.trace.add(point) && !taken.length) return taken
    for (const grip of this.grips.values()) {
      grip.start = Math.min(grip.start, this.trace.length)
      grip.pose = lay(grip, this.trace)
    }
    return taken
  }

  // The combed pose of every strand the finger has dragged far enough to lay down.
  poses(): StrandPose[] {
    return [...this.grips].flatMap(([index, { pose }]) => (pose ? [{ index, offsets: pose }] : []))
  }
}
