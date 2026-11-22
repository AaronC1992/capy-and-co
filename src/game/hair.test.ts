import { describe, expect, it } from 'vitest'
import { closestPointOnStroke, CURL_DENSITY, curlyPoints, drawStrand, hitHair, hitHairStroke, PATH_TOLERANCE, strandPath, strandPoints, touchStrands } from './hair'
import type { Point } from './hair'
import { HAIR_POINTS, MIN_LENGTH } from './hairLayout'
import type { HairShape } from './hairLayout'
import { createLook } from './model'

const STRAND = 5
const strand = () => createLook('mochi').hair[STRAND]
const curly = (curl: number) => ({ ...strand(), curl })

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

// How far a drawn curl strays from the strand's own line.
function widestSway(amount: number): number {
  const points = strandPoints(strand(), STRAND)
  return Math.max(...curlyPoints(points, amount, STRAND).map((point) => Math.min(...points.slice(1).map((end, i) => {
    const closest = closestPointOnStroke(point, points[i], end)
    return Math.hypot(point.x - closest.x, point.y - closest.y)
  }))))
}

// How many drawn steps run back towards the root, which only happens once the hair loops.
function stepsBack(line: readonly Point[]): number {
  const dx = line[line.length - 1].x - line[0].x
  const dy = line[line.length - 1].y - line[0].y
  return line.slice(1).filter((point, i) => (point.x - line[i].x) * dx + (point.y - line[i].y) * dy < 0).length
}

describe('painting a strand', () => {
  it('draws a curl through finer points than straight hair so it stays round', () => {
    expect(drawn(strandPath(curly(1), STRAND))).toHaveLength(HAIR_POINTS * CURL_DENSITY + 1)
    expect(drawn(strandPath(curly(0.01), STRAND)).length).toBeGreaterThan(HAIR_POINTS)
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

describe('painting curls', () => {
  it('draws curls around the strand without moving the strand itself, so every tool still finds it', () => {
    expect(strandPoints(curly(1), STRAND)).toEqual(strandPoints(strand(), STRAND))
    expect(drawStrand(strand(), STRAND, strandPoints(strand(), STRAND)).stride).toBe(1)
  })
  it('keeps the root on the scalp and lets the strand\'s own points be found on the drawn curl', () => {
    const points = strandPoints(strand(), STRAND)
    const { line, stride } = drawStrand(curly(1), STRAND, points)
    expect(stride).toBe(CURL_DENSITY)
    expect(line[0]).toEqual(points[0])
    for (let step = 0; step <= HAIR_POINTS; step += 1) {
      expect(Math.hypot(line[step * stride].x - points[step].x, line[step * stride].y - points[step].y)).toBeLessThanOrEqual(10.6)
    }
  })
  it('curls more and more as the amount grows, from a wave to tight ringlets', () => {
    const sways = [0.1, 0.3, 0.6, 1].map(widestSway)
    sways.slice(1).forEach((sway, i) => expect(sway).toBeGreaterThan(sways[i] + 0.5))
    expect(sways[0]).toBeGreaterThan(2)
    expect(sways[3]).toBeGreaterThan(8)
    expect(sways[3]).toBeLessThanOrEqual(10.6)
  })
  it('only loops back on itself once the hair is properly curly', () => {
    const points = strandPoints(strand(), STRAND)
    expect(stepsBack(curlyPoints(points, 0.2, STRAND))).toBe(0)
    expect(stepsBack(curlyPoints(points, 1, STRAND))).toBeGreaterThan(10)
  })
  it('puts neighbouring strands out of step, so a head of curls does not line up in rows', () => {
    const points = strandPoints(strand(), STRAND)
    const first = curlyPoints(points, 0.8, 0)
    const second = curlyPoints(points, 0.8, 1)
    expect(Math.hypot(first[40].x - second[40].x, first[40].y - second[40].y)).toBeGreaterThan(2)
  })
  it('curls the same way every time for the same strand, so it does not shimmer as it is redrawn', () => {
    const points = strandPoints(strand(), STRAND)
    expect(curlyPoints(points, 0.7, STRAND)).toEqual(curlyPoints(points, 0.7, STRAND))
  })
})

describe('hair under a finger', () => {
  it('finds hair along the whole stroke but never shaved scalp, which only growing can reach', () => {
    const look = createLook('mochi')
    look.hair[STRAND] = { length: MIN_LENGTH, color: '#eb9c95', curl: 0, flow: 0.3 }
    const root = strandPoints(look.hair[STRAND], STRAND)[0]
    expect(touchStrands(look, root, root)).toContain(STRAND)
    expect(hitHairStroke(look, root, root)).not.toContain(STRAND)
    expect(hitHair(look, root)).not.toContain(STRAND)
    expect(hitHair(look, root)).toContain(STRAND + 1)
  })
})
