import { describe, expect, it } from 'vitest'
import { dropSticker, freshScene, isOnPicture, isScene, MAX_STICKERS, nextStickerSpot, placeSticker, PLAIN_SCENE, SCENE, STICKER_REACH, stickerAt } from './photoBooth'
import type { Scene, Sticker } from './photoBooth'

const withStickers = (stickers: Sticker[]): Scene => ({ ...freshScene(), stickers })

describe('photo booth scenes', () => {
  it('accepts every kind of scene a picture can be saved with', () => {
    expect(isScene(freshScene())).toBe(true)
    expect(isScene(PLAIN_SCENE)).toBe(true)
    expect(isScene({ background: 'party', frame: 'gold', face: 'surprised', stickers: [{ kind: 'paw', x: 0, y: 0 }, { kind: 'balloon', x: SCENE.width, y: SCENE.height }] })).toBe(true)
  })
  it('rejects scenes with pieces that do not exist, too many stickers, or stickers off the picture', () => {
    const sticker = { kind: 'heart', x: 100, y: 100 }
    for (const invalid of [{ background: 'moon' }, { frame: 'wood' }, { face: 'squint' }, { face: undefined }, { stickers: undefined }, { stickers: {} },
      { stickers: Array.from({ length: MAX_STICKERS + 1 }, () => sticker) }, { stickers: [{ ...sticker, kind: 'dragon' }] }, { stickers: [{ ...sticker, x: -1 }] },
      { stickers: [{ ...sticker, y: SCENE.height + 1 }] }, { stickers: [{ ...sticker, x: Number.NaN }] }, { stickers: [{ ...sticker, x: '5' }] }, { stickers: [{ kind: 'heart', x: 5 }] }, { stickers: [null] }]) {
      expect(isScene({ ...freshScene(), ...invalid }), JSON.stringify(invalid)).toBe(false)
    }
    expect(isScene(null)).toBe(false)
  })
})

describe('stickers', () => {
  it('sticks a sticker where the picture is tapped, kept on the picture, without changing the old scene', () => {
    const scene = freshScene()
    const next = placeSticker(scene, 'star', { x: 120.04, y: 80.06 })
    expect(next.stickers).toEqual([{ kind: 'star', x: 120, y: 80.1 }])
    expect(scene.stickers).toEqual([])
    expect(placeSticker(next, 'cloud', { x: -40, y: 999 }).stickers[1]).toEqual({ kind: 'cloud', x: 0, y: SCENE.height })
  })
  it('stops adding stickers once the picture is full', () => {
    const full = withStickers(Array.from({ length: MAX_STICKERS }, (_, i): Sticker => ({ kind: 'heart', x: 20 + i * 30, y: 200 })))
    expect(placeSticker(full, 'star', { x: 10, y: 10 })).toBe(full)
  })
  it('finds a free spot for each new sticker until the picture is full, all on the picture', () => {
    let scene = freshScene()
    for (let i = 0; i < MAX_STICKERS; i++) {
      const spot = nextStickerSpot(scene.stickers)
      expect(isOnPicture(spot)).toBe(true)
      expect(scene.stickers.every((sticker) => Math.hypot(sticker.x - spot.x, sticker.y - spot.y) > STICKER_REACH)).toBe(true)
      scene = placeSticker(scene, 'sparkle', spot)
    }
    expect(scene.stickers).toHaveLength(MAX_STICKERS)
    // With every nice spot taken, the next one still lands on the picture.
    expect(isOnPicture(nextStickerSpot(scene.stickers))).toBe(true)
  })
  it('picks up the sticker on top when stickers overlap, and nothing when the tap misses', () => {
    const stickers: Sticker[] = [{ kind: 'heart', x: 100, y: 100 }, { kind: 'star', x: 110, y: 100 }, { kind: 'paw', x: 300, y: 300 }]
    expect(stickerAt(stickers, { x: 104, y: 100 })).toBe(1)
    expect(stickerAt(stickers, { x: 100 - STICKER_REACH, y: 100 })).toBe(0)
    expect(stickerAt(stickers, { x: 300, y: 300 + STICKER_REACH + 1 })).toBe(-1)
    expect(stickerAt([], { x: 0, y: 0 })).toBe(-1)
  })
  it('moves a dropped sticker, and peels it off when it is dropped off the picture', () => {
    const scene = withStickers([{ kind: 'heart', x: 100, y: 100 }, { kind: 'star', x: 200, y: 200 }, { kind: 'paw', x: 300, y: 300 }])
    expect(dropSticker(scene, 1, { x: 50.04, y: SCENE.height }).stickers).toEqual([{ kind: 'heart', x: 100, y: 100 }, { kind: 'star', x: 50, y: SCENE.height }, { kind: 'paw', x: 300, y: 300 }])
    expect(dropSticker(scene, 1, { x: 200, y: -1 }).stickers.map((sticker) => sticker.kind)).toEqual(['heart', 'paw'])
    expect(dropSticker(scene, 0, { x: SCENE.width + 5, y: 100 }).stickers.map((sticker) => sticker.kind)).toEqual(['star', 'paw'])
    expect(scene.stickers[1]).toEqual({ kind: 'star', x: 200, y: 200 })
  })
})
