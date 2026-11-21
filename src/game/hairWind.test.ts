import { describe, expect, it } from 'vitest'
import { strandPoints } from './hair'
import type { Point } from './hair'
import { HAIR_POINTS, HAIR_SHAPE_LENGTH } from './hairLayout'
import { createLook } from './model'
import { bendInWind, coneHalfWidth, WIND_RANGE, windChain, windStrength, wrapAngle } from './hairWind'
import type { AirJet } from './hairWind'

const STRAND = 5
const RIGHT: AirJet = { nozzle: { x: 100, y: 200 }, direction: { x: 1, y: 0 } }
const fill = (value: number) => new Array<number>(HAIR_POINTS).fill(value)

// A straight lock rising from the scalp, or hanging from it, is the easiest hair to reason about.
function straightLock(rootX: number, rise: number): Point[] {
  return Array.from({ length: HAIR_POINTS + 1 }, (_, step) => ({ x: rootX, y: 300 - step * 4 * rise }))
}

function bent(points: readonly Point[], offsets: readonly number[]): Point[] {
  return points.map((point, step) => (step === 0 ? point : { x: point.x + offsets[(step - 1) * 2], y: point.y + offsets[(step - 1) * 2 + 1] }))
}

function segmentLengths(points: readonly Point[]): number[] {
  return points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y))
}

function segmentAngle(points: readonly Point[], step: number): number {
  return Math.atan2(points[step].y - points[step - 1].y, points[step].x - points[step - 1].x)
}

const tipReach = (offsets: readonly number[]) => Math.hypot(offsets[HAIR_SHAPE_LENGTH - 2], offsets[HAIR_SHAPE_LENGTH - 1])
const times = Array.from({ length: 60 }, (_, i) => i * 0.011)

describe('the stream of air', () => {
  it('wraps angles the short way round', () => {
    expect(wrapAngle(0)).toBe(0)
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2, 10)
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2, 10)
    expect(wrapAngle(Math.PI * 6 + 0.4)).toBeCloseTo(0.4, 10)
  })
  it('fans out as it travels', () => {
    expect(coneHalfWidth(-40)).toBe(coneHalfWidth(0))
    expect(coneHalfWidth(100)).toBeGreaterThan(coneHalfWidth(0))
    expect(coneHalfWidth(250)).toBeGreaterThan(coneHalfWidth(100))
  })
  it('blows full strength in the core and not at all behind, beside or beyond it', () => {
    expect(windStrength(RIGHT, { x: 200, y: 200 })).toBe(1)
    expect(windStrength(RIGHT, { x: 60, y: 200 })).toBe(0)
    expect(windStrength(RIGHT, { x: 200, y: 200 + coneHalfWidth(100) })).toBe(0)
    expect(windStrength(RIGHT, { x: 200, y: 200 - coneHalfWidth(100) - 5 })).toBe(0)
    expect(windStrength(RIGHT, { x: 100 + WIND_RANGE + 1, y: 200 })).toBe(0)
  })
  it('fades smoothly toward the edges of the cone and the far end of its reach', () => {
    const edge = coneHalfWidth(100)
    const across = [0.5, 0.65, 0.8, 0.95].map((fraction) => windStrength(RIGHT, { x: 200, y: 200 + edge * fraction }))
    expect(across[0]).toBe(1)
    expect(across[1]).toBeLessThan(across[0])
    expect(across[2]).toBeLessThan(across[1])
    expect(across[3]).toBeLessThan(across[2])
    expect(across[3]).toBeGreaterThan(0)
    const along = [150, 190, 230, 265].map((distance) => windStrength(RIGHT, { x: 100 + distance, y: 200 }))
    expect(along[0]).toBe(1)
    expect(along[1]).toBeLessThan(1)
    expect(along[2]).toBeLessThan(along[1])
    expect(along[3]).toBeLessThan(along[2])
    expect(along[3]).toBeGreaterThan(0)
    const mouth = windStrength(RIGHT, { x: 100, y: 200 })
    expect(mouth).toBeGreaterThan(0)
    expect(mouth).toBeLessThan(1)
  })
  it('follows the direction of the jet, whichever way it points', () => {
    const down: AirJet = { nozzle: { x: 100, y: 100 }, direction: { x: 0, y: 1 } }
    expect(windStrength(down, { x: 100, y: 200 })).toBe(1)
    expect(windStrength(down, { x: 100, y: 40 })).toBe(0)
    expect(windStrength(down, { x: 240, y: 200 })).toBe(0)
    const left: AirJet = { nozzle: { x: 400, y: 200 }, direction: { x: -1, y: 0 } }
    expect(windStrength(left, { x: 300, y: 200 })).toBe(1)
    expect(windStrength(left, { x: 450, y: 200 })).toBe(0)
    const slanted: AirJet = { nozzle: { x: 0, y: 0 }, direction: { x: 0.6, y: 0.8 } }
    expect(windStrength(slanted, { x: 90, y: 120 })).toBe(1)
    expect(windStrength(slanted, { x: 150, y: 0 })).toBe(0)
  })
})

describe('measuring a strand for the wind', () => {
  it('records the resting segments once', () => {
    const points = strandPoints(createLook('mochi').hair[STRAND], STRAND)
    const chain = windChain(points, 1, STRAND)
    expect(chain.lengths).toHaveLength(HAIR_POINTS)
    expect(chain.angles).toHaveLength(HAIR_POINTS)
    expect(chain.directions).toHaveLength(HAIR_POINTS)
    expect(chain.headOn).toHaveLength(HAIR_POINTS)
    chain.lengths.forEach((length, i) => expect(length).toBeCloseTo(Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y), 10))
    chain.directions.forEach((direction) => expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 10))
  })
  it('gives neighbouring strands their own flapping so they do not move in step', () => {
    const points = strandPoints(createLook('mochi').hair[STRAND], STRAND)
    const phases = new Set([1, 2, 3, 4, 5].map((seed) => windChain(points, 1, seed).phase))
    expect(phases.size).toBe(5)
    expect(windChain(points, 1, 1).rate).not.toBe(windChain(points, 1, 2).rate)
  })
  it('copes with a strand that has no length at all', () => {
    const flat = windChain(Array.from({ length: HAIR_POINTS + 1 }, () => ({ x: 250, y: 200 })), 1, 0)
    expect(flat.lengths.every((length) => length === 0)).toBe(true)
    const offsets = bendInWind(flat, 1, fill(1), { time: 0.3, strength: fill(1) })
    expect(offsets.every((value) => value === 0)).toBe(true)
  })
})

describe('bending hair in the wind', () => {
  const points = strandPoints(createLook('mochi').hair[STRAND], STRAND)
  const chain = windChain(points, 1, STRAND)

  it('leaves resting hair exactly where it is', () => {
    const offsets = bendInWind(chain, 0, fill(0))
    expect(offsets).toHaveLength(HAIR_SHAPE_LENGTH)
    expect(offsets.every((value) => value === 0)).toBe(true)
  })
  it('keeps the root fixed and every segment its length, however hard it blows', () => {
    for (const lean of [0.2, 0.6, 1]) {
      for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.4]) {
        const offsets = bendInWind(chain, heading, fill(lean))
        expect(offsets.every(Number.isFinite)).toBe(true)
        const pose = bent(points, offsets)
        expect(pose[0]).toEqual(points[0])
        segmentLengths(pose).forEach((length, i) => expect(length).toBeCloseTo(chain.lengths[i], 9))
      }
    }
  })
  it('streams the free end of the hair out along the wind while the part by the scalp gives less', () => {
    const heading = 0
    const pose = bent(points, bendInWind(chain, heading, fill(1)))
    for (let step = 17; step <= HAIR_POINTS; step++) expect(Math.cos(segmentAngle(pose, step) - heading)).toBeCloseTo(1, 9)
    const rootTurn = Math.abs(wrapAngle(segmentAngle(pose, 1) - chain.angles[0]))
    const tipTurn = Math.abs(wrapAngle(segmentAngle(pose, HAIR_POINTS) - chain.angles[HAIR_POINTS - 1]))
    expect(rootTurn).toBeGreaterThan(0)
    expect(rootTurn).toBeLessThan(tipTurn * 0.6)
  })
  it('bends only the points the air has reached', () => {
    const lean = fill(0).map((_, slot) => (slot >= 12 ? 1 : 0))
    const offsets = bendInWind(chain, 0, lean)
    for (let slot = 0; slot < 11 * 2; slot++) expect(offsets[slot]).toBe(0)
    expect(Math.hypot(offsets[HAIR_SHAPE_LENGTH - 2], offsets[HAIR_SHAPE_LENGTH - 1])).toBeGreaterThan(10)
  })
  it('folds rising hair the wind meets head-on away from the middle of the head', () => {
    const down = Math.PI / 2
    const rightLock = straightLock(300, 1)
    const leftLock = straightLock(200, 1)
    const right = bent(rightLock, bendInWind(windChain(rightLock, 1, 0), down, fill(1)))
    const left = bent(leftLock, bendInWind(windChain(leftLock, -1, 0), down, fill(1)))
    expect(right[12].x).toBeGreaterThan(300 + 10)
    expect(left[12].x).toBeLessThan(200 - 10)
    right.forEach((point, step) => {
      expect(point.x - 300).toBeCloseTo(200 - left[step].x, 9)
      expect(point.y).toBeCloseTo(left[step].y, 9)
    })
    expect(segmentAngle(right, HAIR_POINTS)).toBeCloseTo(down, 9)
    expect(segmentAngle(left, HAIR_POINTS)).toBeCloseTo(down, 9)
  })
  it('folds hanging hair the wind meets head-on away from the middle of the head too', () => {
    const up = -Math.PI / 2
    const rightLock = straightLock(300, -1)
    const leftLock = straightLock(200, -1)
    const right = bent(rightLock, bendInWind(windChain(rightLock, 1, 0), up, fill(1)))
    const left = bent(leftLock, bendInWind(windChain(leftLock, -1, 0), up, fill(1)))
    expect(right[12].x).toBeGreaterThan(300 + 10)
    expect(left[12].x).toBeLessThan(200 - 10)
    expect(Math.cos(segmentAngle(right, HAIR_POINTS) - up)).toBeCloseTo(1, 9)
  })
  it('flaps harder toward the tip, and only as hard as the air hitting it', () => {
    const flapping = (strength: number, time: number, step = HAIR_POINTS) => {
      const offsets = bendInWind(chain, 0, fill(0), { time, strength: fill(strength) })
      return Math.hypot(offsets[(step - 1) * 2], offsets[(step - 1) * 2 + 1])
    }
    expect(times.every((time) => flapping(0, time) === 0)).toBe(true)
    const full = Math.max(...times.map((time) => flapping(1, time)))
    expect(full).toBeGreaterThan(10)
    expect(Math.max(...times.map((time) => flapping(0.25, time)))).toBeLessThan(full * 0.5)
    expect(Math.max(...times.map((time) => flapping(1, time, 4)))).toBeLessThan(full * 0.25)
    const swings = new Set(times.map((time) => Math.round(flapping(1, time) * 1000)))
    expect(swings.size).toBeGreaterThan(20)
  })
  it('keeps flapping hair the same length, with the root fixed', () => {
    for (const time of times) {
      const pose = bent(points, bendInWind(chain, 0.8, fill(0.7), { time, strength: fill(0.9) }))
      expect(pose[0]).toEqual(points[0])
      segmentLengths(pose).forEach((length, i) => expect(length).toBeCloseTo(chain.lengths[i], 9))
    }
  })
  it('adds nothing for flapping that has died away, and the lean alone still bends the hair', () => {
    const steady = bendInWind(chain, 0.3, fill(0.6))
    expect(bendInWind(chain, 0.3, fill(0.6), { time: 2, strength: fill(0) })).toEqual(steady)
    expect(tipReach(steady)).toBeGreaterThan(5)
  })
})
