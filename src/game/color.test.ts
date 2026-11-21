import { describe, expect, it } from 'vitest'
import { mixColor } from './color'

describe('mixColor', () => {
  it('blends toward the other color by the given share', () => {
    expect(mixColor('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixColor('#ff0000', '#0000ff', 0.5)).toBe('#800080')
  })

  it('keeps the share inside zero to one', () => {
    expect(mixColor('#102030', '#ffffff', -4)).toBe('#102030')
    expect(mixColor('#102030', '#ffffff', 9)).toBe('#ffffff')
  })

  it('leaves colors it cannot read untouched', () => {
    expect(mixColor('pink', '#ffffff', 0.5)).toBe('pink')
    expect(mixColor('#abc', '#ffffff', 0.5)).toBe('#abc')
  })
})
