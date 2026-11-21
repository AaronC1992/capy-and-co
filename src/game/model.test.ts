import { describe, expect, it } from 'vitest'
import { createLooks, HAIR_GROUP_COUNT, salonReducer, STRAND_COUNT } from './model'
import type { SalonAction, SalonState, Tool } from './model'
import { hitHair, hitHairStroke, strandPoints } from './hair'

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
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 30 : -12) * ((slot >> 1) + 1) / 24)
    let next = state
    for (let frame = 1; frame <= 60; frame++) {
      next = salonReducer(next, { type: 'air', edits: [{ index: 5, wetness: 1 - frame / 60 }], checkpoint: frame === 1 })
    }
    next = salonReducer(next, { type: 'air', edits: [{ index: 5, shape: blown }], checkpoint: false })
    expect(next.history).toHaveLength(state.history.length + 1)
    expect(next.looks.mochi.hair[5]).toMatchObject({ soapy: true, curl: true, wetness: 0, shape: blown, length: state.looks.mochi.hair[5].length, color: state.looks.mochi.hair[5].color })
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
    expect(huge.looks.mochi.hair[5].shape?.every((value) => value === 300)).toBe(true)
    for (const invalid of [[1, 2, 3], blown.map(() => Number.NaN), 'blown']) {
      expect(salonReducer(state, { type: 'air', edits: [{ index: 5, shape: invalid as number[] }], checkpoint: true })).toBe(state)
    }
    expect(salonReducer(state, { type: 'air', edits: [{ index: 5, wetness: Number.NaN }, { index: -1, shape: blown }, { index: STRAND_COUNT, shape: blown }, { index: 1.5, shape: blown }], checkpoint: true })).toBe(state)
  })
  it('rinses soap, dye and curls out of just the strands the sprayer names, keeping their length and pose', () => {
    const natural = initial().looks.mochi.hair[5].color
    const dirty = salonReducer(salonReducer(salonReducer(initial(), style('soap', [5, 6])), style('curl', [5, 6])), style('color', [5, 6]))
    expect(dirty.looks.mochi.hair[5]).toMatchObject({ soapy: true, curl: true, color: '#abcdef' })
    const blown = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 20 : -8))
    const posed = salonReducer(dirty, { type: 'air', edits: [{ index: 5, shape: blown }], checkpoint: true })
    const rinsed = salonReducer(posed, { type: 'air', edits: [{ index: 5, rinse: true, wetness: 0.3 }], checkpoint: true })
    expect(rinsed.looks.mochi.hair[5]).toMatchObject({ soapy: false, curl: false, color: natural, wetness: 0.3, shape: blown, length: dirty.looks.mochi.hair[5].length })
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
    for (let i = 0; i < 20; i++) state = salonReducer(state, style('grow'))
    expect(state.looks.mochi.hair[3].length).toBe(1)
  })
  it('brushes away curls in the swipe direction', () => {
    const curled = salonReducer(initial(), style('curl'))
    expect(curled.looks.mochi.hair[3].curl).toBe(true)
    const brushed = salonReducer(curled, style('brush'))
    expect(brushed.looks.mochi.hair[3]).toMatchObject({ curl: false, flow: -1 })
  })
  it('combs the whole head smooth the same way, keeping length, color and the saved shape', () => {
    const shape = Array.from({ length: 48 }, (_, slot) => (slot % 2 === 0 ? 12 : -4))
    const posed = salonReducer(salonReducer(initial(), { type: 'pose', locks: [{ index: 3, flow: 0.3, shape }], checkpoint: true }), style('curl'))
    const combed = salonReducer(posed, style('comb'))
    expect(combed.looks.mochi.hair[3]).toMatchObject({ curl: false, flow: -1, shape, length: posed.looks.mochi.hair[3].length, color: posed.looks.mochi.hair[3].color })
    expect(combed.history).toHaveLength(posed.history.length + 1)
  })
  it('saves independently posed locks as one undoable drag without altering hair lengths', () => {
    const state = salonReducer(initial(), style('curl', [3, 4]))
    const started = salonReducer(state, { type: 'pose', locks: [{ index: 3, flow: 0.3 }], checkpoint: true })
    const continued = salonReducer(started, { type: 'pose', locks: [{ index: 4, flow: 0.3 }], checkpoint: false })
    const finished = salonReducer(continued, { type: 'pose', locks: [{ index: 3, flow: -1 }, { index: 4, flow: 0.8 }], checkpoint: false })
    expect(finished.history).toHaveLength(state.history.length + 1)
    expect(finished.looks.mochi.hair[3]).toMatchObject({ flow: -1, curl: false, length: state.looks.mochi.hair[3].length })
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
    expect(huge.looks.mochi.hair[5].shape?.every((value) => value === 300)).toBe(true)
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
    const state = salonReducer(initial(), { type: 'accessory', accessory: 'flower' })
    const before = state.looks.mochi
    let next = state
    for (let i = 0; i < 60; i++) {
      next = salonReducer(next, { type: 'lengths', edits: [{ index: 5, length: 0.2 + i * 0.01 }], checkpoint: i === 0 })
    }
    expect(next.history).toHaveLength(state.history.length + 1)
    expect(next.looks.mochi.hair[5].length).toBeCloseTo(0.79)
    expect(next.looks.mochi.hair[5].color).toBe(before.hair[5].color)
    expect(next.looks.mochi.accessory).toBe('flower')
    expect(next.looks.biscuit).toBe(state.looks.biscuit)
    expect(salonReducer(next, { type: 'undo' }).looks.mochi).toEqual(before)
  })
  it('ignores no-op length changes and keeps continuous edits within the save format bounds', () => {
    const state = initial()
    expect(salonReducer(state, { type: 'lengths', edits: [{ index: 5, length: state.looks.mochi.hair[5].length }], checkpoint: true })).toBe(state)
    const bounded = salonReducer(state, { type: 'lengths', edits: [{ index: 4, length: -5 }, { index: 5, length: 6 }], checkpoint: true })
    expect(bounded.looks.mochi.hair[4].length).toBe(0.08)
    expect(bounded.looks.mochi.hair[5].length).toBe(1)
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
    const dressed = salonReducer(initial(), { type: 'accessory', accessory: 'bow' })
    const reset = salonReducer(dressed, { type: 'reset' })
    expect(reset.looks.mochi.accessory).toBe('none')
    expect(salonReducer(reset, { type: 'undo' }).looks.mochi.accessory).toBe('bow')
    expect(salonReducer(dressed, { type: 'undo' }).looks.mochi.accessory).toBe('none')
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
    expect(result.looks.mochi.hair.every((strand) => strand.curl)).toBe(true)
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
