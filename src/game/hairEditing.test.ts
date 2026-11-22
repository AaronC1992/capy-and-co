import { describe, expect, it } from 'vitest'
import { cutHairStroke, GROWTH_PER_SECOND, HairGrowth } from './hairEditing'
import { strandPoints } from './hair'
import { BALD_REACH, isBald, MAX_LENGTH, MIN_LENGTH, strandReach } from './hairLayout'
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

// A look whose strand `index` has been shaved down to the scalp.
function shaved(index: number, source: Look = createLook('mochi')): Look {
  return applyHairLengths(source, [{ index, length: MIN_LENGTH }])
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

  it('cuts floor-length hair right where the scissors cross the falling lock, once', () => {
    const original = createLook('mochi')
    const long = applyHairLengths(original, original.hair.map((_, index) => ({ index, length: MAX_LENGTH })))
    const contact = strandPoints(long.hair[0], 0)[16]
    const stroke = [{ x: contact.x - 12, y: contact.y }, { x: contact.x + 12, y: contact.y }] as const
    const cut = applyHairLengths(long, cutHairStroke(long, ...stroke))
    expect(cut.hair[0].length).toBeLessThan(MAX_LENGTH)
    expect(cut.hair[0].length).toBeGreaterThan(1)
    const tip = strandPoints(cut.hair[0], 0)[24]
    expect(Math.hypot(tip.x - contact.x, tip.y - contact.y)).toBeLessThan(2)
    expect(cut.hair[5]).toBe(long.hair[5])
    expect(applyHairLengths(cut, cutHairStroke(cut, ...stroke))).toBe(cut)
  })

  it('cuts floor-length hair back to standing hair when the scissors cross it above the head', () => {
    const original = createLook('mochi')
    const long = applyHairLengths(original, original.hair.map((_, index) => ({ index, length: MAX_LENGTH })))
    const contact = strandPoints(long.hair[5], 5)[4]
    const cut = applyHairLengths(long, cutHairStroke(long, { x: contact.x - 6, y: contact.y }, { x: contact.x + 6, y: contact.y }))
    expect(cut.hair[5].length).toBeLessThan(1)
    expect(Math.abs(strandPoints(cut.hair[5], 5)[24].y - contact.y)).toBeLessThan(2)
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

describe('cutting down to the scalp', () => {
  const root = (look: Look, index = 5) => strandPoints(look.hair[index], index)[0]
  const above = (point: { x: number; y: number }, distance: number) => ({ x: point.x, y: point.y - distance })

  it('shaves a lock bald when the cut is made at the roots', () => {
    const original = createLook('mochi')
    const edits = cutHairStroke(original, root(original), root(original))
    expect(edits.find(({ index }) => index === 5)).toEqual({ index: 5, length: MIN_LENGTH })
    const cut = applyHairLengths(original, edits)
    expect(isBald(cut.hair[5].length)).toBe(true)
    expect(cut.hair[5]).toEqual({ length: MIN_LENGTH, color: original.hair[5].color, curl: 0, flow: original.hair[5].flow })
  })

  it('takes the whole lock when only a tiny tuft would be left, so a close shave is easy', () => {
    const original = createLook('mochi')
    const close = cutHairStroke(original, above(root(original), BALD_REACH - 3), above(root(original), BALD_REACH - 3))
    expect(close.find(({ index }) => index === 5)).toEqual({ index: 5, length: MIN_LENGTH })
  })

  it('leaves stubble when the cut keeps enough hair to see', () => {
    const original = createLook('mochi')
    const edits = cutHairStroke(original, above(root(original), BALD_REACH + 8), above(root(original), BALD_REACH + 8))
    const stubble = edits.find(({ index }) => index === 5)!
    expect(stubble.length).toBeGreaterThan(MIN_LENGTH)
    expect(strandReach(stubble.length, 5)).toBeGreaterThan(BALD_REACH)
    expect(isBald(applyHairLengths(original, edits).hair[5].length)).toBe(false)
  })

  it('clears the brushed pose, curls, soap and water of a lock it shaves', () => {
    const original = createLook('mochi')
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 10 : -5))
    original.hair[5] = { ...original.hair[5], shape, curl: 0.8, soapy: true, wetness: 1, bendX: 20, bendY: 10 }
    const cut = applyHairLengths(original, cutHairStroke(original, root(original), root(original)))
    expect(cut.hair[5]).toEqual({ length: MIN_LENGTH, color: original.hair[5].color, curl: 0, flow: original.hair[5].flow })
  })

  it('has nothing left to cut on a bald lock', () => {
    const bald = shaved(5)
    expect(cutHairStroke(bald, root(bald), root(bald)).some(({ index }) => index === 5)).toBe(false)
  })

  it('can shave a stroke of hair in one drag', () => {
    const original = createLook('mochi')
    const along = cutHairStroke(original, { x: root(original, 3).x - 60, y: root(original, 3).y }, { x: root(original, 3).x + 60, y: root(original, 3).y })
    const cut = applyHairLengths(original, along)
    expect(cut.hair.filter((strand) => isBald(strand.length)).length).toBeGreaterThan(3)
    expect(cut.hair.some((strand) => !isBald(strand.length))).toBe(true)
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
    expect(next.hair[5].length - original.hair[5].length).toBeCloseTo(GROWTH_PER_SECOND * 0.016, 6)
    growth.stop()
    expect(growth.canGrow(next)).toBe(false)
  })

  it('keeps growing the held area without movement, independent of frame rate', () => {
    const original = createLook('mochi')
    const point = strandPoints(original.hair[5], 5)[15]
    for (const fps of [30, 60, 120]) {
      const growth = new HairGrowth(original, point, 0)
      const first = hold(growth, original, 0, 200, fps)
      const second = hold(growth, first, 200, 400, fps)
      expect(first.hair[5].length - original.hair[5].length).toBeCloseTo(GROWTH_PER_SECOND * 0.2, 6)
      expect(second.hair[5].length - original.hair[5].length).toBeCloseTo(GROWTH_PER_SECOND * 0.4, 6)
      expect(second.hair[0]).toBe(original.hair[0])
    }
  })

  it('grows quickly enough that a held finger brings hair to full height in a second and to the floor in a few more', () => {
    expect(GROWTH_PER_SECOND).toBeGreaterThanOrEqual(0.4)
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 0)
    const standing = hold(growth, original, 0, 1000)
    expect(standing.hair[5].length).toBeGreaterThanOrEqual(1)
    expect(hold(growth, standing, 1000, 6000).hair[5].length).toBe(MAX_LENGTH)
  })

  it('moves growth to the new finger area and stops growing abandoned locks', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, strandPoints(original.hair[5], 5)[15], 0)
    const first = hold(growth, original, 0, 300)
    growth.move(first, strandPoints(first.hair[12], 12)[10], 300)
    const second = hold(growth, first, 300, 600)
    expect(second.hair[5].length).toBe(first.hair[5].length)
    expect(second.hair[12].length - first.hair[12].length).toBeCloseTo(GROWTH_PER_SECOND * 0.3, 6)
    growth.move(second, { x: 0, y: 0 }, 600)
    expect(hold(growth, second, 600, 1100)).toBe(second)
  })

  it('catches locks crossed between move events without repeating time already applied by frames', () => {
    const original = createLook('mochi')
    const growth = new HairGrowth(original, { x: 120, y: 155 }, 0)
    const swept = applyHairLengths(original, growth.move(original, { x: 420, y: 155 }, 40))
    expect(swept.hair[5].length).toBeGreaterThan(original.hair[5].length)
    expect(growth.hold(swept, 40)).toEqual([])
    expect(growth.hold(swept, 80)).toEqual([])
  })

  it('brings shaved scalp back: holding the finger there regrows the lock in its own color', () => {
    const bald = shaved(5)
    expect(isBald(bald.hair[5].length)).toBe(true)
    const point = strandPoints(bald.hair[5], 5)[0]
    const growth = new HairGrowth(bald, point, 0)
    expect(growth.canGrow(bald)).toBe(true)
    const sprouting = hold(growth, bald, 0, 200)
    expect(isBald(sprouting.hair[5].length)).toBe(false)
    expect(sprouting.hair[5].length).toBeCloseTo(MIN_LENGTH + GROWTH_PER_SECOND * 0.2, 6)
    expect(sprouting.hair[5].color).toBe(bald.hair[5].color)
    // From bare scalp to full height in under two seconds of holding, and it keeps on growing.
    const regrown = hold(growth, sprouting, 200, 1900)
    expect(regrown.hair[5].length).toBeGreaterThanOrEqual(1)
    expect(growth.canGrow(regrown)).toBe(true)
    expect(regrown.hair[0]).toBe(bald.hair[0])
  })

  it('catches shaved scalp crossed between move events too', () => {
    const bald = shaved(5)
    const root = strandPoints(bald.hair[5], 5)[0]
    const growth = new HairGrowth(bald, { x: 0, y: 0 }, 0)
    const swept = applyHairLengths(bald, growth.move(bald, root, 40))
    expect(isBald(swept.hair[5].length)).toBe(false)
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
    expect(stalled.hair[5].length - original.hair[5].length).toBeCloseTo(GROWTH_PER_SECOND * 0.05, 6)
    const full = hold(growth, stalled, 5000, 10000)
    expect(full.hair[5].length).toBe(MAX_LENGTH)
    expect(growth.hold(full, 10020)).toEqual([])
    const almostFull = { ...full, hair: full.hair.map((strand, index) => ({ ...strand, length: index === 5 ? MAX_LENGTH - 0.0000001 : MAX_LENGTH })) }
    const lastBit = new HairGrowth(almostFull, strandPoints(almostFull.hair[5], 5)[15], 0)
    const finished = applyHairLengths(almostFull, lastBit.hold(almostFull, 16))
    expect(finished.hair[5].length).toBe(MAX_LENGTH)
    expect(lastBit.canGrow(finished)).toBe(false)
  })
})
