import { describe, expect, it } from 'vitest'
import { BodyTouch, isFaceSpot, isReaction, reactionFor, spotAt } from './reactions'
import type { Point } from './hair'

// Rubs back and forth along x, `swings` times, starting from `from`, and returns the tickles it caused.
function rub(touch: BodyTouch, from: Point, swings: number, reach = 12) {
  const spots = []
  for (let swing = 1; swing <= swings; swing += 1) {
    for (let step = 1; step <= 4; step += 1) {
      const x = swing % 2 ? from.x + reach * step / 4 : from.x + reach - reach * step / 4
      spots.push(touch.move({ x, y: from.y }))
    }
  }
  return spots.filter(Boolean)
}

describe('poking and tickling the capybara', () => {
  it('knows the eyes, nose, armpits and tummy, and nothing out in the salon', () => {
    expect(spotAt({ x: 198, y: 265 })).toBe('eye-left')
    expect(spotAt({ x: 305, y: 260 })).toBe('eye-right')
    expect(spotAt({ x: 250, y: 292 })).toBe('nose')
    expect(spotAt({ x: 170, y: 368 })).toBe('armpit-left')
    expect(spotAt({ x: 330, y: 362 })).toBe('armpit-right')
    expect(spotAt({ x: 250, y: 410 })).toBe('belly')
    expect(spotAt({ x: 250, y: 180 })).toBeNull()
    expect(spotAt({ x: 40, y: 40 })).toBeNull()
    expect(isFaceSpot('nose')).toBe(true)
    expect(isFaceSpot('eye-right')).toBe(true)
    expect(isFaceSpot('belly')).toBe(false)
    expect(isFaceSpot(null)).toBe(false)
  })

  it('reacts to each spot in its own way', () => {
    expect(reactionFor('eye-left', false)).toBe('poked-left')
    expect(reactionFor('eye-right', true)).toBe('poked-right')
    expect(reactionFor('nose', false)).toBe('sneeze')
    expect(reactionFor('nose', true)).toBe('sneeze')
    expect(reactionFor('belly', false)).toBe('boop')
    expect(reactionFor('belly', true)).toBe('ticklish')
    expect(reactionFor('armpit-right', true)).toBe('ticklish')
    expect(isReaction('sneeze')).toBe(true)
    expect(isReaction('giggle')).toBe(false)
  })

  it('takes a quick tap as a poke, but not a long press or a slide', () => {
    const tap = new BodyTouch({ x: 198, y: 265 }, 1000)
    tap.move({ x: 201, y: 266 })
    expect(tap.lift({ x: 201, y: 267 }, 1200)).toBe('eye-left')
    expect(new BodyTouch({ x: 250, y: 400 }, 0).lift({ x: 250, y: 400 }, 900)).toBeNull()
    const slide = new BodyTouch({ x: 250, y: 400 }, 0)
    slide.move({ x: 275, y: 400 })
    slide.move({ x: 251, y: 400 })
    expect(slide.lift({ x: 251, y: 400 }, 200)).toBeNull()
    expect(new BodyTouch({ x: 40, y: 40 }, 0).lift({ x: 40, y: 40 }, 100)).toBeNull()
  })

  it('feels rubbing back and forth over one spot as a tickle, but not a drag straight through it', () => {
    const armpit = new BodyTouch({ x: 160, y: 366 }, 0)
    expect(rub(armpit, { x: 160, y: 366 }, 6)).toEqual(['armpit-left', 'armpit-left'])
    const nose = new BodyTouch({ x: 240, y: 292 }, 0)
    expect(rub(nose, { x: 240, y: 292 }, 3)).toEqual(['nose'])
    const through = new BodyTouch({ x: 190, y: 402 }, 0)
    const passed = Array.from({ length: 30 }, (_, step) => through.move({ x: 190 + step * 4, y: 402 }))
    expect(passed.filter(Boolean)).toEqual([])
    // Tiny jitters don't count as rubbing.
    const jitter = new BodyTouch({ x: 250, y: 400 }, 0)
    const shakes = Array.from({ length: 20 }, (_, step) => jitter.move({ x: 250 + (step % 2) * 3, y: 400 }))
    expect(shakes.filter(Boolean)).toEqual([])
  })
})
