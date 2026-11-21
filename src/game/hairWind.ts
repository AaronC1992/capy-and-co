import type { Point } from './hair'
import { HAIR_POINTS, HAIR_SHAPE_LENGTH } from './hairLayout'
import type { HairShape } from './hairLayout'

// A stream of air: where it leaves the blower and which way it blows (a unit vector), in studio units.
export interface AirJet {
  nozzle: Point
  direction: Point
}

// One strand's blown pose, as displacements from its saved pose in the same layout as a brushed shape.
export interface WindPose {
  index: number
  offsets: HairShape
}

// A strand's resting segments, measured once so every frame only has to turn them.
export interface WindChain {
  lengths: number[]
  angles: number[]
  directions: Point[]
  // Which way round each segment turns when the air hits it head-on.
  headOn: number[]
  // Keeps neighbouring strands from flapping in step.
  phase: number
  rate: number
}

export interface Flap {
  time: number
  // How hard the air is hitting each point right now; flapping dies away as the air does.
  strength: ArrayLike<number>
}

export const WIND_RANGE = 280
// The nozzle sits this far behind the fingertip, so the fingertip is well inside the stream.
export const WIND_BACK = 50
const CONE_BASE = 32
const CONE_SPREAD = 0.38
// Hair is pinned at the scalp and flies free at the tip: this is how far each point gives to the wind.
const ROOT_GIVE = 0.3
const GIVE_GAIN = 1.1
// Flapping is a wave running out along each strand, bigger toward the tip.
const FLAP_RATE = 22
const FLAP_LAG = 0.12
const FLAP_SWING = 0.55
const HEAD_ON = 0.3
const TAU = Math.PI * 2

const GIVE = Array.from({ length: HAIR_POINTS + 1 }, (_, step) => Math.min(1, ROOT_GIVE + GIVE_GAIN * step / HAIR_POINTS))
const FLAP_ENVELOPE = Array.from({ length: HAIR_POINTS + 1 }, (_, step) => (step / HAIR_POINTS) ** 1.3)

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

// Wraps an angle into (-π, π] so hair turns the short way round to face the wind.
export function wrapAngle(angle: number): number {
  return angle - TAU * Math.round(angle / TAU)
}

// The stream fans out as it travels, so one blower covers a good patch of hair.
export function coneHalfWidth(distance: number): number {
  return CONE_BASE + CONE_SPREAD * Math.max(0, distance)
}

// 0 outside the stream, 1 in its core, fading smoothly toward the edges and the far end.
export function windStrength(jet: AirJet, point: Point): number {
  const dx = point.x - jet.nozzle.x
  const dy = point.y - jet.nozzle.y
  const ahead = dx * jet.direction.x + dy * jet.direction.y
  const reach = smoothstep(-12, 24, ahead) * (1 - smoothstep(WIND_RANGE * 0.55, WIND_RANGE, ahead))
  if (reach === 0) return 0
  const across = Math.abs(dx * jet.direction.y - dy * jet.direction.x)
  return reach * (1 - smoothstep(0.5, 1, across / coneHalfWidth(ahead)))
}

// `points` is the resting strand, root first. `outward` is -1 or 1: the side of the head the root is on.
export function windChain(points: readonly Point[], outward: number, seed: number): WindChain {
  const chain: WindChain = { lengths: [], angles: [], directions: [], headOn: [], phase: seed * 2.39996, rate: 1 + 0.15 * Math.sin(seed * 3.1) }
  for (let step = 1; step < points.length; step++) {
    const dx = points[step].x - points[step - 1].x
    const dy = points[step].y - points[step - 1].y
    const length = Math.hypot(dx, dy)
    chain.lengths.push(length > 1e-6 ? length : 0)
    chain.angles.push(length > 1e-6 ? Math.atan2(dy, dx) : 0)
    chain.directions.push(length > 1e-6 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 })
    // Air blowing straight at a strand folds it away from the middle of the head.
    chain.headOn.push(outward * (dy < 0 ? 1 : -1) * HEAD_ON)
  }
  return chain
}

function flapAngle(chain: WindChain, step: number, strength: number, time: number): number {
  const t = time * chain.rate
  const wave = Math.sin(FLAP_RATE * t - FLAP_LAG * step + chain.phase)
    + 0.45 * Math.sin(FLAP_RATE * 1.9 * t - FLAP_LAG * 1.4 * step + chain.phase * 2.3)
  return FLAP_SWING * FLAP_ENVELOPE[step] * strength * wave
}

// Turns each segment of a strand toward the wind heading, root fixed and every segment keeping its
// length, so the hair streams out like hair instead of stretching. `lean` says how far each point has
// turned (0 = resting, 1 = fully with the wind). Returns the displacement of every point after the root.
export function bendInWind(chain: WindChain, heading: number, lean: ArrayLike<number>, flap?: Flap): number[] {
  const offsets = new Array<number>(HAIR_SHAPE_LENGTH)
  let x = 0
  let y = 0
  for (let step = 1; step <= HAIR_POINTS; step++) {
    const slot = step - 1
    let turn = 0
    if (lean[slot] > 0) {
      const bias = chain.headOn[slot]
      turn = GIVE[step] * lean[slot] * (wrapAngle(heading - chain.angles[slot] - bias) + bias)
    }
    if (flap && flap.strength[slot] > 0) turn += flapAngle(chain, step, flap.strength[slot], flap.time)
    if (turn !== 0 && chain.lengths[slot] > 0) {
      const cos = Math.cos(turn) - 1
      const sin = Math.sin(turn)
      const direction = chain.directions[slot]
      x += chain.lengths[slot] * (direction.x * cos - direction.y * sin)
      y += chain.lengths[slot] * (direction.y * cos + direction.x * sin)
    }
    offsets[slot * 2] = x
    offsets[slot * 2 + 1] = y
  }
  return offsets
}
