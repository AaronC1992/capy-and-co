import { describe, expect, it } from 'vitest'
import { strandPoints } from './hair'
import { headTopY, hairRoot, SCALP_CAP_POINTS, scalpTints, TOP_ROOT_GAP, TOP_ROOT_X } from './hairline'
import { createLook, HAIR_GROUP_COUNT, STRAND_COUNT } from './model'
import { isSideStrand } from './hairLayout'

function inside(point: { x: number; y: number }, polygon: readonly { x: number; y: number }[]): boolean {
  let result = false
  for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a, a += 1) {
    const crosses = (polygon[a].y > point.y) !== (polygon[b].y > point.y)
      && point.x < (polygon[b].x - polygon[a].x) * (point.y - polygon[a].y) / (polygon[b].y - polygon[a].y) + polygon[a].x
    if (crosses) result = !result
  }
  return result
}

describe('hairline and scalp cover', () => {
  it('follows the drawn head outline', () => {
    expect(headTopY(249)).toBeCloseTo(172, 0)
    expect(headTopY(175)).toBeCloseTo(208, 0)
    expect(headTopY(325)).toBeCloseTo(207, 0)
    expect(headTopY(200)).toBeLessThan(headTopY(180))
    expect(headTopY(300)).toBeLessThan(headTopY(320))
  })

  it('roots every top strand just inside the head curve instead of floating below it', () => {
    for (let index = 0; index < STRAND_COUNT; index += 1) {
      if (isSideStrand(index)) continue
      const root = hairRoot(index)
      expect(root.y - headTopY(root.x)).toBeGreaterThanOrEqual(4)
      expect(root.y - headTopY(root.x)).toBeLessThanOrEqual(14)
    }
    const crown = hairRoot(5)
    const edge = hairRoot(0)
    expect(crown.y).toBeLessThan(edge.y - 20)
    expect(strandPoints(createLook('mochi').hair[5], 5)[0]).toEqual(crown)
  })

  it('covers the whole top of the head so no bare scalp can show between or under the strands', () => {
    for (let x = TOP_ROOT_X; x <= TOP_ROOT_X + 10 * TOP_ROOT_GAP; x += 5) {
      const top = headTopY(x)
      for (const depth of [0, 3, 8, 14, 18]) expect(inside({ x, y: top + depth }, SCALP_CAP_POINTS), `x ${x}, depth ${depth}`).toBe(true)
      expect(inside({ x, y: top - 8 }, SCALP_CAP_POINTS)).toBe(false)
    }
    expect(inside({ x: 250, y: headTopY(250) + 40 }, SCALP_CAP_POINTS)).toBe(false)
  })

  it('tints each column from the strands growing there', () => {
    const look = createLook('mochi')
    for (let layer = 0; layer < 5; layer += 1) look.hair[layer * HAIR_GROUP_COUNT + 2] = { ...look.hair[layer * HAIR_GROUP_COUNT + 2], color: '#000000', wetness: 1, soapy: true }
    look.hair[HAIR_GROUP_COUNT + 6] = { ...look.hair[HAIR_GROUP_COUNT + 6], color: '#ffffff', soapy: true }
    const tints = scalpTints(look.hair)
    expect(tints).toHaveLength(11)
    expect(tints[2]).toMatchObject({ x: TOP_ROOT_X + 2 * TOP_ROOT_GAP, color: '#000000', wetness: 1, soap: 1 })
    expect(tints[0]).toMatchObject({ color: '#eb9c95', wetness: 0, soap: 0 })
    expect(tints[6].color).not.toBe('#eb9c95')
    expect(tints[6].soap).toBeCloseTo(0.2)
  })
})
