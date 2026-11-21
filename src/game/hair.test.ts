import { describe, expect, it } from 'vitest'
import { closestPointOnStroke, PATH_TOLERANCE, strandPath, strandPoints } from './hair'
import type { Point } from './hair'
import { HAIR_POINTS } from './hairLayout'
import type { HairShape } from './hairLayout'
import { createLook } from './model'

const STRAND = 5
const strand = () => createLook('mochi').hair[STRAND]

function drawn(path: string): Point[] {
  return path.split(' ').map((part) => {
    const [x, y] = part.slice(1).split(',')
    return { x: Number(x), y: Number(y) }
  })
}

// Builds a saved shape from the displacement wanted at each point from 1 to the tip.
function shaped(displacement: (step: number) => Point): HairShape {
  return Array.from({ length: HAIR_POINTS * 2 }, (_, slot) => {
    const { x, y } = displacement((slot >> 1) + 1)
    return slot % 2 === 0 ? x : y
  })
}

// How far the true hair gets from the line that is actually painted.
function widestGap(path: string, points: Point[]): number {
  const line = drawn(path)
  return Math.max(...points.map((point) => Math.min(...line.slice(1).map((end, i) => {
    const closest = closestPointOnStroke(point, line[i], end)
    return Math.hypot(point.x - closest.x, point.y - closest.y)
  }))))
}

describe('painting a strand', () => {
  it('draws every point of a curl, since each one is on a bend', () => {
    expect(drawn(strandPath({ ...strand(), curl: true }, STRAND))).toHaveLength(HAIR_POINTS + 1)
  })
  it('draws plain hair through well under two thirds of its points, always keeping the root and the tip', () => {
    const points = strandPoints(strand(), STRAND)
    const line = drawn(strandPath(strand(), STRAND))
    expect(line.length).toBeLessThan((HAIR_POINTS + 1) * 0.6)
    expect(line[0].x).toBeCloseTo(points[0].x, 1)
    expect(line[0].y).toBeCloseTo(points[0].y, 1)
    expect(line[line.length - 1].x).toBeCloseTo(points[HAIR_POINTS].x, 1)
    expect(line[line.length - 1].y).toBeCloseTo(points[HAIR_POINTS].y, 1)
  })
  it('keeps a point that sticks out of the line even when its neighbours are skipped', () => {
    const spike = shaped((step) => ({ x: step === 7 ? 25 : 0, y: 0 }))
    const points = strandPoints({ ...strand(), shape: spike }, STRAND)
    const line = drawn(strandPath({ ...strand(), shape: spike }, STRAND))
    expect(line.some((point) => Math.hypot(point.x - points[7].x, point.y - points[7].y) < 0.1)).toBe(true)
  })
  it.each([
    ['untouched', undefined],
    ['brushed sideways', shaped((step) => ({ x: 40 * (step / HAIR_POINTS) ** 2, y: 10 * (step / HAIR_POINTS) }))],
    ['zig-zag', shaped((step) => ({ x: step % 2 === 0 ? 8 : -8, y: 0 }))],
    ['hooked at the tip', shaped((step) => ({ x: Math.max(0, step - 17) * 6, y: Math.max(0, step - 17) * -4 }))],
  ])('never strays from the true hair by more than the tolerance (%s)', (_, shape) => {
    const saved = { ...strand(), shape }
    expect(widestGap(strandPath(saved, STRAND), strandPoints(saved, STRAND))).toBeLessThanOrEqual(PATH_TOLERANCE + 0.1)
  })
  it('stays within the tolerance for every strand of a fresh look', () => {
    createLook('mochi').hair.forEach((saved, index) => {
      expect(widestGap(strandPath(saved, index), strandPoints(saved, index))).toBeLessThanOrEqual(PATH_TOLERANCE + 0.1)
    })
  })
})
