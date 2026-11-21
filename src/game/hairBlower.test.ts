import { describe, expect, it } from 'vitest'
import { HairBlower } from './hairBlower'
import { strandPoints } from './hair'
import { applyHairAir, createLook } from './model'
import type { Look } from './model'

function wetLook(): Look {
  const look = createLook('mochi')
  return { ...look, hair: look.hair.map((strand) => ({ ...strand, wetness: 1, soapy: true })) }
}

function hold(blower: HairBlower, look: Look, from: number, to: number, fps = 60): Look {
  const frames = Math.round((to - from) / 1000 * fps)
  let next = look
  for (let i = 1; i <= frames; i++) next = applyHairAir(next, blower.hold(next, from + (to - from) * i / frames))
  return next
}

describe('continuous hair dryer', () => {
  it('gradually dries and blows held hair, without removing soap or changing untouched strands', () => {
    const original = wetLook()
    const blower = new HairBlower(original, strandPoints(original.hair[5], 5)[14], 0)
    const first = hold(blower, original, 0, 500)
    const second = hold(blower, first, 500, 1000)
    expect(first.hair[5].wetness).toBeCloseTo(0.675)
    expect(second.hair[5].wetness).toBeCloseTo(0.35)
    expect(second.hair[5].bendY).toBeLessThan(-30)
    expect(second.hair[5].soapy).toBe(true)
    expect(second.hair[5].length).toBe(original.hair[5].length)
    expect(second.hair[0]).toBe(original.hair[0])
    expect(blower.isBlowing()).toBe(true)
  })
  it('gives matching drying and movement at 30, 60 and 120 frames per second', () => {
    const original = wetLook()
    const results = [30, 60, 120].map((fps) => {
      const blower = new HairBlower(original, strandPoints(original.hair[5], 5)[14], 0)
      return hold(blower, original, 0, 1000, fps).hair[5]
    })
    for (const strand of results) {
      expect(strand.wetness).toBeCloseTo(results[0].wetness!, 8)
      expect(strand.bendX).toBeCloseTo(results[0].bendX!, 8)
      expect(strand.bendY).toBeCloseTo(results[0].bendY!, 8)
    }
  })
  it('moves airflow to a new area and leaves the previous blown shape in place', () => {
    const original = wetLook()
    const blower = new HairBlower(original, strandPoints(original.hair[5], 5)[14], 0)
    const first = hold(blower, original, 0, 500)
    blower.move(first, strandPoints(first.hair[12], 12)[20], 500)
    const second = hold(blower, first, 500, 1000)
    expect(second.hair[5]).toBe(first.hair[5])
    expect(second.hair[12].wetness).toBeLessThan(first.hair[12].wetness!)
    blower.stop()
    expect(blower.hold(second, 2000)).toEqual([])
    expect(blower.isBlowing()).toBe(false)
  })
  it('blows hair in opposite directions when aimed from opposite sides', () => {
    const original = wetLook()
    const tip = strandPoints(original.hair[5], 5)[24]
    const left = new HairBlower(original, { x: tip.x - 35, y: tip.y + 15 }, 0, true)
    const right = new HairBlower(original, { x: tip.x + 35, y: tip.y + 15 }, 0, true)
    expect(hold(left, original, 0, 400).hair[5].bendX).toBeGreaterThan(15)
    expect(hold(right, original, 0, 400).hair[5].bendX).toBeLessThan(-15)
  })
  it('handles early frames and pauses, fully dries hair, and bounds long-held wind', () => {
    const original = wetLook()
    const blower = new HairBlower(original, strandPoints(original.hair[5], 5)[14], 100)
    expect(blower.hold(original, 90)).toEqual([])
    expect(blower.isBlowing()).toBe(true)
    const stalled = applyHairAir(original, blower.hold(original, 10100))
    expect(stalled.hair[5].wetness).toBeCloseTo(0.9675)
    const dried = hold(blower, stalled, 10100, 15100)
    expect(dried.hair[5].wetness).toBe(0)
    expect(dried.hair.every((strand) => (strand.bendX ?? 0) >= -95 && (strand.bendX ?? 0) <= 95
      && (strand.bendY ?? 0) >= -65 && (strand.bendY ?? 0) <= 85)).toBe(true)
    expect(dried.hair[5].soapy).toBe(true)
  })
  it('continues a gentle flutter on dry hair, with no flutter under reduced motion', () => {
    const original = wetLook()
    const point = strandPoints(original.hair[5], 5)[14]
    const windy = new HairBlower(original, point, 0)
    const first = hold(windy, original, 0, 2500)
    const later = hold(windy, first, 2500, 2800)
    expect(later.hair[5].wetness).toBe(0)
    expect(later.hair[5].bendX).not.toBe(first.hair[5].bendX)
    const reduced = new HairBlower(original, point, 0, true)
    const settled = hold(reduced, original, 0, 2500)
    expect(hold(reduced, settled, 2500, 2800)).toBe(settled)
  })
  it('does not edit distant hair when held in the empty room', () => {
    const original = wetLook()
    const blower = new HairBlower(original, { x: 20, y: 400 }, 0)
    expect(blower.isBlowing()).toBe(false)
    expect(hold(blower, original, 0, 1000)).toBe(original)
  })
})
