import { describe, expect, it } from 'vitest'
import { COMB_MIN_PATH, COMB_RADIUS, HairComb } from './hairComb'
import { HairMotion } from './hairMotion'
import { strandPoints } from './hair'
import type { Point } from './hair'
import { addShape, HAIR_SHAPE_LENGTH, HAIR_SHAPE_LIMIT, MIN_LENGTH } from './hairLayout'
import type { StrandPose } from './hairLayout'
import { createLook } from './model'
import type { Look } from './model'

const STRAND = 5
// Mid-strand: well past the scalp and well short of the tip.
const TOUCH = 12

const rest = (look: Look, index = STRAND) => strandPoints(look.hair[index], index)
const posed = (look: Look, pose: StrandPose) => strandPoints(look.hair[pose.index], pose.index, pose.offsets)
const poseOf = (comb: HairComb, index = STRAND) => comb.poses().find((pose) => pose.index === index)
const heading = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x)
const segments = (points: Point[]) => points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y))

// Puts the comb down on the strand at `at`, the way pointer-down does.
function touch(look: Look, at: Point) {
  const comb = new HairComb(at)
  return { comb, taken: comb.move(look, at, []) }
}

// Drags the comb along a polyline in small steps, the way pointer events arrive.
function drag(comb: HairComb, look: Look, path: Point[], step = 3): Point {
  let finger = path[0]
  for (const target of path.slice(1)) {
    const from = finger
    const moves = Math.max(1, Math.ceil(Math.hypot(target.x - from.x, target.y - from.y) / step))
    for (let i = 1; i <= moves; i++) {
      finger = { x: from.x + (target.x - from.x) * i / moves, y: from.y + (target.y - from.y) * i / moves }
      comb.move(look, finger, [])
    }
  }
  return finger
}

const by = (point: Point, x: number, y: number): Point => ({ x: point.x + x, y: point.y + y })

describe('gel comb', () => {
  it('takes hold of the strands under the finger, once each, and nothing else', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb, taken } = touch(look, at)
    expect(taken).toContain(STRAND)
    expect(taken.length).toBeLessThan(look.hair.length / 4)
    expect(taken).not.toContain(0)
    expect(taken).not.toContain(12)
    expect(comb.move(look, at, [])).toEqual([])
    const further = comb.move(look, by(at, 6, 0), [])
    expect(further.every((index) => !taken.includes(index))).toBe(true)
    expect(touch(look, by(at, COMB_RADIUS * 4, 0)).taken).not.toContain(STRAND)
  })

  it('waits for the finger to travel before laying any hair down', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    expect(comb.poses()).toEqual([])
    comb.move(look, by(at, COMB_MIN_PATH / 2, 0), [])
    expect(comb.poses()).toEqual([])
    comb.move(look, by(at, COMB_MIN_PATH * 2, 0), [])
    expect(poseOf(comb)).toBeDefined()
  })

  it('ignores a shaky finger that never really goes anywhere', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    for (let i = 0; i < 200; i++) comb.move(look, by(at, i % 2 ? 0.4 : -0.4, i % 3 ? 0.3 : -0.3), [])
    expect(comb.poses()).toEqual([])
  })

  it('keeps the hair before the touch exactly where it was', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    drag(comb, look, [at, by(at, 70, 0)])
    const combed = posed(look, poseOf(comb)!)
    const before = rest(look)
    for (let step = 0; step <= TOUCH - 2; step++) {
      expect(combed[step].x).toBeCloseTo(before[step].x, 6)
      expect(combed[step].y).toBeCloseTo(before[step].y, 6)
    }
    expect(Math.hypot(combed[24].x - before[24].x, combed[24].y - before[24].y)).toBeGreaterThan(20)
  })

  it('lays the hair after the touch along the line the finger drew', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    // Up along the hair, then round the corner to the right.
    const corner = by(at, 0, -15)
    drag(comb, look, [at, corner, by(corner, 70, 0)])
    const combed = posed(look, poseOf(comb)!)
    const tail = combed.slice(TOUCH)
    expect(Math.abs(heading(tail[tail.length - 2], tail[tail.length - 1]))).toBeLessThan(0.2)
    expect(tail[tail.length - 1].x - tail[0].x).toBeGreaterThan(15)
    expect(tail[tail.length - 1].y).toBeLessThan(tail[0].y)
    expect(tail[Math.floor(tail.length / 4)].y).toBeLessThan(tail[0].y - 3)
  })

  it('keeps every segment the length the hair naturally is', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    drag(comb, look, [at, by(at, 20, -30), by(at, 80, -10), by(at, 90, 40)])
    const natural = segments(strandPoints({ ...look.hair[STRAND], shape: undefined }, STRAND))
    segments(posed(look, poseOf(comb)!)).slice(TOUCH).forEach((length, step) => expect(length).toBeCloseTo(natural[TOUCH + step], 6))
  })

  it('combs the strands it touches side by side', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb, taken } = touch(look, by(at, -3, 0))
    drag(comb, look, [by(at, -3, 0), by(at, 120, 0)])
    expect(taken.length).toBeGreaterThan(2)
    const tails = comb.poses().map((pose) => {
      const points = posed(look, pose)
      return heading(points[22], points[24])
    })
    expect(tails.length).toBeGreaterThan(10)
    // Hair gripped right at its tip has almost nothing left to turn, so judge the bulk of the strands.
    expect(tails.filter((angle) => Math.abs(angle) < 0.15).length).toBeGreaterThan(tails.length * 0.8)
  })

  it('keeps hold of hair until the finger lifts, however far the finger goes', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    drag(comb, look, [at, by(at, 40, 0)])
    const early = poseOf(comb)!
    drag(comb, look, [by(at, 40, 0), by(at, 40, 150), by(at, -120, 150)])
    expect(poseOf(comb)).toBeDefined()
    expect(poseOf(comb)!.offsets).toEqual(early.offsets)
  })

  it('stays inside the shapes the studio can save', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    drag(comb, look, [at, by(at, 900, 400), by(at, -900, -800)], 25)
    for (const { offsets } of comb.poses()) {
      expect(offsets).toHaveLength(HAIR_SHAPE_LENGTH)
      expect(offsets.every((value) => Number.isFinite(value) && Math.abs(value) <= HAIR_SHAPE_LIMIT)).toBe(true)
    }
  })

  it('combs curly hair along its own line exactly like straight hair, since curls are only drawn around it', () => {
    const look = createLook('mochi')
    const curled: Look = { ...look, hair: look.hair.map((strand, index) => index === STRAND ? { ...strand, curl: 1 } : strand) }
    const at = rest(look)[TOUCH]
    const combedOffsets = (source: Look) => {
      const { comb } = touch(source, at)
      drag(comb, source, [at, by(at, 70, 0)])
      return poseOf(comb)!.offsets
    }
    expect(combedOffsets(curled)).toEqual(combedOffsets(look))
  })

  it('never takes hold of shaved scalp', () => {
    const look = createLook('mochi')
    look.hair[STRAND] = { length: MIN_LENGTH, color: '#eb9c95', curl: 0, flow: 0.3 }
    const { taken } = touch(look, strandPoints(look.hair[STRAND], STRAND)[0])
    expect(taken).not.toContain(STRAND)
  })

  it('leaves the hair where it was combed once the pose is saved', () => {
    const look = createLook('mochi')
    const at = rest(look)[TOUCH]
    const { comb } = touch(look, at)
    drag(comb, look, [at, by(at, 10, -20), by(at, 60, -20)])
    const pose = poseOf(comb)!
    const motion = new HairMotion()
    motion.comb([pose])
    for (let i = 0; i < 60; i++) motion.step(1 / 60)
    const shift = motion.commit(STRAND)!
    look.hair[STRAND] = { ...look.hair[STRAND], shape: addShape(look.hair[STRAND].shape, shift) }
    motion.release()
    for (let i = 0; i < 120; i++) motion.step(1 / 60)
    expect(motion.offsets()).toEqual([])
    const saved = strandPoints(look.hair[STRAND], STRAND)
    posed(createLook('mochi'), pose).forEach((point, step) => {
      expect(saved[step].x).toBeCloseTo(point.x, 1)
      expect(saved[step].y).toBeCloseTo(point.y, 1)
    })
  })
})
