import { strandPoints } from './hair'
import type { Point } from './hair'
import { HAIR_CENTER_X, HAIR_POINTS } from './hairLayout'
import type { HairAirEdit, Look } from './model'
import { bendInWind, windChain, windStrength, WIND_BACK, wrapAngle } from './hairWind'
import type { AirJet, WindChain, WindPose } from './hairWind'

// Strength below this counts as "out of the air", so a strand is never half-blown by a hair's breadth.
const ENGAGE = 0.02
// How fast the bend builds when air arrives and fades when it leaves (per second).
const RISE = 16
const FALL = 5
// How fast a strand swings round to a new wind direction while it is in the air (per second).
const TURN = 9
// Air leaves hair swept this much of the way toward where it was blown.
const REST = 0.85
// Full-strength air dries a strand in a little over a second.
const DRY = 0.9
// The wind eases toward the finger's direction of travel, catching up over about this much movement.
const AIM_RESPONSE = 30
// Until the finger has travelled this far the direction is still guesswork, so a touch-down wobble can't aim the wind.
const FIRST_SWIPE = 5
const MAX_STEP = 0.05
const FADED = 0.01

interface WindStrand {
  chain: WindChain
  base: Point[]
  // Air at each point after the root for the current jet, before gusts.
  strength: number[]
  // How hard the air is bending each point now, how much of that stays, and the pose that results.
  amount: number[]
  memory: number[]
  lean: number[]
  heading: number
  peak: number
  engaged: boolean
  busy: boolean
}

function gust(time: number): number {
  return 1 + 0.12 * Math.sin(time * 2.3) + 0.08 * Math.sin(time * 5.1 + 1.3)
}

// A hair dryer held on the fingertip. The air blows the way the finger travels and reaches every
// strand in a fan ahead of it, bending each one toward the wind and flapping it while the air lasts.
// The air is measured against the hair as it was when the gesture began, so the result is steady.
export class HairBlower {
  private finger: Point
  private aim: Point = { x: 1, y: 0 }
  private aimAngle = 0
  // Where the finger has moved since touching down, until that is enough to say which way to blow.
  private swipe: Point = { x: 0, y: 0 }
  private steered = false
  private lastTime: number
  private time = 0
  private active = true
  private flutter: boolean
  private strands: WindStrand[]
  private posed: WindPose[] = []

  constructor(look: Look, point: Point, now: number, reducedMotion = false) {
    this.flutter = !reducedMotion
    this.finger = point
    this.lastTime = now
    // Hair fans outward from the middle of the head, so start by blowing that way.
    this.steer(point.x < HAIR_CENTER_X ? Math.PI : 0)
    this.strands = look.hair.map((strand, index) => {
      const points = strandPoints(strand, index)
      const zeros = () => new Array<number>(HAIR_POINTS).fill(0)
      return {
        chain: windChain(points, points[0].x >= HAIR_CENTER_X ? 1 : -1, index),
        base: points.slice(1),
        strength: zeros(), amount: zeros(), memory: zeros(), lean: zeros(),
        heading: 0, peak: 0, engaged: false, busy: false,
      }
    })
    this.sense()
  }

  private steer(angle: number) {
    this.aimAngle = angle
    this.aim = { x: Math.cos(angle), y: Math.sin(angle) }
  }

  // Where the air comes from and where it goes, for drawing the stream.
  jet(): AirJet {
    return {
      nozzle: { x: this.finger.x - this.aim.x * WIND_BACK, y: this.finger.y - this.aim.y * WIND_BACK },
      direction: { ...this.aim },
    }
  }

  private sense() {
    const jet = this.jet()
    for (const strand of this.strands) {
      let peak = 0
      strand.base.forEach((point, slot) => {
        const strength = windStrength(jet, point)
        strand.strength[slot] = strength
        if (strength > peak) peak = strength
      })
      strand.peak = peak
    }
  }

  private advance(look: Look, now: number): HairAirEdit[] {
    const seconds = Math.max(0, Math.min((now - this.lastTime) / 1000, MAX_STEP))
    this.lastTime = Math.max(this.lastTime, now)
    if (!this.active || seconds === 0) return []
    this.time += seconds
    const gusty = this.flutter ? gust(this.time) : 1
    const rise = 1 - Math.exp(-RISE * seconds)
    const fall = 1 - Math.exp(-FALL * seconds)
    const turn = 1 - Math.exp(-TURN * seconds)
    const aim = this.aimAngle
    const edits: HairAirEdit[] = []
    const posed: WindPose[] = []
    this.strands.forEach((strand, index) => {
      const inAir = strand.peak > ENGAGE
      if (inAir) {
        // A strand the air has not touched yet faces the wind straight away; one it has swept swings round.
        strand.heading = strand.engaged ? strand.heading + wrapAngle(aim - strand.heading) * turn : aim
        strand.engaged = true
      }
      if (!strand.engaged) return
      let busy = inAir
      for (let slot = 0; slot < HAIR_POINTS; slot++) {
        const target = inAir ? Math.min(1, strand.strength[slot] * gusty) : 0
        const current = strand.amount[slot]
        const next = current + (target - current) * (target > current ? rise : fall)
        strand.amount[slot] = next
        strand.memory[slot] = Math.max(strand.memory[slot], REST * next)
        strand.lean[slot] = Math.min(1, Math.max(strand.memory[slot], next))
        if (next > FADED) busy = true
      }
      strand.busy = busy
      posed.push({
        index,
        offsets: bendInWind(strand.chain, strand.heading, strand.lean, this.flutter ? { time: this.time, strength: strand.amount } : undefined),
      })
      const wetness = look.hair[index]?.wetness ?? 0
      if (wetness > 0 && inAir) edits.push({ index, wetness: Math.max(0, wetness - seconds * DRY * strand.peak) })
    })
    this.posed = posed
    return edits
  }

  // Moves the finger and the air with it, turning the wind toward the direction of travel.
  move(look: Look, point: Point, now: number): HairAirEdit[] {
    const dx = point.x - this.finger.x
    const dy = point.y - this.finger.y
    if (!this.steered) {
      this.swipe = { x: this.swipe.x + dx, y: this.swipe.y + dy }
      if (Math.hypot(this.swipe.x, this.swipe.y) >= FIRST_SWIPE) {
        this.steer(Math.atan2(this.swipe.y, this.swipe.x))
        this.steered = true
      }
    } else {
      const distance = Math.hypot(dx, dy)
      if (distance > 0.5) {
        const travel = Math.atan2(dy, dx)
        this.steer(this.aimAngle + wrapAngle(travel - this.aimAngle) * Math.min(1, distance / AIM_RESPONSE))
      }
    }
    this.finger = point
    this.sense()
    return this.advance(look, now)
  }

  hold(look: Look, now: number): HairAirEdit[] {
    return this.advance(look, now)
  }

  // The flapping pose every strand the air has reached is blowing toward right now.
  poses(): WindPose[] {
    return this.active ? this.posed : []
  }

  // The swept pose the hair keeps once the air stops: the same bend, without the flapping.
  settled(): WindPose[] {
    return this.strands.flatMap((strand, index) => (strand.engaged
      ? [{ index, offsets: bendInWind(strand.chain, strand.heading, strand.memory) }]
      : []))
  }

  isBlowing(): boolean {
    return this.active && this.strands.some((strand) => strand.peak > ENGAGE || strand.busy)
  }

  stop() {
    this.active = false
    this.posed = []
  }
}
