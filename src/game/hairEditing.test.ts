import { describe, expect, it } from 'vitest'
import { cutHairStroke, HairGrowth } from './hairEditing'
import { strandPoints } from './hair'
import { applyHairLengths, createLook } from './model'
import type { Look } from './model'

function hold(growth: HairGrowth, look: Look, from: number, to: number, fps = 60): Look {
  const frames = Math.round((to - from) / 1000 * fps)
  let next = look
  for (let frame = 1; frame <= frames; frame++) {
    next = applyHairLengths(next, growth.hold(next, from + (to - from) * frame / frames))
  }
  return next
}

describe('position-based scissors', () => {
  it('cuts only crossed locks to the finger line, and can cut them again lower down', () => {
    const original = createLook('mochi')
    const first = applyHairLengths(original, cutHairStroke(original, { x: 215, y: 140 }, { x: 285, y: 140 }))
    expect(strandPoints(first.hair[5], 5).at(-1)?.y).toBeCloseTo(140)
    expect(first.hair[0]).toBe(original.hair[0])
    expect(first.hair[12]).toBe(original.hair[12])
    const second = applyHairLengths(first, cutHairStroke(first, { x: 285, y: 140 }, { x: 250, y: 150 }))
    expect(second.hair[5].length).toBeLessThan(first.hair[5].length)
    expect(strandPoints(second.hair[5], 5).at(-1)?.y).toBeGreaterThan(145)
  })

  it('does not keep shortening under a stationary finger or regrow hair on a higher pass', () => {
    const point = { x: 257, y: 140 }
    const original = createLook('mochi')
    const cut = applyHairLengths(original, cutHairStroke(original, point, point))
    expect(cut).not.toBe(original)
    expect(applyHairLengths(cut, cutHairStroke(cut, point, point))).toBe(cut)
    const higher = applyHairLengths(cut, cutHairStroke(cut, { x: 240, y: 120 }, { x: 280, y: 120 }))
    expect(higher.hair.every((strand, index) => strand.length <= cut.hair[index].length)).toBe(true)
  })

  it('cuts downward-growing side locks correctly and leaves room/face strokes alone', () => {
    const original = createLook('mochi')
    const side = applyHairLengths(original, cutHairStroke(original, { x: 330, y: 250 }, { x: 355, y: 250 }))
    expect(strandPoints(side.hair[12], 12).at(-1)?.y).toBeCloseTo(250)
    expect(side.hair[5]).toBe(original.hair[5])
    expect(cutHairStroke(original, { x: 220, y: 315 }, { x: 280, y: 315 })).toEqual([])
    expect(cutHairStroke(original, { x: 0, y: 0 }, { x: 30, y: 30 })).toEqual([])
  })
  it.each([
    { index: 5, bendX: 60, bendY: -50 },
    { index: 5, bendX: 60, bendY: 85 },
    { index: 12, bendX: -30, bendY: 40 },
  ])('cuts a saved bent lock at the displayed contact, including folds: %o', ({ index, bendX, bendY }) => {
    const original = createLook('mochi')
    original.hair[index] = { ...original.hair[index], bendX, bendY, soapy: true }
    const contact = strandPoints(original.hair[index], index)[18]
    const cut = applyHairLengths(original, cutHairStroke(original, contact, contact))
    expect(cut.hair[index].length).toBeLessThan(original.hair[index].length)
    expect(strandPoints(cut.hair[index], index)[24].y).toBeCloseTo(contact.y, 6)
    expect(cut.hair[index].soapy).toBe(true)
    expect(applyHairLengths(cut, cutHairStroke(cut, contact, contact))).toBe(cut)
    expect(original.hair[index]).toMatchObject({ bendX, bendY })
  })
  it.each([
    { index: 5, bendY: undefined },
    { index: 5, bendY: 40 },
    { index: 12, bendY: -30 },
  ])('cuts brushed hair at the displayed contact and trims its pose with it: %o', ({ index, bendY }) => {
    const original = createLook('mochi')
    const shape = Array.from({ length: 48 }, (_, slot) => {
      const step = (slot >> 1) + 1
      return slot % 2 === 0 ? Math.sin(step / 5) * 18 : Math.sin(step / 7) * 9
    })
    original.hair[index] = { ...original.hair[index], shape, ...(bendY === undefined ? {} : { bendY }) }
    const contact = strandPoints(original.hair[index], index)[17]
    const cut = applyHairLengths(original, cutHairStroke(original, contact, contact))
    expect(cut.hair[index].length).toBeLessThan(original.hair[index].length)
    expect(cut.hair[index].shape).toHaveLength(48)
    expect(cut.hair[index].shape).not.toEqual(shape)
    expect(strandPoints(cut.hair[index], index)[24].y).toBeCloseTo(contact.y, 6)
    expect(applyHairLengths(cut, cutHairStroke(cut, contact, contact))).toBe(cut)
    expect(original.hair[index].shape).toBe(shape)
  })
})

describe('hold-to-grow', () => {
  it('keeps a hold alive when the first frame timestamp is equal to or before pointer-down', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 100)
    expect(growth.hold(original, 100)).toEqual([])
    expect(growth.hold(original, 98)).toEqual([])
    expect(growth.canGrow(original)).toBe(true)
    const next = applyHairLengths(original, growth.hold(original, 116))
    expect(next.hair[5].length - original.hair[5].length).toBeCloseTo(0.24 * 0.016)
    growth.stop()
    expect(growth.canGrow(next)).toBe(false)
  })

  it('keeps growing the held area without movement, independent of frame rate', () => {
    const original = createLook('mochi')
    const point = strandPoints(original.hair[5], 5)[15]
    for (const fps of [30, 60, 120]) {
      const growth = new HairGrowth(original, point, 0)
      const first = hold(growth, original, 0, 500, fps)
      const second = hold(growth, first, 500, 1000, fps)
      expect(first.hair[5].length - original.hair[5].length).toBeCloseTo(0.12, 6)
      expect(second.hair[5].length - original.hair[5].length).toBeCloseTo(0.24, 6)
      expect(second.hair[0]).toBe(original.hair[0])
    }
  })

  it('moves growth to the new finger area and stops growing abandoned locks', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 0)
    const first = hold(growth, original, 0, 500)
    growth.move(first, strandPoints(first.hair[12], 12)[10], 500)
    const second = hold(growth, first, 500, 1000)
    expect(second.hair[5].length).toBe(first.hair[5].length)
    expect(second.hair[12].length - first.hair[12].length).toBeCloseTo(0.12)
    growth.move(second, { x: 0, y: 0 }, 1000)
    expect(hold(growth, second, 1000, 1500)).toBe(second)
  })

  it('catches locks crossed between move events without repeating time already applied by frames', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, { x: 120, y: 155 }, 0)
    const swept = applyHairLengths(original, growth.move(original, { x: 420, y: 155 }, 40))
    expect(swept.hair[5].length).toBeGreaterThan(original.hair[5].length)
    expect(growth.hold(swept, 40)).toEqual([])
    expect(growth.hold(swept, 80)).toEqual([])
  })

  it('stops immediately on release/cancellation and does nothing when holding off hair', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 0)
    const first = hold(growth, original, 0, 200)
    growth.stop()
    expect(hold(growth, first, 200, 700)).toBe(first)
    expect(growth.move(first, strandPoints(first.hair[5], 5)[10], 750)).toEqual([])
    const empty = new HairGrowth(original, { x: 250, y: 315 }, 0)
    expect(hold(empty, original, 0, 1000)).toBe(original)
  })

  it('caps maximum length and avoids a huge growth jump after a stalled frame', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 0)
    const stalled = applyHairLengths(original, growth.hold(original, 5000))
    expect(stalled.hair[5].length - original.hair[5].length).toBeCloseTo(0.012)
    const full = hold(growth, stalled, 5000, 10000)
    expect(full.hair[5].length).toBe(1)
    expect(growth.hold(full, 10020)).toEqual([])
    const almostFull = { ...full, hair: full.hair.map((strand, index) => ({ ...strand, length: index === 5 ? 0.9999999 : 1 })) }
    const lastBit = new HairGrowth(almostFull, strandPoints(almostFull.hair[5], 5)[15], 0)
    const finished = applyHairLengths(almostFull, lastBit.hold(almostFull, 16))
    expect(finished.hair[5].length).toBe(1)
    expect(lastBit.canGrow(finished)).toBe(false)
  })
})
