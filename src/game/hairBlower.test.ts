import { describe, expect, it } from 'vitest'
import { HairBlower } from './hairBlower'
import { strandPoints } from './hair'
import type { Point } from './hair'
import { addShape, HAIR_SHAPE_LENGTH, HAIR_SHAPE_LIMIT, roundShape } from './hairLayout'
import { applyHairAir, createLook } from './model'
import type { Look } from './model'
import { wrapAngle } from './hairWind'
import type { WindPose } from './hairWind'

const STRAND = 5
const FRAME = 1000 / 60
// Locks that hang down the left side of the head: well behind a stream that blows rightward across the top.
const BEHIND = [11, 24, 37, 50, 63]

function wetLook(): Look {
  const look = createLook('mochi')
  return { ...look, hair: look.hair.map((strand) => ({ ...strand, wetness: 1, soapy: true })) }
}

const restPoint = (look: Look, step: number, index = STRAND) => strandPoints(look.hair[index], index)[step]

// Holds the air still for `to - from` milliseconds, applying the drying each frame as the studio does.
function hold(blower: HairBlower, look: Look, from: number, to: number, fps = 60): Look {
  const frames = Math.round((to - from) / 1000 * fps)
  let next = look
  for (let i = 1; i <= frames; i++) next = applyHairAir(next, blower.hold(next, from + (to - from) * i / frames))
  return next
}

// Drags the fingertip from `from` to `to` in even frames, starting at `start` ms.
function swipe(blower: HairBlower, look: Look, from: Point, to: Point, steps: number, start = 0): { look: Look; now: number } {
  let next = look
  for (let i = 1; i <= steps; i++) {
    const finger = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps }
    next = applyHairAir(next, blower.move(next, finger, start + i * FRAME))
  }
  return { look: next, now: start + steps * FRAME }
}

// Blows rightward (or leftward) through the hair at the height of strand 5's middle, then holds the air there.
function blowAcross(direction: 1 | -1, reducedMotion = false) {
  const look = wetLook()
  const middle = restPoint(look, 12)
  const from = { x: middle.x - 60 * direction, y: middle.y }
  const to = { x: middle.x + 10 * direction, y: middle.y }
  const blower = new HairBlower(look, from, 0, reducedMotion)
  const swiped = swipe(blower, look, from, to, 12)
  const held = hold(blower, swiped.look, swiped.now, swiped.now + 300)
  return { look, blower, held, now: swiped.now + 300 }
}

const poseOf = (poses: readonly WindPose[], index = STRAND) => poses.find((pose) => pose.index === index)
const tipOffset = (pose: WindPose | undefined) => ({ x: pose!.offsets[HAIR_SHAPE_LENGTH - 2], y: pose!.offsets[HAIR_SHAPE_LENGTH - 1] })

describe('the hair dryer', () => {
  it('blows every strand in its path along the swipe, and leaves hair outside the stream alone', () => {
    const { look, blower, held } = blowAcross(1)
    const blown = blower.settled()
    expect(blown.map(({ index }) => index)).toContain(STRAND)
    expect(blown.length).toBeGreaterThan(30)
    expect(tipOffset(poseOf(blown)).x).toBeGreaterThan(30)
    expect(blown.every((pose) => tipOffset(pose).x > 0)).toBe(true)
    for (const index of BEHIND) {
      expect(poseOf(blown, index)).toBeUndefined()
      expect(held.hair[index]).toBe(look.hair[index])
    }
  })
  it('blows hair the other way when swiped the other way', () => {
    const { blower } = blowAcross(-1)
    const blown = blower.settled()
    expect(tipOffset(poseOf(blown)).x).toBeLessThan(-30)
    expect(blown.every((pose) => tipOffset(pose).x < 0)).toBe(true)
  })
  it('streams the tips of the hair out along the wind rather than stretching it', () => {
    const { look, blower } = blowAcross(1)
    const rest = strandPoints(look.hair[STRAND], STRAND)
    const pose = strandPoints(look.hair[STRAND], STRAND, poseOf(blower.settled())!.offsets)
    expect(pose[0]).toEqual(rest[0])
    const offWind = (points: Point[]) => Math.abs(wrapAngle(Math.atan2(points[24].y - points[23].y, points[24].x - points[23].x)))
    expect(offWind(pose)).toBeLessThan(offWind(rest) * 0.4)
    expect(pose[24].x - pose[0].x).toBeGreaterThan(Math.abs(rest[24].x - rest[0].x) + 30)
    rest.slice(1).forEach((point, i) => {
      expect(Math.hypot(pose[i + 1].x - pose[i].x, pose[i + 1].y - pose[i].y)).toBeCloseTo(Math.hypot(point.x - rest[i].x, point.y - rest[i].y), 6)
    })
  })
  it('blows hair that the air meets head-on away from the middle of the head', () => {
    const look = wetLook()
    const from = { x: 250, y: 90 }
    const blower = new HairBlower(look, from, 0)
    const swiped = swipe(blower, look, from, { x: 250, y: 150 }, 10)
    hold(blower, swiped.look, swiped.now, swiped.now + 300)
    expect(blower.jet().direction.y).toBeGreaterThan(0.99)
    const blown = blower.settled()
    expect(poseOf(blown, 3)!.offsets[22]).toBeLessThan(-5)
    expect(poseOf(blown, 7)!.offsets[22]).toBeGreaterThan(5)
  })
})

describe('aiming the dryer', () => {
  it('blows the way the finger swipes, even when the swipe starts on the left of the head', () => {
    const look = wetLook()
    const from = { x: 120, y: 140 }
    const blower = new HairBlower(look, from, 0)
    expect(blower.jet().direction.x).toBeCloseTo(-1, 9)
    const right = swipe(blower, look, from, { x: 190, y: 140 }, 7)
    expect(blower.jet().direction.x).toBeCloseTo(1, 9)
    expect(blower.jet().direction.y).toBeCloseTo(0, 9)
    expect(blower.jet().nozzle.x).toBeLessThan(190 - 40)
    swipe(blower, right.look, { x: 190, y: 140 }, { x: 120, y: 140 }, 12, right.now)
    expect(blower.jet().direction.x).toBeLessThan(-0.9)
  })
  it('does not let a wobble at touch-down aim the wind', () => {
    const look = wetLook()
    const from = { x: 300, y: 140 }
    const blower = new HairBlower(look, from, 0)
    const before = blower.jet().direction
    blower.move(look, { x: 297, y: 140 }, FRAME)
    blower.move(look, { x: 300, y: 141 }, 2 * FRAME)
    expect(blower.jet().direction).toEqual(before)
    swipe(blower, look, from, { x: 360, y: 140 }, 10, 2 * FRAME)
    expect(blower.jet().direction.x).toBeCloseTo(1, 9)
  })
  it('keeps the nozzle behind the fingertip so the fingertip is inside the stream', () => {
    const look = wetLook()
    const finger = restPoint(look, 14)
    const jet = new HairBlower(look, finger, 0).jet()
    const ahead = (finger.x - jet.nozzle.x) * jet.direction.x + (finger.y - jet.nozzle.y) * jet.direction.y
    expect(ahead).toBeGreaterThan(30)
    expect(Math.hypot(jet.direction.x, jet.direction.y)).toBeCloseTo(1, 9)
  })
})

describe('flapping', () => {
  const tipSwing = (blower: HairBlower, look: Look, from: number, frames: number) => {
    const reach: number[] = []
    let next = look
    for (let i = 1; i <= frames; i++) {
      next = applyHairAir(next, blower.hold(next, from + i * FRAME))
      reach.push(tipOffset(poseOf(blower.poses())).x)
    }
    return Math.max(...reach) - Math.min(...reach)
  }
  it('keeps the hair in the air flapping while the dryer is held still', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0)
    const settled = hold(blower, look, 0, 1000)
    expect(tipSwing(blower, settled, 1000, 40)).toBeGreaterThan(4)
  })
  it('holds the pose steady under reduced motion', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0, true)
    const settled = hold(blower, look, 0, 1500)
    expect(tipSwing(blower, settled, 1500, 40)).toBeLessThan(0.01)
  })
  it('stops flapping once the air has moved away, leaving the swept pose behind', () => {
    const { look, blower, held, now } = blowAcross(1)
    const swept = blower.settled()
    const away = applyHairAir(held, blower.move(held, { x: 20, y: 440 }, now + FRAME))
    expect(blower.isBlowing()).toBe(true)
    const calm = hold(blower, away, now + FRAME, now + 2500)
    expect(blower.isBlowing()).toBe(false)
    expect(tipSwing(blower, calm, now + 2500, 40)).toBeLessThan(0.05)
    expect(blower.settled()).toEqual(swept)
    expect(poseOf(blower.settled())).toBeDefined()
    expect(calm).toBe(away)
    expect(look.hair[STRAND].wetness).toBe(1)
  })
})

describe('drying', () => {
  it('dries the hair in the air steadily, in about a second, without removing soap or touching other hair', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0)
    const first = hold(blower, look, 0, 300)
    const second = hold(blower, first, 300, 600)
    const third = hold(blower, second, 600, 900)
    const wetness = [look, first, second, third].map((state) => state.hair[STRAND].wetness!)
    expect(wetness[0] - wetness[1]).toBeGreaterThan(0.1)
    expect(wetness[1] - wetness[2]).toBeCloseTo(wetness[0] - wetness[1], 6)
    expect(wetness[2] - wetness[3]).toBeCloseTo(wetness[0] - wetness[1], 6)
    expect(hold(blower, third, 900, 1700).hair[STRAND].wetness).toBe(0)
    expect(third.hair[STRAND]).toMatchObject({ soapy: true, length: look.hair[STRAND].length, color: look.hair[STRAND].color })
    BEHIND.forEach((index) => expect(third.hair[index]).toBe(look.hair[index]))
  })
  it('dries with matching results at 30, 60 and 120 frames per second', () => {
    const look = wetLook()
    const results = [30, 60, 120].map((fps) => {
      const blower = new HairBlower(look, restPoint(look, 14), 0, true)
      const held = hold(blower, look, 0, 600, fps)
      return { held, settled: poseOf(blower.settled())!.offsets }
    })
    for (const { held, settled } of results) {
      expect(held.hair[STRAND].wetness).toBeCloseTo(results[0].held.hair[STRAND].wetness!, 8)
      settled.forEach((value, slot) => expect(value).toBeCloseTo(results[0].settled[slot], 6))
    }
  })
  it('treats a long stall as a single short frame, so hair never jumps', () => {
    const look = wetLook()
    const point = restPoint(look, 14)
    const stalled = new HairBlower(look, point, 100)
    const steady = new HairBlower(look, point, 100)
    expect(stalled.hold(look, 10_100)).toEqual(steady.hold(look, 150))
    expect(stalled.settled()).toEqual(steady.settled())
    expect(applyHairAir(look, stalled.hold(look, 20_000)).hair[STRAND].wetness).toBeGreaterThan(0.8)
  })
  it('ignores frames that arrive early or out of order', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 100)
    expect(blower.hold(look, 90)).toEqual([])
    expect(blower.isBlowing()).toBe(true)
    expect(blower.hold(look, 100)).toEqual([])
    const first = blower.hold(look, 150)
    expect(first.length).toBeGreaterThan(0)
    expect(blower.hold(look, 120)).toEqual([])
  })
})

describe('keeping the blown hair', () => {
  it('never stretches the hair or pushes it past the studio limit while flapping', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0)
    let next = look
    let posed = 0
    const problems = { badShape: 0, rootMoved: 0, stretched: 0 }
    // Thousands of points are checked, so problems are counted and asserted once instead of one expectation per point.
    for (let i = 1; i <= 120; i++) {
      next = applyHairAir(next, blower.hold(next, i * FRAME))
      for (const { index, offsets } of blower.poses()) {
        posed++
        if (offsets.length !== HAIR_SHAPE_LENGTH || !offsets.every((value) => Number.isFinite(value) && Math.abs(value) <= HAIR_SHAPE_LIMIT)) problems.badShape++
        const rest = strandPoints(look.hair[index], index)
        const pose = strandPoints(look.hair[index], index, offsets)
        if (pose[0].x !== rest[0].x || pose[0].y !== rest[0].y) problems.rootMoved++
        pose.slice(1).forEach((point, step) => {
          const hung = Math.hypot(point.x - pose[step].x, point.y - pose[step].y)
          const resting = Math.hypot(rest[step + 1].x - rest[step].x, rest[step + 1].y - rest[step].y)
          if (Math.abs(hung - resting) >= 5e-7) problems.stretched++
        })
      }
    }
    expect(posed).toBeGreaterThan(100)
    expect(problems).toEqual({ badShape: 0, rootMoved: 0, stretched: 0 })
  })
  it('saves the swept pose without any flapping, and only for the hair the air reached', () => {
    const { look, blower, held } = blowAcross(1)
    const swept = blower.settled()
    const saved = applyHairAir(held, swept.map(({ index, offsets }) => ({ index, shape: addShape(held.hair[index].shape, roundShape(offsets)) ?? null })))
    for (const { index, offsets } of swept) {
      const expected = strandPoints(look.hair[index], index, offsets)
      strandPoints(saved.hair[index], index).forEach((point, step) => {
        expect(point.x).toBeCloseTo(expected[step].x, 1)
        expect(point.y).toBeCloseTo(expected[step].y, 1)
      })
    }
    BEHIND.forEach((index) => expect(saved.hair[index]).toBe(held.hair[index]))
    expect(saved.hair[STRAND]).toMatchObject({ soapy: true, length: look.hair[STRAND].length })
    const flapping = blower.poses()
    expect(flapping.length).toBe(swept.length)
    expect(poseOf(flapping)!.offsets).not.toEqual(poseOf(swept)!.offsets)
  })
  it('stays steady at rest even though the hair in the air flaps', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0)
    const first = hold(blower, look, 0, 2000)
    const early = poseOf(blower.settled())!.offsets
    const earlyFlap = poseOf(blower.poses())!.offsets
    hold(blower, first, 2000, 2090)
    const later = poseOf(blower.settled())!.offsets
    const laterFlap = poseOf(blower.poses())!.offsets
    const gap = (a: readonly number[], b: readonly number[]) => Math.max(...a.map((value, slot) => Math.abs(value - b[slot])))
    expect(gap(early, later)).toBeLessThan(1)
    expect(gap(earlyFlap, laterFlap)).toBeGreaterThan(gap(early, later))
  })
})

describe('starting and stopping', () => {
  it('does nothing when held in the empty room', () => {
    const look = wetLook()
    const blower = new HairBlower(look, { x: 20, y: 400 }, 0)
    expect(blower.isBlowing()).toBe(false)
    expect(hold(blower, look, 0, 1000)).toBe(look)
    expect(blower.poses()).toEqual([])
    expect(blower.settled()).toEqual([])
  })
  it('stops blowing when told to, and gives no more edits or poses', () => {
    const look = wetLook()
    const blower = new HairBlower(look, restPoint(look, 14), 0)
    hold(blower, look, 0, 300)
    expect(blower.poses().length).toBeGreaterThan(0)
    blower.stop()
    expect(blower.hold(look, 1000)).toEqual([])
    expect(blower.move(look, { x: 300, y: 140 }, 1100)).toEqual([])
    expect(blower.poses()).toEqual([])
    expect(blower.isBlowing()).toBe(false)
  })
})
