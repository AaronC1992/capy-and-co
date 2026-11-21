import { describe, expect, it } from 'vitest'
import type { Pt } from './hairline'
import { HEAD_OUTLINE, HEAD_PATH, headClearance, warmHeadShape } from './headShape'

// Reads the relative M, c, s, l and Z commands the head artwork uses into absolute lines and cubic curves.
function parsePath(path: string): Pt[][] {
  const pieces: Pt[][] = []
  let at: Pt = { x: 0, y: 0 }
  let start = at
  let previous = at
  for (const [, command, args] of path.matchAll(/([MmCcSsLlZz])([^MmCcSsLlZz]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number)
    const relative = (i: number): Pt => ({ x: at.x + n[i], y: at.y + n[i + 1] })
    if (command === 'M') {
      at = { x: n[0], y: n[1] }
      start = at
    } else if (command === 'c') {
      for (let i = 0; i < n.length; i += 6) {
        const piece = [at, relative(i), relative(i + 2), relative(i + 4)]
        pieces.push(piece)
        previous = piece[2]
        at = piece[3]
      }
    } else if (command === 's') {
      for (let i = 0; i < n.length; i += 4) {
        const piece = [at, { x: 2 * at.x - previous.x, y: 2 * at.y - previous.y }, relative(i), relative(i + 2)]
        pieces.push(piece)
        previous = piece[2]
        at = piece[3]
      }
    } else if (command === 'l') {
      for (let i = 0; i < n.length; i += 2) {
        const piece = [at, relative(i)]
        pieces.push(piece)
        at = piece[1]
      }
    } else if (command === 'Z') {
      pieces.push([at, start])
      at = start
    }
  }
  return pieces
}

describe('head shape', () => {
  it('describes the same outline the artwork draws', () => {
    expect(parsePath(HEAD_PATH)).toEqual(HEAD_OUTLINE)
  })

  it('is zero on the outline, negative inside and positive outside', () => {
    for (const [x, y] of [[250, 172], [168, 246], [333, 245], [345, 298], [250, 368], [155, 298]]) {
      expect(Math.abs(headClearance(x, y)), `${x},${y}`).toBeLessThan(1.5)
    }
    expect(headClearance(250, 300)).toBeLessThan(-50)
    expect(headClearance(198, 265)).toBeLessThan(-20)
    expect(headClearance(250, 120)).toBeGreaterThan(48)
    expect(headClearance(250, 120)).toBeLessThan(56)
    expect(headClearance(120, 250)).toBeGreaterThan(40)
    expect(headClearance(380, 330)).toBeGreaterThan(20)
  })

  it('measures real distance from the outline', () => {
    expect(headClearance(250, 150)).toBeCloseTo(22, 0)
    expect(headClearance(250, 195)).toBeCloseTo(-23, 0)
    expect(headClearance(250, 392)).toBeCloseTo(24, 0)
  })

  it('keeps growing past the edge of the distance field without a jump', () => {
    expect(Math.abs(headClearance(99.5, 250) - headClearance(100.5, 250))).toBeLessThan(3)
    expect(headClearance(20, 250)).toBeGreaterThan(headClearance(60, 250))
    expect(headClearance(250, 20)).toBeGreaterThan(headClearance(250, 100))
    expect(headClearance(500, 500)).toBeGreaterThan(100)
  })

  it('can be built ahead of the first spray', () => {
    const before = headClearance(250, 150)
    warmHeadShape()
    expect(headClearance(250, 150)).toBe(before)
  })
})
