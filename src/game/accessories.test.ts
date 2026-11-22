import { describe, expect, it } from 'vitest'
import { canWearAt, CLIP_GRIP, clipAt, clipPosition, clipUnder, HAT_TOPS, hatBase, isWearable, nextClipSpot, usualSpot, wornSpot, wornUnder } from './accessories'
import { applyHairLengths, createLook, STRAND_COUNT } from './model'
import type { Look } from './model'
import { strandPoints } from './hair'
import { MIN_LENGTH } from './hairLayout'
import { headbandY, headTopY } from './hairline'

const allHair = (look: Look, length: number) => applyHairLengths(look, Array.from({ length: STRAND_COUNT }, (_, index) => ({ index, length })))

describe('clips and hats', () => {
  it('clips onto the nearest lock and moves with it, or stays where it was put away from the hair', () => {
    const look = createLook('mochi')
    const lock = strandPoints(look.hair[4], 4)[12]
    const clip = clipAt(look, 'bow', { x: lock.x + 4, y: lock.y })
    expect(clip.strand).toBeDefined()
    const held = clipPosition(look, clip)
    expect(Math.hypot(held.x - lock.x - 4, held.y - lock.y)).toBeLessThan(CLIP_GRIP)
    const grown = allHair(look, 1)
    expect(clipPosition(grown, clip)).toEqual(strandPoints(grown.hair[clip.strand!], clip.strand!)[clip.step!])
    expect(clipPosition(grown, clip)).not.toEqual(held)
    const offsets = []
    offsets[clip.strand!] = Array.from({ length: 48 }, (_, slot) => slot % 2 ? 0 : 15)
    expect(clipPosition(look, clip, offsets).x).toBeCloseTo(held.x + 15)
    expect(clipAt(look, 'daisy', { x: 250, y: 420 })).toEqual({ kind: 'daisy', x: 250, y: 420 })
    expect(clipAt(look, 'star', { x: -30, y: 600.04 })).toEqual({ kind: 'star', x: 0, y: 520 })
    expect(clipAt(allHair(look, MIN_LENGTH), 'heart', lock).strand).toBeUndefined()
  })
  it('can be worn on the hair, face, body and hat, but not out in the salon', () => {
    const look = createLook('biscuit')
    for (const spot of [{ x: 250, y: 262 }, { x: 250, y: 430 }, strandPoints(look.hair[5], 5)[20]]) expect(isWearable(look, spot)).toBe(true)
    for (const spot of [{ x: 20, y: 30 }, { x: 480, y: 500 }, { x: 40, y: 300 }]) expect(isWearable(look, spot)).toBe(false)
    const crown = { x: 250, y: hatBase(look) - 70 }
    expect(isWearable(look, crown)).toBe(false)
    expect(isWearable({ ...look, hat: 'tophat' }, crown)).toBe(true)
  })
  it('sits the hat right on a shaved head and higher up on longer hair', () => {
    const look = createLook('cocoa')
    const shaved = hatBase(allHair(look, MIN_LENGTH))
    expect(shaved).toBeCloseTo(headTopY(250) + 8, 0)
    expect(hatBase(look)).toBeLessThan(shaved)
    expect(hatBase(allHair(look, 1))).toBeLessThan(hatBase(look))
    expect(hatBase(allHair(look, 1))).toBeGreaterThanOrEqual(96)
  })
  it('picks up the clip drawn on top, and puts new clips on free spots', () => {
    const look = createLook('mochi')
    const first = nextClipSpot(look)
    const clipped = { ...look, clips: [clipAt(look, 'bow', first), clipAt(look, 'heart', first)] }
    expect(clipUnder(clipped, first)).toBe(1)
    expect(clipUnder(clipped, { x: 30, y: 500 })).toBe(-1)
    const second = nextClipSpot(clipped)
    expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeGreaterThan(24)
  })
})

describe('moving what is worn', () => {
  const dressed: Look = { ...createLook('mochi'), hat: 'crown', glasses: 'round', headband: 'kitty' }
  it('picks up the hat, then the headband, then the glasses, wherever each one is now', () => {
    const brim = hatBase(dressed)
    expect(wornUnder(dressed, { x: 250, y: brim - 30 })).toBe('hat')
    expect(wornUnder(dressed, { x: 250, y: brim - HAT_TOPS.crown - 20 })).toBeNull()
    expect(wornUnder(dressed, { x: 210, y: headbandY(210) })).toBe('headband')
    expect(wornUnder({ ...dressed, hat: 'none' }, { x: 212, y: headbandY(212) - 40 })).toBe('headband')
    expect(wornUnder(dressed, { x: 198, y: 265 })).toBe('glasses')
    expect(wornUnder(dressed, { x: 250, y: 420 })).toBeNull()
    expect(wornUnder(createLook('mochi'), { x: 198, y: 265 })).toBeNull()
    const moved: Look = { ...dressed, placed: { hat: { x: 380, y: 420 }, glasses: { x: 250, y: 400 }, headband: { x: 120, y: 360 } } }
    expect(wornUnder(moved, { x: 380, y: 400 })).toBe('hat')
    expect(wornUnder(moved, { x: 250, y: brim - 30 })).toBeNull()
    expect(wornUnder(moved, { x: 120, y: 360 })).toBe('headband')
    expect(wornUnder(moved, { x: 250, y: 405 })).toBe('glasses')
    expect(wornUnder(moved, { x: 198, y: 265 })).toBeNull()
  })
  it('floats the halo over the hat wherever the hat goes, and picks it up there', () => {
    const halo: Look = { ...dressed, headband: 'halo', placed: { hat: { x: 320, y: 300 } } }
    expect(usualSpot(halo, 'headband')).toEqual({ x: 320, y: 300 - HAT_TOPS.crown - 22 })
    expect(wornUnder(halo, { x: 330, y: 300 - HAT_TOPS.crown - 22 })).toBe('headband')
    expect(wornSpot({ ...halo, placed: { ...halo.placed, headband: { x: 100, y: 60 } } }, 'headband')).toEqual({ x: 100, y: 60 })
  })
  it('stays on anywhere on the capybara or near where it usually sits, and comes off out in the salon', () => {
    expect(canWearAt(dressed, 'glasses', { x: 250, y: 430 })).toBe(true)
    expect(canWearAt(dressed, 'hat', { x: 250, y: hatBase(dressed) - 40 })).toBe(true)
    expect(canWearAt({ ...dressed, headband: 'halo' }, 'headband', { x: 270, y: usualSpot({ ...dressed, headband: 'halo' }, 'headband').y })).toBe(true)
    for (const slot of ['hat', 'glasses', 'headband'] as const) expect(canWearAt(dressed, slot, { x: 30, y: 40 })).toBe(false)
  })
})
