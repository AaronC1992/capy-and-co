import { describe, expect, it } from 'vitest'
import { HairMotion } from './hairMotion'
import { BRUSH_RADIUS, brushContact } from './hairBrush'
import { hitHairStroke, strandPoints } from './hair'
import type { Point } from './hair'
import { addShape, HAIR_SHAPE_LENGTH } from './hairLayout'
import type { WindPose } from './hairWind'
import { createLook } from './model'
import type { Look } from './model'

const STRAND = 5

function advance(motion: HairMotion, seconds = 0.4, fps = 60) {
  for (let i = 0; i < seconds * fps; i++) motion.step(1 / fps)
}

// Drags a fingertip in small steps, the way pointer events arrive.
function sweep(motion: HairMotion, look: Look, from: Point, moves: number, step: Point, straighten = true): Point {
  let finger = from
  for (let i = 0; i < moves; i++) {
    const next = { x: finger.x + step.x, y: finger.y + step.y }
    motion.drag(look, finger, next, straighten)
    motion.step(1 / 60)
    finger = next
  }
  return finger
}

function restPoint(look: Look, index: number, step: number): Point {
  return strandPoints(look.hair[index], index)[step]
}

function targetPose(look: Look, motion: HairMotion, index: number): Point[] {
  return strandPoints(look.hair[index], index, motion.target(index))
}

function displacement(look: Look, motion: HairMotion, index: number, step: number): number {
  const rest = restPoint(look, index, step)
  const bent = targetPose(look, motion, index)[step]
  return Math.hypot(bent.x - rest.x, bent.y - rest.y)
}

function arcLength(points: Point[]): number {
  return points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - points[i].x, point.y - points[i].y), 0)
}

describe('local hair brushing', () => {
  it('only bends the hair under the fingertip', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const start = restPoint(look, STRAND, 14)
    const touched = motion.drag(look, start, { x: start.x + 12, y: start.y })
    const broad = hitHairStroke(look, start, { x: start.x + 12, y: start.y })
    expect(touched).toContain(STRAND)
    expect(touched.length).toBeLessThan(broad.length)
    expect(touched).not.toContain(0)
    expect(touched).not.toContain(12)
    const held = motion.heldStrands()
    expect(held.length).toBeGreaterThan(0)
    expect(held.every((index) => touched.includes(index))).toBe(true)
    advance(motion)
    const offsets = motion.offsets()
    look.hair.forEach((_, index) => {
      if (!touched.includes(index)) expect(offsets[index]).toBeUndefined()
    })
  })
  it('keeps the root fixed and bends gradually toward the touched point', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    sweep(motion, look, restPoint(look, STRAND, 16), 12, { x: 3, y: 0 })
    const pose = targetPose(look, motion, STRAND)
    expect(pose[0]).toEqual(restPoint(look, STRAND, 0))
    expect(displacement(look, motion, STRAND, 3)).toBeLessThan(displacement(look, motion, STRAND, 10))
    expect(displacement(look, motion, STRAND, 10)).toBeLessThan(displacement(look, motion, STRAND, 16))
    expect(displacement(look, motion, STRAND, 16)).toBeGreaterThan(20)
  })
  it('lets the strand bend without stretching or collapsing it', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    sweep(motion, look, restPoint(look, STRAND, 18), 25, { x: 3, y: 1 })
    const rest = strandPoints(look.hair[STRAND], STRAND)
    const pose = targetPose(look, motion, STRAND)
    expect(arcLength(pose)).toBeLessThanOrEqual(arcLength(rest) * 1.01)
    expect(arcLength(pose)).toBeGreaterThan(arcLength(rest) * 0.5)
    pose.slice(1).forEach((point, i) => {
      const segment = Math.hypot(point.x - pose[i].x, point.y - pose[i].y)
      const original = Math.hypot(rest[i + 1].x - rest[i].x, rest[i + 1].y - rest[i].y)
      expect(segment).toBeLessThanOrEqual(original * 1.01)
    })
  })
  it('follows the finger back and forth', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const rest = restPoint(look, STRAND, 16)
    const right = sweep(motion, look, rest, 10, { x: 2, y: 0 })
    const rightLean = targetPose(look, motion, STRAND)[16].x - rest.x
    expect(rightLean).toBeGreaterThan(8)
    sweep(motion, look, right, 40, { x: -2, y: 0 })
    expect(targetPose(look, motion, STRAND)[16].x - rest.x).toBeLessThan(rightLean - 10)
  })
  it('lets the finger slide past hair after carrying it a good distance', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const rest = restPoint(look, STRAND, 16)
    sweep(motion, look, rest, 300, { x: 5, y: 0 })
    for (const value of motion.target(STRAND)) expect(Math.abs(value)).toBeLessThan(140)
    const huge = new HairMotion()
    huge.drag(look, rest, { x: rest.x + 5000, y: rest.y + 5000 })
    huge.step(30)
    for (const value of huge.target(STRAND)) expect(Number.isFinite(value) && Math.abs(value) < 140).toBe(true)
  })
  it('keeps the brushed pose when committed, with no jump, then settles on it', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const rest = restPoint(look, STRAND, 16)
    sweep(motion, look, rest, 14, { x: 3, y: -1 })
    advance(motion, 0.3)
    const before = strandPoints(look.hair[STRAND], STRAND, motion.offsets()[STRAND])
    const pose = targetPose(look, motion, STRAND)
    const shift = motion.commit(STRAND)
    expect(shift).toHaveLength(48)
    look.hair[STRAND] = { ...look.hair[STRAND], shape: addShape(look.hair[STRAND].shape, shift!) }
    const after = strandPoints(look.hair[STRAND], STRAND, motion.offsets()[STRAND])
    after.forEach((point, i) => {
      expect(point.x).toBeCloseTo(before[i].x, 8)
      expect(point.y).toBeCloseTo(before[i].y, 8)
    })
    motion.release()
    advance(motion, 3)
    expect(motion.offsets()[STRAND]).toBeUndefined()
    expect(motion.step(1 / 60)).toBe(false)
    const settled = strandPoints(look.hair[STRAND], STRAND)
    settled.forEach((point, i) => {
      expect(point.x).toBeCloseTo(pose[i].x, 1)
      expect(point.y).toBeCloseTo(pose[i].y, 1)
    })
  })
  it('starts the next brush stroke from the saved pose', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    sweep(motion, look, restPoint(look, STRAND, 16), 12, { x: 3, y: 0 })
    look.hair[STRAND] = { ...look.hair[STRAND], shape: addShape(undefined, motion.commit(STRAND)!) }
    motion.release()
    advance(motion, 2)
    const saved = strandPoints(look.hair[STRAND], STRAND)
    sweep(motion, look, saved[16], 12, { x: 0, y: 3 })
    const pose = targetPose(look, motion, STRAND)
    expect(pose[16].y).toBeGreaterThan(saved[16].y + 10)
    expect(pose[16].x).toBeGreaterThan(restPoint(createLook('mochi'), STRAND, 16).x + 10)
  })
  it('reports a tap on hair without moving it', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const point = restPoint(look, STRAND, 12)
    expect(motion.drag(look, point, point)).toContain(STRAND)
    expect(motion.heldStrands()).toEqual([])
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.offsets()).toEqual([])
  })
  it('ignores swipes that miss the hair', () => {
    const motion = new HairMotion()
    expect(motion.drag(createLook('mochi'), { x: 20, y: 400 }, { x: 60, y: 480 })).toEqual([])
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.offsets()).toEqual([])
  })
  it('moves gradually across frames and stops when settled', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const start = restPoint(look, STRAND, 16)
    motion.drag(look, start, { x: start.x + 14, y: start.y })
    expect(motion.step(1 / 60)).toBe(true)
    const first = motion.offsets()[STRAND]![30]
    expect(first).toBeGreaterThan(0)
    advance(motion, 1)
    expect(motion.offsets()[STRAND]![30]).toBeGreaterThan(first)
    advance(motion, 3)
    expect(motion.step(1 / 60)).toBe(false)
  })
  it('bends hair sideways instead of squashing it when pushed toward the scalp', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    sweep(motion, look, restPoint(look, STRAND, 14), 20, { x: 0, y: 3 })
    const rest = strandPoints(look.hair[STRAND], STRAND)
    const pose = targetPose(look, motion, STRAND)
    expect(pose[14].y).toBeGreaterThan(rest[14].y + 30)
    expect(Math.abs(pose[24].x - rest[24].x)).toBeGreaterThan(8)
    expect(arcLength(pose)).toBeGreaterThan(arcLength(rest) * 0.65)
    expect(pose[0]).toEqual(rest[0])
  })
  it('lags at the tip and swings past the brushed pose before settling', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const start = restPoint(look, STRAND, 16)
    motion.drag(look, start, { x: start.x + 20, y: start.y })
    const target = motion.target(STRAND)
    for (let i = 0; i < 3; i++) motion.step(1 / 60)
    const shown = motion.offsets()[STRAND]!
    expect(shown[14] / target[14]).toBeGreaterThan(shown[46] / target[46])
    let peak = 0
    for (let i = 0; i < 90; i++) {
      motion.step(1 / 60)
      peak = Math.max(peak, motion.offsets()[STRAND]![46])
    }
    expect(peak).toBeGreaterThan(target[46] + 1)
    advance(motion, 3)
    expect(motion.offsets()[STRAND]![46]).toBeCloseTo(target[46], 1)
  })
  it('has comparable movement at 30, 60 and 120 frames per second', () => {
    const look = createLook('mochi')
    const start = restPoint(look, STRAND, 16)
    const tips = [30, 60, 120].map((fps) => {
      const motion = new HairMotion()
      motion.drag(look, start, { x: start.x + 14, y: start.y + 4 })
      advance(motion, 0.3, fps)
      return motion.offsets()[STRAND]![46]
    })
    expect(Math.max(...tips) - Math.min(...tips)).toBeLessThan(0.2)
  })
  it('honors reduced motion with direct dragging and no release bounce', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    const start = restPoint(look, STRAND, 16)
    motion.drag(look, start, { x: start.x + 14, y: start.y })
    expect(motion.step(1 / 60, true)).toBe(false)
    expect(motion.offsets()[STRAND]).toEqual(motion.target(STRAND))
    motion.release()
    expect(motion.step(1 / 60, true)).toBe(false)
    expect(motion.offsets()).toEqual([])
  })
})

describe('brush contact', () => {
  it('fades out toward the edge of the fingertip and misses beyond it', () => {
    const look = createLook('mochi')
    const point = restPoint(look, STRAND, 12)
    const centered = brushContact(strandPoints(look.hair[STRAND], STRAND), point, point)
    const edge = brushContact(strandPoints(look.hair[STRAND], STRAND), { x: point.x + BRUSH_RADIUS * 0.8, y: point.y }, { x: point.x + BRUSH_RADIUS * 0.8, y: point.y })
    expect(centered).toEqual({ weight: 1, point: 12 })
    expect(edge?.weight ?? 0).toBeLessThan(0.3)
    expect(brushContact(strandPoints(look.hair[STRAND], STRAND), { x: point.x + 60, y: point.y }, { x: point.x + 60, y: point.y })).toBeNull()
  })
})

describe('wind-blown hair', () => {
  // A pose that streams the strand out to the right, growing toward the tip like a blown lock.
  const swept = (reach: number, index = STRAND): WindPose => ({
    index,
    offsets: Array.from({ length: HAIR_SHAPE_LENGTH }, (_, slot) => (slot % 2 === 0 ? (reach * ((slot >> 1) + 1)) / 24 : 0)),
  })
  const tip = (motion: HairMotion) => motion.offsets()[STRAND]![HAIR_SHAPE_LENGTH - 2]

  it('holds the strands it blows and carries them quickly to the blown pose', () => {
    const motion = new HairMotion()
    motion.blow([swept(60), swept(40, 7)])
    expect(motion.heldStrands()).toEqual([STRAND, 7])
    advance(motion, 0.25)
    expect(tip(motion)).toBeGreaterThan(60 * 0.8)
    advance(motion, 3)
    expect(tip(motion)).toBeCloseTo(60, 1)
    expect(motion.offsets()[2]).toBeUndefined()
  })
  it('swings the tip both ways when the blown pose keeps changing, so the hair flaps', () => {
    const motion = new HairMotion()
    const reach: number[] = []
    for (let frame = 0; frame < 96; frame++) {
      if (frame % 12 === 0) motion.blow([swept(frame % 24 === 0 ? 50 : -50)])
      motion.step(1 / 60)
      reach.push(tip(motion))
    }
    expect(Math.max(...reach)).toBeGreaterThan(30)
    expect(Math.min(...reach)).toBeLessThan(-30)
  })
  it('ignores poses that are malformed or for hair that does not exist', () => {
    const motion = new HairMotion()
    const good = swept(30)
    motion.blow([
      { ...good, offsets: good.offsets.slice(1) },
      { ...good, offsets: good.offsets.map((value, slot) => (slot === 3 ? Number.NaN : value)) },
      { ...good, offsets: good.offsets.map((value, slot) => (slot === 4 ? Infinity : value)) },
      { ...good, index: -1 },
      { ...good, index: 65 },
    ])
    expect(motion.heldStrands()).toEqual([])
    expect(motion.step(1 / 60)).toBe(false)
    expect(motion.offsets()).toEqual([])
  })
  it('keeps the blown pose when committed, with no visual jump, then settles on it', () => {
    const look = createLook('mochi')
    const motion = new HairMotion()
    motion.blow([swept(60)])
    advance(motion, 1)
    const before = strandPoints(look.hair[STRAND], STRAND, motion.offsets()[STRAND])
    const shift = motion.commit(STRAND)
    expect(shift).toHaveLength(HAIR_SHAPE_LENGTH)
    look.hair[STRAND] = { ...look.hair[STRAND], shape: addShape(look.hair[STRAND].shape, shift!) }
    strandPoints(look.hair[STRAND], STRAND, motion.offsets()[STRAND]).forEach((point, step) => {
      expect(point.x).toBeCloseTo(before[step].x, 8)
      expect(point.y).toBeCloseTo(before[step].y, 8)
    })
    motion.release()
    advance(motion, 3)
    expect(motion.offsets()[STRAND]).toBeUndefined()
    expect(strandPoints(look.hair[STRAND], STRAND)[24].x).toBeCloseTo(restPoint(createLook('mochi'), STRAND, 24).x + 60, 1)
  })
  it('lets blown hair that was never saved fall back to rest, and stops tracking it', () => {
    const motion = new HairMotion()
    motion.blow([swept(60)])
    advance(motion, 1)
    motion.release()
    expect(motion.heldStrands()).toEqual([])
    advance(motion, 4)
    expect(motion.offsets()).toEqual([])
    expect(motion.step(1 / 60)).toBe(false)
  })
  it('snaps straight to the blown pose under reduced motion', () => {
    const motion = new HairMotion()
    motion.blow([swept(60)])
    expect(motion.step(1 / 60, true)).toBe(false)
    expect(tip(motion)).toBe(60)
  })
})

