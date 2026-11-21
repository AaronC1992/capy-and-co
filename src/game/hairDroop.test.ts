import { describe, expect, it } from 'vitest'
import { strandPoints } from './hair'
import type { Point } from './hair'
import { droopChain, droopOffsets, soakedOffsets } from './hairDroop'
import { HAIR_CENTER_X, HAIR_POINTS, HAIR_SHAPE_LENGTH } from './hairLayout'
import { headClearance } from './headShape'
import { createLook, STRAND_COUNT } from './model'

const look = createLook('mochi')
const restOf = (index: number) => strandPoints(look.hair[index], index)
const leaned = (value: number) => new Array<number>(HAIR_POINTS).fill(value)
const lift = (points: Point[], offsets: number[]) => points.map((point, step) => (step === 0 ? point : { x: point.x + offsets[(step - 1) * 2], y: point.y + offsets[(step - 1) * 2 + 1] }))
const hung = (index: number, lean = 1) => lift(restOf(index), droopOffsets(droopChain(restOf(index)), leaned(lean)))
const segment = (points: Point[], step: number) => Math.hypot(points[step].x - points[step - 1].x, points[step].y - points[step - 1].y)
// Which way the end of the strand points, in degrees: 90 is straight down.
const endAngle = (points: Point[]) => Math.atan2(points[24].y - points[21].y, points[24].x - points[21].x) * 180 / Math.PI

describe('wet hair drooping', () => {
  it('leaves dry hair exactly where it is', () => {
    expect(droopOffsets(droopChain(restOf(5)), leaned(0))).toEqual(new Array(HAIR_SHAPE_LENGTH).fill(0))
  })
  it('keeps the root where it is and every part of the strand the same length, however wet', () => {
    for (const index of [0, 5, 13, 24, 31, 44, 63]) {
      const rest = restOf(index)
      for (const lean of [0.3, 0.7, 1]) {
        const wet = hung(index, lean)
        expect(wet[0]).toEqual(rest[0])
        for (let step = 1; step <= HAIR_POINTS; step++) expect(segment(wet, step)).toBeCloseTo(segment(rest, step), 6)
      }
    }
  })
  it('lets the hair on the sides of the head hang straight down', () => {
    for (const index of [11, 24, 37, 12, 25, 38]) expect(Math.abs(endAngle(hung(index)) - 90), `strand ${index}`).toBeLessThan(25)
  })
  it('drops hair from the left of the head down the left and hair from the right down the right', () => {
    for (let index = 0; index < STRAND_COUNT; index++) {
      const rest = restOf(index)
      const wet = hung(index)
      if (rest[0].x < HAIR_CENTER_X) expect(wet[24].x, `strand ${index}`).toBeLessThan(rest[0].x)
      else expect(wet[24].x, `strand ${index}`).toBeGreaterThan(rest[0].x)
    }
  })
  it('lets hair from the top of the head flop over it and hang below the crown', () => {
    for (const index of [2, 8, 15, 21]) {
      const wet = hung(index)
      expect(wet[24].y, `strand ${index}`).toBeGreaterThan(wet[0].y + 40)
    }
  })
  it('keeps hair from sinking into the head, past where it started or a thin gap above the fur', () => {
    const GAP = 2.5
    for (let index = 0; index < STRAND_COUNT; index++) {
      const clearance = (points: Point[]) => points.map((point) => headClearance(point.x, point.y))
      const before = clearance(restOf(index))
      const after = clearance(hung(index))
      expect(Math.min(...after.slice(1)), `strand ${index}`).toBeGreaterThanOrEqual(Math.min(...before, GAP) - 1)
      expect(after[HAIR_POINTS], `strand ${index} tip`).toBeGreaterThanOrEqual(Math.min(before[HAIR_POINTS], GAP) - 1.5)
    }
  })
  it('moves a little at a time as the water soaks in', () => {
    const chain = droopChain(restOf(5))
    let previous = droopOffsets(chain, leaned(0))
    for (let step = 1; step <= 100; step++) {
      const next = droopOffsets(chain, leaned(step / 100))
      next.forEach((value, slot) => expect(Math.abs(value - previous[slot])).toBeLessThan(4))
      previous = next
    }
  })
  it('leaves the part of the strand the water has not reached where it was', () => {
    const lean = Array.from({ length: HAIR_POINTS }, (_, slot) => (slot < 12 ? 0 : 1))
    const offsets = droopOffsets(droopChain(restOf(5)), lean)
    expect(offsets.slice(0, 24).every((value) => value === 0)).toBe(true)
    expect(Math.hypot(offsets[46], offsets[47])).toBeGreaterThan(20)
  })
  it('soaks a whole strand at once the same way as fully wet hair', () => {
    expect(soakedOffsets(restOf(7))).toEqual(droopOffsets(droopChain(restOf(7)), leaned(1)))
  })
})
