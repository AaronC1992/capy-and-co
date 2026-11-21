import { strandPoints } from './hair'
import type { HairOffsets, Point } from './hair'
import { bendStrand, brushContact, brushSlip } from './hairBrush'
import { HAIR_POINTS, HAIR_SHAPE_LENGTH, roundShape, STRAND_COUNT } from './hairLayout'
import type { HairShape, StrandPose } from './hairLayout'
import type { Look } from './model'

// Hair is stiffest at the scalp and floppy toward the tip, so the tip trails the finger and swings
// after it. Each strand is a little different, so a swipe fans out instead of moving as one plank.
interface SpringSetting { stiffness: number; tipSoftness: number; rootDamping: number; tipDamping: number }
const FINGER_SPRING: SpringSetting = { stiffness: 240, tipSoftness: 0.7, rootDamping: 0.75, tipDamping: 0.5 }
const FREE_SPRING: SpringSetting = { stiffness: 160, tipSoftness: 0.7, rootDamping: 0.6, tipDamping: 0.4 }
// Hair in a strong wind snaps to the air quickly and whips at the tip, so it can flap.
const WIND_SPRING: SpringSetting = { stiffness: 620, tipSoftness: 0.4, rootDamping: 0.9, tipDamping: 0.35 }
// Gelled hair does what the comb tells it: it settles onto the combed line fast and never wobbles.
const GEL_SPRING: SpringSetting = { stiffness: 2600, tipSoftness: 0.2, rootDamping: 1, tipDamping: 1 }
// Wet hair is heavy: it sags slowly toward the ground and stops there without bouncing.
const WATER_SPRING: SpringSetting = { stiffness: 130, tipSoftness: 0.45, rootDamping: 1, tipDamping: 1 }
const SETTLE_DISTANCE = 0.05
const SETTLE_SPEED = 0.1
const NO_OFFSETS: HairOffsets = []

interface SpringTable { stiffness: number[]; damping: number[] }

function springTable(setting: SpringSetting, variation: number): SpringTable {
  const toTip = (slot: number) => ((slot >> 1) + 1) / HAIR_POINTS
  const stiffness = Array.from({ length: HAIR_SHAPE_LENGTH }, (_, slot) => setting.stiffness * variation * (1 - setting.tipSoftness * toTip(slot)))
  const damping = stiffness.map((value, slot) => 2 * (setting.rootDamping + (setting.tipDamping - setting.rootDamping) * toTip(slot)) * Math.sqrt(value))
  return { stiffness, damping }
}

function strandVariation(index: number): number {
  return 0.85 + 0.3 * ((index * 37) % 11) / 10
}

// What is holding a strand: a fingertip pushing it, the wind blowing it, the comb laying it down or water weighing it down.
type Drive = 'finger' | 'wind' | 'gel' | 'water'

// Motion of one strand as a displacement for each drawn point, on top of its saved style.
interface MovingStrand {
  position: number[]
  target: number[]
  velocity: number[]
  // Pose at the moment the finger first grabbed the strand; used to limit how far it is carried.
  origin: number[]
  held: boolean
  drive: Drive
  // Wet hair keeps its weight after it is let go, so it settles without bouncing.
  heavy: boolean
  active: boolean
}

function emptyStrand(): MovingStrand {
  const zeros = () => new Array<number>(HAIR_SHAPE_LENGTH).fill(0)
  return { position: zeros(), target: zeros(), velocity: zeros(), origin: zeros(), held: false, drive: 'finger', heavy: false, active: false }
}

export class HairMotion {
  private strands: MovingStrand[] = Array.from({ length: STRAND_COUNT }, emptyStrand)
  private springs = Array.from({ length: STRAND_COUNT }, (_, index) => ({
    free: springTable(FREE_SPRING, strandVariation(index)),
    finger: springTable(FINGER_SPRING, strandVariation(index)),
    wind: springTable(WIND_SPRING, strandVariation(index)),
    gel: springTable(GEL_SPRING, strandVariation(index)),
    water: springTable(WATER_SPRING, strandVariation(index)),
  }))

  // The offsets handed out last time. A strand that has not moved keeps the very same array, and when no strand
  // moved the very same list, so the drawing can skip everything that is unchanged.
  private shown: HairOffsets = NO_OFFSETS

  offsets(): HairOffsets {
    if (!this.strands.some(({ active }) => active)) {
      this.shown = NO_OFFSETS
      return NO_OFFSETS
    }
    let unchanged = this.shown.length === this.strands.length
    const next = this.strands.map(({ active, position }, index) => {
      const before = this.shown[index]
      const entry = !active ? undefined : before?.every((value, slot) => value === position[slot]) ? before : position.slice()
      if (entry !== before) unchanged = false
      return entry
    })
    if (unchanged) return this.shown
    this.shown = next
    return next
  }

  target(index: number): HairShape {
    return this.strands[index].target.slice()
  }

  heldStrands(): number[] {
    return this.strands.flatMap(({ held }, index) => (held ? [index] : []))
  }

  // Moves the fingertip from `from` to `to`. Only hair under the fingertip bends, and only the part
  // of each strand around the touch point follows. Returns every strand the fingertip is touching.
  drag(look: Look, from: Point, to: Point, straighten = false): number[] {
    const delta = { x: to.x - from.x, y: to.y - from.y }
    const moving = delta.x !== 0 || delta.y !== 0
    const touched: number[] = []
    look.hair.forEach((saved, index) => {
      const strand = this.strands[index]
      // Brushing combs curls out, so bend from the straightened hair that will be saved.
      const style = straighten && saved.curl ? { ...saved, curl: false } : saved
      const points = strandPoints(style, index, strand.held ? strand.target : strand.position)
      const contact = brushContact(points, from, to)
      if (!contact) return
      touched.push(index)
      if (!moving) return
      if (!strand.held) {
        strand.held = true
        strand.active = true
        strand.target = strand.position.slice()
        strand.origin = strand.position.slice()
      }
      const slot = (contact.point - 1) * 2
      const carried = { x: strand.target[slot] - strand.origin[slot], y: strand.target[slot + 1] - strand.origin[slot + 1] }
      const weight = contact.weight * brushSlip(carried, delta)
      if (weight <= 0) return
      const rest = strandPoints(style, index)
      const natural = strandPoints({ ...style, shape: undefined }, index)
      const bent = bendStrand(points, { weight, point: contact.point }, delta, natural)
      strand.target = bent.slice(1).flatMap((point, step) => [point.x - rest[step + 1].x, point.y - rest[step + 1].y])
    })
    return touched
  }

  // Points each strand the wind reaches at the pose the air is blowing it toward. The spring carries the
  // hair there, so a target that keeps changing makes it flap. Strands stay held until released.
  blow(poses: readonly StrandPose[]) {
    this.hold(poses, 'wind')
  }

  // Lays each strand the comb has hold of onto its combed pose. Gelled hair follows the line closely and
  // stops dead on it. Strands stay held until released.
  comb(poses: readonly StrandPose[]) {
    this.hold(poses, 'gel')
  }

  // Weighs each strand the spray has soaked down to its hanging pose. Strands stay held until released.
  soak(poses: readonly StrandPose[]) {
    this.hold(poses, 'water')
  }

  private hold(poses: readonly StrandPose[], drive: Drive) {
    for (const { index, offsets } of poses) {
      const strand = this.strands[index]
      if (!strand || offsets.length !== HAIR_SHAPE_LENGTH || !offsets.every(Number.isFinite)) continue
      if (!strand.held) {
        strand.held = true
        strand.active = true
        strand.origin = strand.position.slice()
      }
      strand.drive = drive
      strand.target = offsets.slice()
    }
  }

  // Makes the current brushed pose the strand's resting pose. Returns the shape change to save, if any.
  commit(index: number): HairShape | undefined {
    const strand = this.strands[index]
    if (!strand.held) return undefined
    const shift = roundShape(strand.target)
    if (shift.every((value) => value === 0)) return undefined
    shift.forEach((value, slot) => {
      strand.position[slot] -= value
      strand.target[slot] -= value
      strand.origin[slot] -= value
    })
    return shift
  }

  release() {
    for (const strand of this.strands) {
      if (!strand.held) continue
      strand.held = false
      strand.heavy = strand.drive === 'water'
      strand.drive = 'finger'
      strand.target.fill(0)
      strand.origin.fill(0)
    }
  }

  step(seconds: number, reducedMotion = false): boolean {
    // Substeps keep the spring stable on slow devices or after a background-tab pause.
    const elapsed = Math.max(0, Math.min(seconds, 0.05))
    const steps = Math.max(1, Math.ceil(elapsed * 120))
    const dt = elapsed / steps
    let moving = false
    for (let index = 0; index < this.strands.length; index++) {
      const strand = this.strands[index]
      if (!strand.active) continue
      const tables = this.springs[index]
      const spring = strand.held ? tables[strand.drive] : strand.heavy ? tables.water : tables.free
      let settled = true
      for (let slot = 0; slot < HAIR_SHAPE_LENGTH; slot++) {
        if (reducedMotion) {
          strand.position[slot] = strand.target[slot]
          strand.velocity[slot] = 0
          continue
        }
        let position = strand.position[slot]
        let velocity = strand.velocity[slot]
        const target = strand.target[slot]
        for (let i = 0; i < steps; i++) {
          velocity += ((target - position) * spring.stiffness[slot] - velocity * spring.damping[slot]) * dt
          position += velocity * dt
        }
        if (Math.abs(target - position) < SETTLE_DISTANCE && Math.abs(velocity) < SETTLE_SPEED) {
          position = target
          velocity = 0
        } else {
          settled = false
        }
        strand.position[slot] = position
        strand.velocity[slot] = velocity
      }
      if (!settled) moving = true
      else if (!strand.held) strand.active = strand.position.some((value) => value !== 0)
    }
    return moving
  }
}
