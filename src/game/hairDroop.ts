import type { Point } from './hair'
import { HAIR_CENTER_X, HAIR_POINTS, HAIR_SHAPE_LENGTH } from './hairLayout'
import { wrapAngle } from './hairWind'
import { headClearance } from './headShape'

// Wet hair is heavy: it gives way to gravity along its whole length, flops over the head and hangs straight down.
const DOWN = Math.PI / 2
// Hair pointing straight up has no short way round, so it falls away from the middle of the head.
const OUTWARD_BIAS = 0.5
// Even at the scalp wet hair gives most of the way, and from a few segments out it gives completely.
const ROOT_GIVE = 0.7
const GIVE_RUN = 8
// Hair lies on the head instead of sinking into the face: it stays this far outside the outline...
const CLEARANCE = 2.5
// ...and a strand rooted inside the outline climbs out of it at this slope, so it flops flat over the dome.
const CLIMB = 0.4
const SCAN = 0.2
const SCAN_STEPS = 16
const BISECT = 5

const GIVE = Array.from({ length: HAIR_POINTS + 1 }, (_, step) => Math.min(1, ROOT_GIVE + (1 - ROOT_GIVE) * step / GIVE_RUN))
const FULL_LEAN: readonly number[] = Array.from({ length: HAIR_POINTS }, () => 1)

// A strand's resting segments, measured once so every frame only has to turn them.
export interface DroopChain {
  // Every resting point, root first.
  rest: Point[]
  lengths: number[]
  angles: number[]
  // How far outside the head each resting point is (negative inside it).
  clearance: number[]
  // -1 or 1: the side of the head the root is on, and the way hair falls off the top.
  outward: number
}

// `points` is the resting strand, root first.
export function droopChain(points: readonly Point[]): DroopChain {
  const chain: DroopChain = {
    rest: points.map((point) => ({ x: point.x, y: point.y })),
    lengths: [],
    angles: [],
    clearance: points.map((point) => headClearance(point.x, point.y)),
    outward: points[0].x >= HAIR_CENTER_X ? 1 : -1,
  }
  for (let step = 1; step < points.length; step++) {
    const dx = points[step].x - points[step - 1].x
    const dy = points[step].y - points[step - 1].y
    const length = Math.hypot(dx, dy)
    chain.lengths.push(length > 1e-6 ? length : 0)
    chain.angles.push(length > 1e-6 ? Math.atan2(dy, dx) : 0)
  }
  return chain
}

// Turns a segment away from the head, the way the hair is falling, until its end is clear enough.
function clearOfHead(x: number, y: number, length: number, heading: number, outward: number, need: number): number {
  const clearance = (angle: number) => headClearance(x + length * Math.cos(angle), y + length * Math.sin(angle))
  let best = clearance(heading)
  if (best >= need) return heading
  let bestTurn = 0
  let blocked = 0
  for (let step = 1; step <= SCAN_STEPS; step++) {
    const turn = step * SCAN
    const value = clearance(heading - outward * turn)
    if (value >= need) {
      let low = blocked
      let high = turn
      for (let i = 0; i < BISECT; i++) {
        const middle = (low + high) / 2
        if (clearance(heading - outward * middle) >= need) high = middle
        else low = middle
      }
      return heading - outward * high
    }
    if (value > best) {
      best = value
      bestTurn = turn
    }
    blocked = turn
  }
  return heading - outward * bestTurn
}

// Lets each segment of a strand fall toward straight down, root fixed and every segment keeping its length, so wet
// hair hangs like hair instead of stretching. `lean` says how far each point has given way (0 = resting,
// 1 = hanging). Returns the displacement of every point after the root.
export function droopOffsets(chain: DroopChain, lean: ArrayLike<number>): number[] {
  const offsets = new Array<number>(HAIR_SHAPE_LENGTH)
  let x = 0
  let y = 0
  for (let step = 1; step <= HAIR_POINTS; step++) {
    const slot = step - 1
    const length = chain.lengths[slot]
    if (lean[slot] > 0 && length > 0) {
      const rest = chain.angles[slot]
      const bias = chain.outward * OUTWARD_BIAS
      let heading = rest + GIVE[step] * lean[slot] * (wrapAngle(DOWN - rest - bias) + bias)
      const startX = chain.rest[step - 1].x + x
      const startY = chain.rest[step - 1].y + y
      const need = Math.min(chain.clearance[step], CLEARANCE, headClearance(startX, startY) + CLIMB * length)
      heading = clearOfHead(startX, startY, length, heading, chain.outward, need)
      x += length * (Math.cos(heading) - Math.cos(rest))
      y += length * (Math.sin(heading) - Math.sin(rest))
    }
    offsets[slot * 2] = x
    offsets[slot * 2 + 1] = y
  }
  return offsets
}

// The pose of a strand that is soaked from root to tip, for wetting all the hair at once.
export function soakedOffsets(points: readonly Point[]): number[] {
  return droopOffsets(droopChain(points), FULL_LEAN)
}
