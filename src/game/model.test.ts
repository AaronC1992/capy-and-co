import { describe, expect, it } from 'vitest'
import { createLooks, DEFAULT_OUTFIT, GLITTER, HAIR_GROUP_COUNT, MAX_CLIPS, OUTFITS, RAINBOW, salonReducer, STRAND_COUNT } from './model'
import type { Clip, DyeMode, Outfit, SalonAction, SalonState, Tool } from './model'
import { hitHair, hitHairStroke, strandPoints } from './hair'
import { HAIR_SHAPE_LIMIT, isBald, MAX_LENGTH, MIN_LENGTH } from './hairLayout'

const initial = (): SalonState => ({ active: 'mochi', looks: createLooks(), history: [] })
const style = (tool: Tool, strands = [3], checkpoint = true): SalonAction => ({
  type: 'style', tool, strands, checkpoint, color: '#abcdef', direction: -1,
})

describe('salon gameplay', () => {
  it('makes each fine strand independently editable, including strands beside the original anchors', () => {
    const state = initial()
    const index = 5 + HAIR_GROUP_COUNT * 4
    expect(state.looks.mochi.hair).toHaveLength(65)
    expect(strandPoints(state.looks.mochi.hair[index], index)).not.toEqual(strandPoints(state.looks.mochi.hair[5], 5))
    const painted = salonReducer(state, style('color', [index]))
    expect(painted.looks.mochi.hair[index].color).toBe('#abcdef')
    expect(painted.looks.mochi.hair[5]).toBe(state.looks.mochi.hair[5])
  })
  it('groups continuous drying and blowing into one undo and preserves foam, curls, color, length and the blown pose', () => {
    const state = salonReducer(salonReducer(initial(), style('soap', [5])), style('curl', [5]))
    const curliness = state.looks.mochi.hair[5].curl
    expect(curliness).toBeGreaterThan(0)
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 30 : -12) * ((slot >> 1) + 1) / 24)
    let next = state
    for (let frame = 1; frame <= 60; frame++) {
      next = salonReducer(next, { type: 'air', edits: [{ index: 5, wetness: 1 - frame / 60 }], checkpoint: frame === 1 })
    }
    next = salonReducer(next, { type: 'air', edits: [{ index: 5, shape: blown }], checkpoint: false })
    expect(next.history).toHaveLength(state.history.length + 1)
    expect(next.looks.mochi.hair[5]).toMatchObject({ soapy: true, curl: curliness, wetness: 0, shape: blown, length: state.looks.mochi.hair[5].length, color: state.looks.mochi.hair[5].color })
    expect(salonReducer(next, { type: 'undo' }).looks).toEqual(state.looks)
    const washed = salonReducer(next, style('wash', [5]))
    expect(washed.looks.mochi.hair[5]).toMatchObject({ wetness: 1, soapy: false, shape: blown })
    expect(salonReducer(washed, style('blower', [5])).looks.mochi.hair[5].wetness).toBe(0)
  })
  it('saves a blown pose as a single undo even when the hair was already dry, and ignores bad poses', () => {
    const state = initial()
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 20 : -8))
    const posed = salonReducer(state, { type: 'air', edits: [{ index: 5, shape: blown }, { index: 6, shape: blown }], checkpoint: true })
    expect(posed.history).toHaveLength(1)
    expect(posed.looks.mochi.hair[5].shape).toEqual(blown)
    expect(posed.looks.mochi.hair[6].shape).toEqual(blown)
    expect(posed.looks.mochi.hair[4]).toBe(state.looks.mochi.hair[4])
    expect(salonReducer(posed, { type: 'undo' }).looks).toEqual(state.looks)
    expect('shape' in salonReducer(posed, { type: 'air', edits: [{ index: 5, shape: null }], checkpoint: false }).looks.mochi.hair[5]).toBe(false)
    const huge = salonReducer(state, { type: 'air', edits: [{ index: 5, shape: blown.map(() => 9000) }], checkpoint: true })
    expect(huge.looks.mochi.hair[5].shape?.every((value) => value === HAIR_SHAPE_LIMIT)).toBe(true)
    for (const invalid of [[1, 2, 3], blown.map(() => Number.NaN), 'blown']) {
      expect(salonReducer(state, { type: 'air', edits: [{ index: 5, shape: invalid as number[] }], checkpoint: true })).toBe(state)
    }
    expect(salonReducer(state, { type: 'air', edits: [{ index: 5, wetness: Number.NaN }, { index: -1, shape: blown }, { index: STRAND_COUNT, shape: blown }, { index: 1.5, shape: blown }], checkpoint: true })).toBe(state)
  })
  it('rinses soap, dye and curls out of just the strands the sprayer names, keeping their length and pose', () => {
    const natural = initial().looks.mochi.hair[5].color
    const dirty = salonReducer(salonReducer(salonReducer(initial(), style('soap', [5, 6])), style('curl', [5, 6])), style('color', [5, 6]))
    expect(dirty.looks.mochi.hair[5]).toMatchObject({ soapy: true, color: '#abcdef' })
    expect(dirty.looks.mochi.hair[5].curl).toBeGreaterThan(0)
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 20 : -8))
    const posed = salonReducer(dirty, { type: 'air', edits: [{ index: 5, shape: blown }], checkpoint: true })
    const rinsed = salonReducer(posed, { type: 'air', edits: [{ index: 5, rinse: true, wetness: 0.3 }], checkpoint: true })
    expect(rinsed.looks.mochi.hair[5]).toMatchObject({ soapy: false, curl: 0, color: natural, wetness: 0.3, shape: blown, length: dirty.looks.mochi.hair[5].length })
    expect(rinsed.looks.mochi.hair[6]).toBe(dirty.looks.mochi.hair[6])
    expect(salonReducer(rinsed, { type: 'undo' }).looks).toEqual(posed.looks)
    expect(salonReducer(rinsed, { type: 'air', edits: [{ index: 5, rinse: true }], checkpoint: true })).toBe(rinsed)
    const clean = initial()
    expect(salonReducer(clean, { type: 'air', edits: [{ index: 5, rinse: true }], checkpoint: true })).toBe(clean)
    expect(salonReducer(dirty, { type: 'air', edits: [{ index: 5, rinse: false }], checkpoint: true })).toBe(dirty)
  })
  it('trims only the touched locks without mutating the original', () => {
    const state = initial()
    const result = salonReducer(state, style('snip'))
    expect(result.looks.mochi.hair[3].length).toBeCloseTo(state.looks.mochi.hair[3].length - 0.2)
    expect(result.looks.mochi.hair[2]).toBe(state.looks.mochi.hair[2])
    expect(result.looks.biscuit).toBe(state.looks.biscuit)
  })
  it('caps repeated cutting and regrowing at safe, visible lengths', () => {
    let state = initial()
    for (let i = 0; i < 20; i++) state = salonReducer(state, style('snip'))
    expect(state.looks.mochi.hair[3].length).toBe(0.08)
    for (let i = 0; i < 5; i++) state = salonReducer(state, style('grow'))
    // Standing hair stops at full height before it starts to fall...
    expect(state.looks.mochi.hair[3].length).toBe(1)
    for (let i = 0; i < 20; i++) state = salonReducer(state, style('grow'))
    // ...and then grows all the way to the floor.
    expect(state.looks.mochi.hair[3].length).toBe(MAX_LENGTH)
    state = salonReducer(state, style('snip'))
    expect(state.looks.mochi.hair[3].length).toBe(MAX_LENGTH - 0.5)
  })
  it('brushes away curls in the swipe direction', () => {
    const curled = salonReducer(initial(), style('curl'))
    expect(curled.looks.mochi.hair[3].curl).toBeGreaterThan(0)
    const brushed = salonReducer(curled, style('brush'))
    expect(brushed.looks.mochi.hair[3]).toMatchObject({ curl: 0, flow: -1 })
  })
  it('combs the whole head smooth the same way, keeping length, color and the saved shape', () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 12 : -4))
    const posed = salonReducer(salonReducer(initial(), { type: 'pose', locks: [{ index: 3, flow: 0.3, shape }], checkpoint: true }), style('curl'))
    const combed = salonReducer(posed, style('comb'))
    expect(combed.looks.mochi.hair[3]).toMatchObject({ curl: 0, flow: -1, shape, length: posed.looks.mochi.hair[3].length, color: posed.looks.mochi.hair[3].color })
    expect(combed.history).toHaveLength(posed.history.length + 1)
  })
  it('saves independently posed locks as one undoable drag without altering hair lengths', () => {
    const state = salonReducer(initial(), style('curl', [3, 4]))
    const started = salonReducer(state, { type: 'pose', locks: [{ index: 3, flow: 0.3 }], checkpoint: true })
    const continued = salonReducer(started, { type: 'pose', locks: [{ index: 4, flow: 0.3 }], checkpoint: false })
    const finished = salonReducer(continued, { type: 'pose', locks: [{ index: 3, flow: -1 }, { index: 4, flow: 0.8 }], checkpoint: false })
    expect(finished.history).toHaveLength(state.history.length + 1)
    expect(finished.looks.mochi.hair[3]).toMatchObject({ flow: -1, curl: 0, length: state.looks.mochi.hair[3].length })
    expect(finished.looks.mochi.hair[4].flow).toBe(0.8)
    expect(salonReducer(finished, { type: 'undo' }).looks).toEqual(state.looks)
  })
  it('paints individual locks and washes color without undoing a haircut', () => {
    const state = initial()
    const cut = salonReducer(state, style('snip'))
    const painted = salonReducer(cut, style('color'))
    expect(painted.looks.mochi.hair[3].color).toBe('#abcdef')
    const washed = salonReducer(painted, style('wash'))
    expect(washed.looks.mochi.hair[3].color).toBe(state.looks.mochi.hair[3].color)
    expect(washed.looks.mochi.hair[3].length).toBe(cut.looks.mochi.hair[3].length)
  })
  it('keeps a two-dimensional brush pose through later styling and one-step undo', () => {
    const state = initial()
    const start = salonReducer(state, { type: 'pose', locks: [{ index: 5, flow: 0.3 }], checkpoint: true })
    const posed = salonReducer(start, { type: 'pose', locks: [{ index: 5, flow: 0.3, bendX: 70, bendY: -45 }], checkpoint: false })
    expect(posed.history).toHaveLength(1)
    expect(posed.looks.mochi.hair[5]).toMatchObject({ bendX: 70, bendY: -45 })
    expect(salonReducer(posed, { type: 'undo' }).looks).toEqual(state.looks)
    const painted = salonReducer(posed, style('color', [5]))
    const washed = salonReducer(painted, style('wash', [5]))
    expect(strandPoints(washed.looks.mochi.hair[5], 5)).toEqual(strandPoints(posed.looks.mochi.hair[5], 5))
    const away = salonReducer(washed, { type: 'select', character: 'biscuit' })
    expect(salonReducer(away, { type: 'select', character: 'mochi' }).looks.mochi).toBe(washed.looks.mochi)
  })
  it('bounds saved brush poses to the studio instead of accumulating off-screen drags', () => {
    const result = salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3, bendX: 5000, bendY: -5000 }], checkpoint: true })
    expect(result.looks.mochi.hair[5]).toMatchObject({ bendX: 95, bendY: -65 })
  })
  it('saves a brushed hair shape as one undo, and clears it when told to', () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? slot / 4 : -slot / 8))
    const start = salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3 }], checkpoint: true })
    const posed = salonReducer(start, { type: 'pose', locks: [{ index: 5, flow: 0.3, shape }], checkpoint: false })
    expect(posed.history).toHaveLength(1)
    expect(posed.looks.mochi.hair[5].shape).toEqual(shape)
    expect(posed.looks.mochi.hair[4]).toBe(start.looks.mochi.hair[4])
    expect(salonReducer(posed, { type: 'undo' }).looks).toEqual(initial().looks)
    expect(salonReducer(posed, style('soap', [5], false)).looks.mochi.hair[5].shape).toEqual(shape)
    expect('shape' in salonReducer(posed, { type: 'pose', locks: [{ index: 5, flow: 0.3, shape: null }], checkpoint: false }).looks.mochi.hair[5]).toBe(false)
    const huge = salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3, shape: shape.map(() => 9000) }], checkpoint: true })
    expect(huge.looks.mochi.hair[5].shape?.every((value) => value === HAIR_SHAPE_LIMIT)).toBe(true)
    for (const invalid of [[1, 2, 3], shape.map(() => Number.NaN), 'bent']) {
      expect(salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3, shape: invalid as number[] }], checkpoint: true }).looks.mochi.hair[5].shape).toBeUndefined()
    }
  })
  it('scales a brushed shape with the hair as it grows and shrinks, and keeps it through rinsing', () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 20 : -6))
    const posed = salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3, shape }], checkpoint: true })
    const length = posed.looks.mochi.hair[5].length
    const grown = salonReducer(posed, { type: 'lengths', edits: [{ index: 5, length: length + 0.2 }], checkpoint: false })
    expect(grown.looks.mochi.hair[5].shape![0]).toBeGreaterThan(20)
    const trimmed = salonReducer(posed, { type: 'lengths', edits: [{ index: 5, length: length - 0.2 }], checkpoint: false })
    expect(trimmed.looks.mochi.hair[5].shape![0]).toBeLessThan(20)
    const wholeHead = salonReducer(posed, style('grow', [5]))
    expect(wholeHead.looks.mochi.hair[5].shape![0]).toBeGreaterThan(20)
    expect(salonReducer(salonReducer(posed, style('soap', [5])), style('wash', [5])).looks.mochi.hair[5].shape).toEqual(shape)
  })
  it('lathers continuously contacted locks, retains soap during styling, and rinses locally or all at once', () => {
    const state = initial()
    const first = salonReducer(state, style('soap', [3]))
    const soaped = salonReducer(first, style('soap', [4], false))
    expect(soaped.history).toHaveLength(1)
    expect(soaped.looks.mochi.hair[2].soapy).toBeUndefined()
    expect(salonReducer(soaped, { type: 'undo' }).looks).toEqual(state.looks)
    let styled = soaped
    for (const tool of ['brush', 'snip', 'grow', 'curl', 'color'] as const) styled = salonReducer(styled, style(tool, [3, 4]))
    expect(styled.looks.mochi.hair[3].soapy).toBe(true)
    expect(styled.looks.mochi.hair[4].soapy).toBe(true)
    const rinsed = salonReducer(styled, style('wash', [3]))
    expect(rinsed.looks.mochi.hair[3].soapy).toBe(false)
    expect(rinsed.looks.mochi.hair[4].soapy).toBe(true)
    expect(salonReducer(rinsed, { type: 'undo' }).looks).toEqual(styled.looks)
    const indices = Array.from({ length: STRAND_COUNT }, (_, i) => i)
    const allSoaped = salonReducer(rinsed, style('soap', indices))
    expect(allSoaped.looks.mochi.hair.every((strand) => strand.soapy)).toBe(true)
    const allRinsed = salonReducer(allSoaped, style('wash', indices))
    expect(allRinsed.looks.mochi.hair.every((strand) => !strand.soapy)).toBe(true)
  })
  it('undoes a multi-lock swipe as a single action', () => {
    const state = initial()
    const first = salonReducer(state, style('snip', [2], true))
    const second = salonReducer(first, style('snip', [3, 4], false))
    expect(second.history).toHaveLength(1)
    expect(salonReducer(second, { type: 'undo' }).looks.mochi).toEqual(state.looks.mochi)
  })
  it('groups many continuous length updates into one undo and preserves colors and accessories', () => {
    const state = salonReducer(initial(), { type: 'wear', slot: 'glasses', item: 'hearts' })
    const before = state.looks.mochi
    let next = state
    for (let i = 0; i < 60; i++) {
      next = salonReducer(next, { type: 'lengths', edits: [{ index: 5, length: 0.2 + i * 0.01 }], checkpoint: i === 0 })
    }
    expect(next.history).toHaveLength(state.history.length + 1)
    expect(next.looks.mochi.hair[5].length).toBeCloseTo(0.79)
    expect(next.looks.mochi.hair[5].color).toBe(before.hair[5].color)
    expect(next.looks.mochi.glasses).toBe('hearts')
    expect(next.looks.biscuit).toBe(state.looks.biscuit)
    expect(salonReducer(next, { type: 'undo' }).looks.mochi).toEqual(before)
  })
  it('ignores no-op length changes and keeps continuous edits within the save format bounds', () => {
    const state = initial()
    expect(salonReducer(state, { type: 'lengths', edits: [{ index: 5, length: state.looks.mochi.hair[5].length }], checkpoint: true })).toBe(state)
    const bounded = salonReducer(state, { type: 'lengths', edits: [{ index: 4, length: -5 }, { index: 5, length: 6 }], checkpoint: true })
    expect(bounded.looks.mochi.hair[4].length).toBe(MIN_LENGTH)
    expect(bounded.looks.mochi.hair[5].length).toBe(MAX_LENGTH)
  })
  it('keeps looks separate when switching friends and clears cross-friend undo', () => {
    const painted = salonReducer(initial(), style('color'))
    expect(salonReducer(painted, { type: 'select', character: 'mochi' })).toBe(painted)
    const biscuit = salonReducer(painted, { type: 'select', character: 'biscuit' })
    expect(biscuit.history).toHaveLength(0)
    const back = salonReducer(biscuit, { type: 'select', character: 'mochi' })
    expect(back.looks.mochi.hair[3].color).toBe('#abcdef')
    expect(back.looks.biscuit.hair[3].color).not.toBe('#abcdef')
  })
  it('supports undoing accessories and reset', () => {
    const dressed = salonReducer(initial(), { type: 'wear', slot: 'hat', item: 'party' })
    const reset = salonReducer(dressed, { type: 'reset' })
    expect(reset.looks.mochi.hat).toBe('none')
    expect(salonReducer(reset, { type: 'undo' }).looks.mochi.hat).toBe('party')
    expect(salonReducer(dressed, { type: 'undo' }).looks.mochi.hat).toBe('none')
  })
  it('ignores off-character touches and limits undo memory', () => {
    const state = initial()
    expect(salonReducer(state, style('snip', [-1, 99]))).toBe(state)
    let next = state
    for (let i = 0; i < 60; i++) next = salonReducer(next, style('color'))
    expect(next.history).toHaveLength(40)
  })
  it('applies whole-head styling to every lock', () => {
    const result = salonReducer(initial(), style('curl', Array.from({ length: STRAND_COUNT }, (_, i) => i)))
    expect(result.looks.mochi.hair.every((strand) => strand.curl > 0)).toBe(true)
  })
  it('curls the whole head more with each press until it is fully curly', () => {
    const everyStrand = Array.from({ length: STRAND_COUNT }, (_, i) => i)
    const levels: number[] = []
    let state = initial()
    for (let press = 0; press < 5; press++) {
      state = salonReducer(state, style('curl', everyStrand))
      levels.push(state.looks.mochi.hair[3].curl)
    }
    levels.slice(1).forEach((level, i) => expect(level).toBeGreaterThanOrEqual(levels[i]))
    expect(levels[0]).toBeGreaterThan(0)
    expect(levels[0]).toBeLessThan(1)
    expect(levels.at(-1)).toBe(1)
  })
})

describe('hold-to-curl', () => {
  it('turns one continuous hold into a single undo, curling only the named strands up to fully curly', () => {
    const state = initial()
    let next = state
    for (let frame = 0; frame < 40; frame++) {
      next = salonReducer(next, { type: 'curl', edits: [{ index: 5, curl: (frame + 1) / 20 }, { index: 6, curl: 0.5 }], checkpoint: frame === 0 })
    }
    expect(next.history).toHaveLength(1)
    expect(next.looks.mochi.hair[5].curl).toBe(1)
    expect(next.looks.mochi.hair[6].curl).toBe(0.5)
    expect(next.looks.mochi.hair[4]).toBe(state.looks.mochi.hair[4])
    expect(salonReducer(next, { type: 'undo' }).looks).toEqual(state.looks)
  })
  it('keeps the hair, color and pose it curls, and can curl it back out', () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 12 : -4))
    const posed = salonReducer(salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: 0.3, shape }], checkpoint: true }), style('color', [5]))
    const curled = salonReducer(posed, { type: 'curl', edits: [{ index: 5, curl: 0.7 }], checkpoint: true })
    expect(curled.looks.mochi.hair[5]).toMatchObject({ curl: 0.7, shape, color: '#abcdef', length: posed.looks.mochi.hair[5].length })
    expect(salonReducer(curled, { type: 'curl', edits: [{ index: 5, curl: 0 }], checkpoint: true }).looks.mochi.hair[5].curl).toBe(0)
  })
  it('ignores curls that change nothing, and bad or out-of-range edits', () => {
    const state = initial()
    expect(salonReducer(state, { type: 'curl', edits: [{ index: 5, curl: 0 }], checkpoint: true })).toBe(state)
    expect(salonReducer(state, { type: 'curl', edits: [{ index: -1, curl: 1 }, { index: STRAND_COUNT, curl: 1 }, { index: 1.5, curl: 1 }, { index: 5, curl: Number.NaN }], checkpoint: true })).toBe(state)
    expect(salonReducer(state, { type: 'curl', edits: [{ index: 5, curl: 9 }], checkpoint: true }).looks.mochi.hair[5].curl).toBe(1)
    expect(salonReducer(state, { type: 'curl', edits: [{ index: 5, curl: -3 }], checkpoint: true })).toBe(state)
  })
})

describe('cutting hair right down to the scalp', () => {
  const shave = (state: SalonState, index: number) => salonReducer(state, { type: 'lengths', edits: [{ index, length: MIN_LENGTH }], checkpoint: true })
  const prepared = () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 12 : -4))
    let state = salonReducer(initial(), { type: 'pose', locks: [{ index: 5, flow: -0.4, bendX: 30, bendY: 10, shape }], checkpoint: true })
    state = salonReducer(state, style('color', [5]))
    state = salonReducer(state, style('soap', [5]))
    return salonReducer(state, { type: 'curl', edits: [{ index: 5, curl: 0.6 }], checkpoint: true })
  }

  it('shaves a strand bald, dropping its pose, soap, water and curls but keeping its color and one undo', () => {
    const state = prepared()
    const bald = shave(state, 5)
    const strand = bald.looks.mochi.hair[5]
    expect(isBald(strand.length)).toBe(true)
    expect(strand).toEqual({ length: MIN_LENGTH, color: '#abcdef', curl: 0, flow: -0.4 })
    expect(bald.looks.mochi.hair[4]).toBe(state.looks.mochi.hair[4])
    expect(salonReducer(bald, { type: 'undo' }).looks).toEqual(state.looks)
  })
  it('does nothing when the strand is already bare', () => {
    const bald = shave(initial(), 5)
    expect(shave(bald, 5)).toBe(bald)
  })
  it('leaves bare scalp alone whatever else is tried, because there is no hair to style', () => {
    const bald = shave(prepared(), 5)
    for (const tool of ['brush', 'comb', 'snip', 'curl', 'soap', 'wash', 'blower', 'color'] as const) {
      expect(salonReducer(bald, style(tool, [5]))).toBe(bald)
    }
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 20 : -8))
    expect(salonReducer(bald, { type: 'pose', locks: [{ index: 5, flow: 0.5, shape: blown }], checkpoint: true })).toBe(bald)
    expect(salonReducer(bald, { type: 'air', edits: [{ index: 5, wetness: 1, shape: blown, rinse: true }], checkpoint: true })).toBe(bald)
    expect(salonReducer(bald, { type: 'curl', edits: [{ index: 5, curl: 1 }], checkpoint: true })).toBe(bald)
  })
  it('still styles the rest of the head when a whole-head tool also reaches shaved scalp', () => {
    const bald = shave(prepared(), 5)
    const everyStrand = Array.from({ length: STRAND_COUNT }, (_, i) => i)
    const painted = salonReducer(bald, style('color', everyStrand))
    expect(painted.looks.mochi.hair[5]).toBe(bald.looks.mochi.hair[5])
    expect(painted.looks.mochi.hair[4].color).toBe('#abcdef')
  })
  it('lets Grow bring shaved hair back in its own color, with nothing left of the old style', () => {
    const bald = shave(prepared(), 5)
    const wholeHead = salonReducer(bald, style('grow', [5]))
    expect(isBald(wholeHead.looks.mochi.hair[5].length)).toBe(false)
    expect(wholeHead.looks.mochi.hair[5]).toMatchObject({ color: '#abcdef', curl: 0, flow: -0.4 })
    expect(wholeHead.looks.mochi.hair[5].shape).toBeUndefined()
    let regrown = bald
    for (let frame = 0; frame < 30; frame++) regrown = salonReducer(regrown, { type: 'lengths', edits: [{ index: 5, length: MIN_LENGTH + (frame + 1) * 0.03 }], checkpoint: frame === 0 })
    expect(regrown.looks.mochi.hair[5].length).toBeGreaterThan(0.6)
    expect(regrown.history).toHaveLength(bald.history.length + 1)
  })
  it('only shaves hair that is cut right to the scalp, leaving shorter hair as stubble', () => {
    const state = initial()
    const stubble = salonReducer(state, { type: 'lengths', edits: [{ index: 5, length: 0 }], checkpoint: true })
    expect(isBald(stubble.looks.mochi.hair[5].length)).toBe(false)
    expect(stubble.looks.mochi.hair[5].length).toBe(0)
  })
})

describe('fancy colors', () => {
  const paint = (state: SalonState, color: string, dye?: DyeMode, strands = [3]): SalonState => salonReducer(state, { ...style('color', strands), color, dye } as SalonAction)
  it('dips the tips or fades into a new color over the color already there, as one undo each', () => {
    const base = paint(initial(), '#abcdef')
    const dipped = paint(base, '#f0d878', 'tips')
    expect(dipped.looks.mochi.hair[3]).toMatchObject({ color: '#abcdef', tip: '#f0d878' })
    expect(dipped.looks.mochi.hair[3].fade).toBeUndefined()
    expect(dipped.looks.mochi.hair[2]).toBe(base.looks.mochi.hair[2])
    const faded = paint(dipped, '#9fcb8b', 'fade')
    expect(faded.looks.mochi.hair[3]).toMatchObject({ color: '#abcdef', tip: '#9fcb8b', fade: true })
    const repainted = paint(faded, '#123456', 'whole')
    expect(repainted.looks.mochi.hair[3]).toMatchObject({ color: '#123456' })
    expect(repainted.looks.mochi.hair[3].tip).toBeUndefined()
    expect(repainted.looks.mochi.hair[3].fade).toBeUndefined()
    expect(repainted.history).toHaveLength(4)
    expect(salonReducer(repainted, { type: 'undo' }).looks).toEqual(faded.looks)
  })
  it('paints rainbow in place of other dye, and adds glitter over any color without stacking', () => {
    const rainbow = paint(paint(initial(), '#f0d878', 'tips'), RAINBOW)
    expect(rainbow.looks.mochi.hair[3]).toMatchObject({ rainbow: true })
    expect(rainbow.looks.mochi.hair[3].tip).toBeUndefined()
    const sparkly = paint(rainbow, GLITTER)
    expect(sparkly.looks.mochi.hair[3]).toMatchObject({ rainbow: true, glitter: true })
    expect(paint(sparkly, GLITTER)).toBe(sparkly)
    const recolored = paint(sparkly, '#abcdef')
    expect(recolored.looks.mochi.hair[3]).toMatchObject({ color: '#abcdef', glitter: true })
    expect(recolored.looks.mochi.hair[3].rainbow).toBeUndefined()
  })
  it('ignores paint that is not a color', () => {
    const state = initial()
    for (const bad of ['', 'red', 'url(#x)', '#12345']) expect(paint(state, bad)).toBe(state)
  })
  it('washes and rinses every kind of dye and glitter back to the natural color', () => {
    const natural = initial().looks.mochi.hair[3].color
    let fancy = paint(paint(initial(), '#abcdef', 'fade', [3, 4]), GLITTER, undefined, [3, 4])
    fancy = paint(fancy, RAINBOW, undefined, [4])
    const washed = salonReducer(fancy, style('wash', [3])).looks.mochi.hair[3]
    expect(washed).toMatchObject({ color: natural })
    for (const key of ['tip', 'fade', 'rainbow', 'glitter'] as const) expect(washed[key]).toBeUndefined()
    const rinsed = salonReducer(fancy, { type: 'air', edits: [{ index: 4, rinse: true }], checkpoint: true }).looks.mochi.hair[4]
    expect(rinsed).toMatchObject({ color: natural })
    for (const key of ['tip', 'fade', 'rainbow', 'glitter'] as const) expect(rinsed[key]).toBeUndefined()
    const onlyGlitter = paint(initial(), GLITTER)
    expect(salonReducer(onlyGlitter, { type: 'air', edits: [{ index: 3, rinse: true }], checkpoint: true }).looks.mochi.hair[3].glitter).toBeUndefined()
  })
})

describe('hats, glasses and clips', () => {
  it('wears one hat, pair of glasses and headband at a time, each as its own undo', () => {
    const state = initial()
    expect(state.looks.mochi).toMatchObject({ hat: 'none', glasses: 'none', headband: 'none', clips: [] })
    const hatted = salonReducer(state, { type: 'wear', slot: 'hat', item: 'beanie' })
    const dressed = salonReducer(salonReducer(hatted, { type: 'wear', slot: 'glasses', item: 'shades' }), { type: 'wear', slot: 'headband', item: 'bunny' })
    expect(dressed.looks.mochi).toMatchObject({ hat: 'beanie', glasses: 'shades', headband: 'bunny' })
    expect(dressed.history).toHaveLength(3)
    expect(dressed.looks.biscuit).toBe(state.looks.biscuit)
    expect(salonReducer(dressed, { type: 'wear', slot: 'hat', item: 'tophat' }).looks.mochi.hat).toBe('tophat')
    expect(salonReducer(dressed, { type: 'wear', slot: 'hat', item: 'none' }).looks.mochi.hat).toBe('none')
    expect(salonReducer(dressed, { type: 'wear', slot: 'hat', item: 'beanie' })).toBe(dressed)
    expect(salonReducer(dressed, { type: 'wear', slot: 'glasses', item: 'crown' })).toBe(dressed)
    expect(salonReducer(dressed, { type: 'undo' }).looks.mochi).toMatchObject({ glasses: 'shades', headband: 'none' })
  })
  it('moves a worn hat, glasses or headband as its own undo, keeps the spot for the next one tried on, and forgets it when taken off', () => {
    const dressed = salonReducer(salonReducer(initial(), { type: 'wear', slot: 'hat', item: 'crown' }), { type: 'wear', slot: 'glasses', item: 'round' })
    const moved = salonReducer(dressed, { type: 'place', slot: 'hat', x: 312.04, y: 140 })
    expect(moved.looks.mochi.placed).toEqual({ hat: { x: 312, y: 140 } })
    expect(moved.history).toHaveLength(dressed.history.length + 1)
    expect(salonReducer(moved, { type: 'place', slot: 'hat', x: 312, y: 140 })).toBe(moved)
    expect(salonReducer(moved, { type: 'place', slot: 'hat', x: -40, y: 900 }).looks.mochi.placed?.hat).toEqual({ x: 0, y: 520 })
    for (const bad of [{ slot: 'headband', x: 200, y: 200 }, { slot: 'outfit', x: 200, y: 200 }, { slot: 'hat', x: Number.NaN, y: 200 }]) {
      expect(salonReducer(moved, { type: 'place', ...bad } as SalonAction)).toBe(moved)
    }
    const both = salonReducer(moved, { type: 'place', slot: 'glasses', x: 250, y: 180 })
    const swapped = salonReducer(both, { type: 'wear', slot: 'hat', item: 'tophat' })
    expect(swapped.looks.mochi).toMatchObject({ hat: 'tophat', placed: { hat: { x: 312, y: 140 }, glasses: { x: 250, y: 180 } } })
    expect(salonReducer(swapped, { type: 'wear', slot: 'hat', item: 'none' }).looks.mochi.placed).toEqual({ glasses: { x: 250, y: 180 } })
    const bare = salonReducer(salonReducer(swapped, { type: 'wear', slot: 'hat', item: 'none' }), { type: 'wear', slot: 'glasses', item: 'none' })
    expect(bare.looks.mochi).not.toHaveProperty('placed')
    expect(salonReducer(both, { type: 'undo' }).looks.mochi.placed).toEqual({ hat: { x: 312, y: 140 } })
  })
  it('puts on one of each kind of makeup and lashes at a time, as its own undo, without moving anything worn', () => {
    const state = salonReducer(salonReducer(initial(), { type: 'wear', slot: 'hat', item: 'crown' }), { type: 'place', slot: 'hat', x: 300, y: 150 })
    expect(state.looks.mochi).toMatchObject({ lashes: 'none', eyeshadow: 'none', blush: 'none', lipstick: 'none' })
    const madeUp = [
      { slot: 'lashes', item: 'doll' }, { slot: 'eyeshadow', item: 'gold' }, { slot: 'blush', item: 'hearts' }, { slot: 'lipstick', item: 'cherry' }, { slot: 'lipstick', item: 'gloss' },
    ].reduce((next, change) => salonReducer(next, { type: 'wear', ...change } as SalonAction), state)
    expect(madeUp.looks.mochi).toMatchObject({ lashes: 'doll', eyeshadow: 'gold', blush: 'hearts', lipstick: 'gloss', placed: { hat: { x: 300, y: 150 } } })
    expect(madeUp.history).toHaveLength(state.history.length + 5)
    for (const bad of [{ slot: 'lashes', item: 'crown' }, { slot: 'blush', item: 'rainbow' }, { slot: 'mascara', item: 'long' }, { slot: 'lipstick', item: 'gloss' }]) {
      expect(salonReducer(madeUp, { type: 'wear', ...bad } as SalonAction)).toBe(madeUp)
    }
    const washed = salonReducer(madeUp, { type: 'wear', slot: 'blush', item: 'none' })
    expect(washed.looks.mochi).toMatchObject({ blush: 'none', lashes: 'doll', placed: { hat: { x: 300, y: 150 } } })
    expect(salonReducer(washed, { type: 'undo' }).looks.mochi.blush).toBe('hearts')
  })
  it('keeps any number of clips up to the limit, as one undo per change, and turns away broken ones', () => {
    const state = initial()
    const clips: Clip[] = [{ kind: 'bow', x: 300, y: 170, strand: 4, step: 12 }, { kind: 'butterfly', x: 250, y: 400 }]
    const clipped = salonReducer(state, { type: 'clips', clips })
    expect(clipped.looks.mochi.clips).toEqual(clips)
    expect(clipped.looks.mochi.clips[0]).not.toBe(clips[0])
    expect(clipped.history).toHaveLength(1)
    expect(salonReducer(clipped, { type: 'clips', clips: clips.map((clip) => ({ ...clip })) })).toBe(clipped)
    const lots = Array.from({ length: MAX_CLIPS }, (_, index): Clip => ({ kind: 'star', x: 100 + index * 20, y: 200 }))
    expect(salonReducer(state, { type: 'clips', clips: lots }).looks.mochi.clips).toHaveLength(MAX_CLIPS)
    for (const broken of [
      [...lots, lots[0]],
      [{ kind: 'sticker', x: 10, y: 10 }],
      [{ kind: 'bow', x: -5, y: 10 }],
      [{ kind: 'bow', x: 10, y: 10, strand: STRAND_COUNT, step: 3 }],
      [{ kind: 'bow', x: 10, y: 10, strand: 3 }],
      [{ kind: 'bow', x: 10, y: 10, strand: 3, step: 2.5 }],
    ]) expect(salonReducer(state, { type: 'clips', clips: broken as Clip[] })).toBe(state)
    expect(salonReducer(salonReducer(clipped, { type: 'clips', clips: [] }), { type: 'undo' }).looks.mochi.clips).toEqual(clips)
  })
})

describe('dress up', () => {
  it('offers plenty of different outfits, and every friend starts out in the cozy cape', () => {
    expect(OUTFITS.length).toBeGreaterThanOrEqual(15)
    expect(new Set(OUTFITS).size).toBe(OUTFITS.length)
    expect(DEFAULT_OUTFIT).toBe('cozy')
    for (const look of Object.values(createLooks())) expect(look.outfit).toBe(DEFAULT_OUTFIT)
  })
  it('puts an outfit on only the active friend, as one undo, leaving her hair and accessory alone', () => {
    const styled = salonReducer(salonReducer(initial(), style('color')), { type: 'wear', slot: 'hat', item: 'crown' })
    const dressed = salonReducer(styled, { type: 'outfit', outfit: 'wizard' })
    expect(dressed.looks.mochi.outfit).toBe('wizard')
    expect(dressed.looks.mochi.hair).toBe(styled.looks.mochi.hair)
    expect(dressed.looks.mochi.hat).toBe('crown')
    expect(dressed.looks.biscuit).toBe(styled.looks.biscuit)
    expect(dressed.history).toHaveLength(styled.history.length + 1)
    expect(salonReducer(dressed, { type: 'undo' }).looks.mochi).toBe(styled.looks.mochi)
  })
  it('keeps the outfit through styling, and gives every friend her own', () => {
    const dressed = salonReducer(initial(), { type: 'outfit', outfit: 'tutu' })
    const styled = salonReducer(salonReducer(dressed, style('curl', [3, 4])), style('snip', [5]))
    expect(styled.looks.mochi.outfit).toBe('tutu')
    const biscuit = salonReducer(styled, { type: 'select', character: 'biscuit' })
    expect(biscuit.looks.biscuit.outfit).toBe(DEFAULT_OUTFIT)
    expect(salonReducer(biscuit, { type: 'select', character: 'mochi' }).looks.mochi.outfit).toBe('tutu')
  })
  it('ignores the outfit already being worn and outfits that do not exist', () => {
    const state = initial()
    expect(salonReducer(state, { type: 'outfit', outfit: DEFAULT_OUTFIT })).toBe(state)
    expect(salonReducer(state, { type: 'outfit', outfit: 'pirate' as Outfit })).toBe(state)
    const dressed = salonReducer(state, { type: 'outfit', outfit: 'hero' })
    expect(salonReducer(dressed, { type: 'outfit', outfit: 'hero' })).toBe(dressed)
  })
  it('lets every outfit be tried on in turn, and puts the cozy cape back on reset', () => {
    let state = initial()
    for (const outfit of OUTFITS.filter((name) => name !== DEFAULT_OUTFIT)) {
      state = salonReducer(state, { type: 'outfit', outfit })
      expect(state.looks.mochi.outfit).toBe(outfit)
    }
    const reset = salonReducer(state, { type: 'reset' })
    expect(reset.looks.mochi.outfit).toBe(DEFAULT_OUTFIT)
    expect(salonReducer(reset, { type: 'undo' }).looks.mochi.outfit).toBe(OUTFITS.at(-1))
  })
})

describe('pointer-independent hair picking', () => {
  it('finds actual rendered hair but not the face or room', () => {
    const look = createLooks().mochi
    expect(hitHair(look, strandPoints(look.hair[5], 5)[15])).toContain(5)
    expect(hitHair(look, { x: 250, y: 315 })).toEqual([])
    expect(hitHair(look, { x: 0, y: 0 })).toEqual([])
  })
  it('samples fast swipes between events and deduplicates hits', () => {
    const hits = hitHairStroke(createLooks().mochi, { x: 120, y: 160 }, { x: 375, y: 160 })
    expect(hits.length).toBeGreaterThan(5)
    expect(new Set(hits).size).toBe(hits.length)
  })
  it('still allows hair picking after a cut, curls, or regrowth', () => {
    for (const tool of ['snip', 'curl', 'grow'] as const) {
      const look = salonReducer(initial(), style(tool)).looks.mochi
      expect(hitHair(look, strandPoints(look.hair[3], 3)[20])).toContain(3)
    }
  })
})
