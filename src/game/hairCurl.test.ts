import { describe, expect, it } from 'vitest'
import { CURL_PER_SECOND, HairCurler } from './hairCurl'
import { strandPoints } from './hair'
import { MIN_LENGTH } from './hairLayout'
import { applyHairCurl, applyHairLengths, createLook } from './model'
import type { Look } from './model'

const STRAND = 5

// Holds the finger still, applying the edits each frame the way the studio does.
function hold(curler: HairCurler, look: Look, from: number, to: number, fps = 60): Look {
  const frames = Math.round((to - from) / 1000 * fps)
  let next = look
  for (let frame = 1; frame <= frames; frame++) {
    next = applyHairCurl(next, curler.hold(next, from + (to - from) * frame / frames))
  }
  return next
}

const middle = (look: Look, index = STRAND) => strandPoints(look.hair[index], index)[15]

describe('hold-to-curl', () => {
  it('curls a lock more and more the longer the finger stays on it, up to the tightest curls', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, middle(look), 0)
    const levels: number[] = []
    let next = look
    let now = 0
    for (const until of [250, 500, 1000, 1500, 2500]) {
      next = hold(curler, next, now, until)
      now = until
      levels.push(next.hair[STRAND].curl)
    }
    expect(levels[0]).toBeCloseTo(CURL_PER_SECOND * 0.25, 6)
    levels.slice(1).forEach((level, i) => expect(level).toBeGreaterThanOrEqual(levels[i]))
    expect(levels[1]).toBeGreaterThan(levels[0])
    expect(levels[2]).toBeGreaterThan(levels[1])
    expect(levels.at(-1)).toBe(1)
  })

  it('curls at the same speed whatever the frame rate', () => {
    const look = createLook('mochi')
    for (const fps of [30, 60, 120]) {
      const next = hold(new HairCurler(look, middle(look), 0), look, 0, 600, fps)
      expect(next.hair[STRAND].curl).toBeCloseTo(CURL_PER_SECOND * 0.6, 6)
    }
  })

  it('only curls the locks under the finger', () => {
    const look = createLook('mochi')
    const next = hold(new HairCurler(look, middle(look), 0), look, 0, 400)
    const curled = next.hair.flatMap((strand, index) => (strand.curl > 0 ? [index] : []))
    expect(curled).toContain(STRAND)
    expect(curled.length).toBeLessThan(look.hair.length / 4)
    next.hair.forEach((strand, index) => {
      if (!curled.includes(index)) expect(strand).toBe(look.hair[index])
    })
  })

  it('moves the curling to the hair under the finger and stops curling the locks it left', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, middle(look), 0)
    const first = hold(curler, look, 0, 300)
    const there = middle(first, 12)
    const second = hold(curler, applyHairCurl(first, curler.move(first, there, 300)), 300, 600)
    expect(second.hair[STRAND].curl).toBe(first.hair[STRAND].curl)
    expect(second.hair[12].curl - first.hair[12].curl).toBeCloseTo(CURL_PER_SECOND * 0.3, 6)
    curler.move(second, { x: 0, y: 0 }, 600)
    expect(hold(curler, second, 600, 1100)).toBe(second)
  })

  it('curls what a dragging finger crosses between move events, without counting the time twice', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, { x: 120, y: 155 }, 0)
    const swept = applyHairCurl(look, curler.move(look, { x: 420, y: 155 }, 40))
    expect(swept.hair[STRAND].curl).toBeCloseTo(CURL_PER_SECOND * 0.04, 6)
    expect(curler.hold(swept, 40)).toEqual([])
  })

  it('keeps its own copy of the finger position, since the browser reuses pointer points', () => {
    const look = createLook('mochi')
    const finger = { x: 120, y: 155 }
    const curler = new HairCurler(look, finger, 0)
    finger.x = 9999
    const swept = applyHairCurl(look, curler.move(look, { x: 420, y: 155 }, 40))
    expect(swept.hair[STRAND].curl).toBeGreaterThan(0)
  })

  it('does not jump after a stalled frame', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, middle(look), 0)
    const stalled = applyHairCurl(look, curler.hold(look, 5000))
    expect(stalled.hair[STRAND].curl).toBeCloseTo(CURL_PER_SECOND * 0.05, 6)
  })

  it('keeps a hold alive when the first frame timestamp is equal to or before pointer-down', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, middle(look), 100)
    expect(curler.hold(look, 100)).toEqual([])
    expect(curler.hold(look, 98)).toEqual([])
    expect(curler.canCurl(look)).toBe(true)
    expect(applyHairCurl(look, curler.hold(look, 116)).hair[STRAND].curl).toBeCloseTo(CURL_PER_SECOND * 0.016, 6)
  })

  it('stops at full curl, and immediately on release or cancellation', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, middle(look), 0)
    expect(curler.canCurl(look)).toBe(true)
    const full = hold(curler, look, 0, 4000)
    expect(full.hair[STRAND].curl).toBe(1)
    expect(curler.canCurl(full)).toBe(false)
    expect(curler.hold(full, 4020)).toEqual([])

    const released = new HairCurler(look, middle(look), 0)
    const early = hold(released, look, 0, 200)
    released.stop()
    expect(released.canCurl(early)).toBe(false)
    expect(hold(released, early, 200, 700)).toBe(early)
    expect(released.move(early, middle(early), 750)).toEqual([])
  })

  it('does nothing while the finger is off the hair', () => {
    const look = createLook('mochi')
    const curler = new HairCurler(look, { x: 250, y: 315 }, 0)
    expect(curler.canCurl(look)).toBe(false)
    expect(hold(curler, look, 0, 1000)).toBe(look)
  })

  it('never curls shaved scalp, which has no hair to wind', () => {
    const bald = applyHairLengths(createLook('mochi'), [{ index: STRAND, length: MIN_LENGTH }])
    const root = strandPoints(bald.hair[STRAND], STRAND)[0]
    const curler = new HairCurler(bald, root, 0)
    expect(hold(curler, bald, 0, 500).hair[STRAND]).toBe(bald.hair[STRAND])
    const swept = applyHairCurl(bald, curler.move(bald, { x: root.x + 40, y: root.y - 40 }, 600))
    expect(swept.hair[STRAND]).toBe(bald.hair[STRAND])
  })
})
