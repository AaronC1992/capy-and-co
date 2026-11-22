import { strandPoints } from './hair'
import type { Point } from './hair'
import { HAIR_POINTS, isBald } from './hairLayout'
import type { StrandPose } from './hairLayout'
import { droopChain, droopOffsets } from './hairDroop'
import type { DroopChain } from './hairDroop'
import type { HairAirEdit, Look } from './model'

// A spray bottle held just above and to the left of the fingertip, misting the hair around the fingertip.
export interface SprayJet {
  nozzle: Point
  target: Point
}

// The mist lands in a patch this wide, full strength in the middle and fading toward the edge.
export const SPRAY_RADIUS = 44
const CORE = 0.35
// Where the bottle floats, relative to the fingertip, and how close to the picture's edge it may go.
const NOZZLE_OFFSET: Point = { x: -44, y: -58 }
const BOUNDS = { minX: 28, maxX: 472, minY: 44, maxY: 496 }
// Full-strength mist soaks a point in about half a second, and a point the mist reaches for the first time
// gets a first splash straight away so even a quick swipe leaves hair visibly wet.
const WET_RATE = 1.8
const SPLASH = 0.3
// A strand this wet is rinsed clean: soap, dye and curls wash out.
const RINSE_AT = 0.04
// Wetness is reported (and saved) in steps this big, so a soaking strand is not redrawn on every frame.
const WETNESS_STEP = 0.05
const MAX_STEP = 0.05
// Only mist this strong keeps the sprayer busy while the finger rests; the faint edge of the patch is wetted as the finger moves.
const BUSY_AT = 0.2
// Working out how a strand hangs is the costly part of spraying, so each strand's pose is refreshed this often (in
// milliseconds) at most; the springs that carry the hair there smooth over the gaps.
const POSE_INTERVAL = 50

interface SprayedStrand {
  chain: DroopChain
  // The resting points after the root, for measuring where the mist lands.
  base: Point[]
  // Mist on each point after the root for the current fingertip, the most it has had, and how soaked each point is.
  strength: number[]
  seen: number[]
  water: number[]
  // How far each point has given way to its weight.
  lean: number[]
  // The strand's wetness before the spray reached it, and the wetness last reported.
  damp: number
  reported: number
  rinsed: boolean
  // The hanging pose for the water so far; undefined until the strand has been sprayed.
  pose?: number[]
  // True when the strand has taken on more water than its pose shows, and when that pose was worked out.
  stale: boolean
  posedAt: number
  busy: boolean
  peak: number
}

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

function sprayStrength(center: Point, point: Point): number {
  return 1 - smoothstep(SPRAY_RADIUS * CORE, SPRAY_RADIUS, Math.hypot(point.x - center.x, point.y - center.y))
}

// A water sprayer held on the fingertip. Every point of hair the mist reaches soaks up water, and the wetter a
// point gets the more its weight pulls it toward straight down. The strand is soaked against the hair as it was
// when the gesture began, so the result is steady while the hair swings down.
export class HairSprayer {
  private finger: Point
  private lastTime: number
  private active = true
  private strands: SprayedStrand[]

  constructor(look: Look, point: Point, now: number) {
    this.finger = { x: point.x, y: point.y }
    this.lastTime = now
    this.strands = look.hair.map((strand, index) => {
      const points = strandPoints(strand, index)
      const zeros = () => new Array<number>(HAIR_POINTS).fill(0)
      return {
        // Shaved scalp has no hair to wet; with no points for the mist to reach, the strand stays out of the spray.
        chain: droopChain(points), base: isBald(strand.length) ? [] : points.slice(1),
        strength: zeros(), seen: zeros(), water: zeros(), lean: zeros(),
        damp: strand.wetness ?? 0, reported: strand.wetness ?? 0, rinsed: false, stale: false, posedAt: now, busy: false, peak: 0,
      }
    })
    this.sense()
  }

  // Where the bottle is and what it is aimed at, for drawing the mist.
  jet(): SprayJet {
    return {
      nozzle: {
        x: Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, this.finger.x + NOZZLE_OFFSET.x)),
        y: Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, this.finger.y + NOZZLE_OFFSET.y)),
      },
      target: { x: this.finger.x, y: this.finger.y },
    }
  }

  private sense() {
    for (const strand of this.strands) {
      let peak = 0
      strand.base.forEach((point, slot) => {
        const strength = sprayStrength(this.finger, point)
        strand.strength[slot] = strength
        if (strength > peak) peak = strength
      })
      strand.peak = peak
    }
  }

  private advance(now: number): HairAirEdit[] {
    const seconds = Math.max(0, Math.min((now - this.lastTime) / 1000, MAX_STEP))
    this.lastTime = Math.max(this.lastTime, now)
    if (!this.active) return []
    const edits: HairAirEdit[] = []
    this.strands.forEach((strand, index) => {
      strand.busy = false
      if (strand.peak <= 0) return
      let changed = false
      for (let slot = 0; slot < HAIR_POINTS; slot++) {
        const strength = strand.strength[slot]
        if (strength <= 0) continue
        let water = strand.water[slot]
        if (strength > strand.seen[slot]) {
          water += SPLASH * (strength - strand.seen[slot])
          strand.seen[slot] = strength
        }
        water = Math.min(1, water + WET_RATE * strength * seconds)
        if (water !== strand.water[slot]) {
          strand.water[slot] = water
          changed = true
        }
        if (water < 1 && strength >= BUSY_AT) strand.busy = true
      }
      if (!changed) return
      let wettest = 0
      let carried = 0
      for (let slot = 0; slot < HAIR_POINTS; slot++) {
        const water = strand.water[slot]
        if (water > wettest) wettest = water
        // Soaked hair drags everything below it down too, and the first drops weigh the most.
        carried = Math.max(carried, water * (2 - water))
        strand.lean[slot] = carried
      }
      strand.stale = true
      const wetness = Math.max(strand.damp, wettest)
      const edit: HairAirEdit = { index }
      if (wetness >= strand.reported + WETNESS_STEP || (wetness >= 1 && strand.reported < 1)) {
        edit.wetness = wetness
        strand.reported = wetness
      }
      if (!strand.rinsed && wettest >= RINSE_AT) {
        edit.rinse = true
        strand.rinsed = true
      }
      if (edit.wetness !== undefined || edit.rinse) edits.push(edit)
    })
    return edits
  }

  // Moves the fingertip and the mist with it. The point is copied because pointer points are SVGPoints, not plain objects.
  move(point: Point, now: number): HairAirEdit[] {
    this.finger = { x: point.x, y: point.y }
    this.sense()
    return this.advance(now)
  }

  // Keeps misting the same patch while the finger rests.
  hold(now: number): HairAirEdit[] {
    return this.advance(now)
  }

  // The hanging pose every strand the mist has reached is soaked toward right now. `settle` brings every pose fully
  // up to date, for when the spray ends.
  poses(settle = false): StrandPose[] {
    if (!this.active) return []
    const poses: StrandPose[] = []
    this.strands.forEach((strand, index) => {
      if (strand.stale && (settle || !strand.pose || this.lastTime - strand.posedAt >= POSE_INTERVAL)) {
        strand.pose = droopOffsets(strand.chain, strand.lean)
        strand.posedAt = this.lastTime
        strand.stale = false
      }
      if (strand.pose) poses.push({ index, offsets: strand.pose })
    })
    return poses
  }

  // True while some hair in the mist can still soak up more water or hang lower than its pose shows.
  isSpraying(): boolean {
    return this.active && this.strands.some((strand) => strand.busy || strand.stale)
  }

  stop() {
    this.active = false
  }
}
