import { afterEach, describe, expect, it, vi } from 'vitest'
import { addPhoto, freshSave, isLook, loadGame, MAX_PHOTOS, saveGame, STORAGE_KEY } from './storage'
import type { StoragePort } from './storage'
import { createLook, HAIR_GROUP_COUNT, STRAND_COUNT } from './model'
import { MIN_LENGTH } from './hairLayout'

function memoryStorage(): StoragePort {
  const entries = new Map<string, string>()
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value) } }
}
afterEach(() => vi.restoreAllMocks())

describe('local persistence', () => {
  it('starts a fresh, silent salon when storage is empty', () => {
    expect(loadGame(memoryStorage())).toEqual({ data: freshSave(), error: null })
  })
  it('round-trips every friend, selection, gallery and sound setting', () => {
    const storage = memoryStorage()
    const data = freshSave()
    data.active = 'cocoa'
    data.sound = true
    data.looks.cocoa.accessory = 'crown'
    data.looks.cocoa.hair[5] = { ...data.looks.cocoa.hair[5], bendX: 70, bendY: -45, soapy: true, wetness: 0.4, curl: 0.65, shape: Array.from({ length: 48 }, (_, slot) => slot / 3 - 5) }
    data.photos = addPhoto([], data.looks.cocoa, 'photo-1', '2026-01-01T12:00:00Z')
    expect(saveGame(storage, data)).toBeNull()
    expect(loadGame(storage).data).toEqual(data)
  })
  it.each([{ version: 1, soap: false }, { version: 1, soap: true }, { version: 2, soap: true }])('expands old hair and photos without losing styles, including saves made during hot reload: %o', ({ version, soap }) => {
    const storage = memoryStorage()
    const legacy = { ...freshSave(), version }
    for (const look of Object.values(legacy.looks)) look.hair = look.hair.slice(0, HAIR_GROUP_COUNT)
    legacy.looks.mochi.hair[3].flow = -0.75
    legacy.looks.mochi.accessory = 'flower'
    if (soap) legacy.looks.mochi.hair[3] = { ...legacy.looks.mochi.hair[3], soapy: true, bendX: 50, bendY: -30 }
    legacy.photos = addPhoto([], legacy.looks.mochi, 'legacy', '2026-01-01T12:00:00Z')
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const { data, error } = loadGame(storage)
    expect(error).toBeNull()
    expect(data.version).toBe(2)
    expect(data.looks.mochi.hair).toHaveLength(65)
    expect(data.looks.mochi.accessory).toBe('flower')
    for (let index = 3; index < STRAND_COUNT; index += HAIR_GROUP_COUNT) {
      expect(data.looks.mochi.hair[index]).toEqual(legacy.looks.mochi.hair[3])
      expect(data.photos[0].look.hair[index]).toEqual(legacy.looks.mochi.hair[3])
      expect(data.looks.mochi.hair[index]).not.toBe(data.photos[0].look.hair[index])
    }
    expect(saveGame(storage, data)).toBeNull()
    expect(loadGame(storage).data).toEqual(data)
  })
  it.each([
    { strands: 13, curl: true, expected: 0.4 }, { strands: 13, curl: false, expected: 0 },
    { strands: 65, curl: true, expected: 0.4 }, { strands: 65, curl: false, expected: 0 },
  ])('opens saves from when curls were only on or off, as $strands strands with curl $curl', ({ strands, curl, expected }) => {
    const storage = memoryStorage()
    const legacy = JSON.parse(JSON.stringify({ ...freshSave(), version: strands === 13 ? 1 : 2 }))
    for (const look of Object.values<{ hair: { curl: unknown }[] }>(legacy.looks)) {
      look.hair = look.hair.slice(0, strands)
      for (const strand of look.hair) strand.curl = curl
    }
    const photo = JSON.parse(JSON.stringify(legacy.looks.mochi))
    legacy.photos = [{ id: 'old', look: photo, createdAt: '2026-01-01T12:00:00Z' }]
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const { data, error } = loadGame(storage)
    expect(error).toBeNull()
    expect(data.looks.mochi.hair).toHaveLength(STRAND_COUNT)
    expect(data.looks.cocoa.hair.every((strand) => strand.curl === expected)).toBe(true)
    expect(data.photos[0].look.hair.every((strand) => strand.curl === expected)).toBe(true)
    expect(saveGame(storage, data)).toBeNull()
    expect(loadGame(storage).data).toEqual(data)
  })
  it('keeps hair that was cut right down to the scalp, so a shaved look survives a reload', () => {
    const storage = memoryStorage()
    const data = freshSave()
    data.looks.mochi.hair[5] = { length: MIN_LENGTH, color: '#eb9c95', curl: 0, flow: 0.3 }
    data.looks.mochi.hair[6] = { ...data.looks.mochi.hair[6], length: -0.1 }
    data.photos = addPhoto([], data.looks.mochi, 'shaved', '2026-01-01T12:00:00Z')
    expect(isLook(data.looks.mochi)).toBe(true)
    expect(saveGame(storage, data)).toBeNull()
    expect(loadGame(storage)).toEqual({ data, error: null })
  })
  it('keeps the outfit each friend and each saved picture is wearing through a reload', () => {
    const storage = memoryStorage()
    const data = freshSave()
    data.looks.cocoa.outfit = 'wizard'
    data.looks.mochi.outfit = 'fairy'
    data.photos = addPhoto([], data.looks.cocoa, 'photo-1', '2026-01-01T12:00:00Z')
    data.looks.cocoa.outfit = 'tutu'
    expect(saveGame(storage, data)).toBeNull()
    const loaded = loadGame(storage)
    expect(loaded).toEqual({ data, error: null })
    expect(loaded.data.looks.mochi.outfit).toBe('fairy')
    expect(loaded.data.looks.cocoa.outfit).toBe('tutu')
    expect(loaded.data.photos[0].look.outfit).toBe('wizard')
  })
  it('opens saves from before dress-up in the original cozy cape, in looks and saved pictures', () => {
    const storage = memoryStorage()
    const data = freshSave()
    data.photos = addPhoto([], data.looks.mochi, 'old', '2026-01-01T12:00:00Z')
    const legacy = JSON.parse(JSON.stringify(data))
    for (const look of [...Object.values<{ outfit?: string }>(legacy.looks), legacy.photos[0].look]) delete look.outfit
    expect(JSON.stringify(legacy)).not.toContain('outfit')
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const loaded = loadGame(storage)
    expect(loaded).toEqual({ data, error: null })
    expect(Object.values(loaded.data.looks).every((look) => look.outfit === 'cozy')).toBe(true)
    expect(loaded.data.photos[0].look.outfit).toBe('cozy')
  })
  it('rejects an outfit that does not exist, in both looks and saved pictures', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const outfit of ['', 'pirate', 'Cozy', 7, null, {}]) {
      const corrupted = { ...createLook('mochi'), outfit }
      expect(isLook(corrupted)).toBe(false)
      const storage = memoryStorage()
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...freshSave(), photos: [{ id: 'bad', look: corrupted, createdAt: '2026-01-01T12:00:00Z' }] }))
      expect(loadGame(storage).error).not.toBeNull()
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...freshSave(), looks: { ...freshSave().looks, mochi: corrupted } }))
      expect(loadGame(storage).error).not.toBeNull()
    }
  })
  it('rejects malformed or out-of-bounds poses and lather in both looks and saved pictures', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const invalid of [{ bendX: 96 }, { bendY: -66 }, { bendY: null }, { bendX: '50' }, { soapy: 'yes' }, { wetness: 2 }, { wetness: -0.1 }, { wetness: 'wet' },
      { curl: 1.5 }, { curl: -0.2 }, { curl: '0.5' }, { curl: null }, { curl: Number.NaN }, { length: MIN_LENGTH - 0.01 }, { length: 1.01 },
      { shape: [1, 2] }, { shape: null }, { shape: new Array(48).fill(301) }, { shape: new Array(48).fill('1') }, { shape: new Array(48).fill(null) }]) {
      const look = createLook('mochi')
      const corrupted = { ...look, hair: look.hair.map((strand, i) => i === 5 ? { ...strand, ...invalid } : strand) }
      expect(isLook(corrupted)).toBe(false)
      const storage = memoryStorage()
      storage.setItem(STORAGE_KEY, JSON.stringify({
        ...freshSave(), photos: [{ id: 'bad', look: corrupted, createdAt: '2026-01-01T12:00:00Z' }],
      }))
      expect(loadGame(storage).error).not.toBeNull()
    }
  })
  it.each(['bad JSON', '{"version":99}', '{"version":1}'])('reports malformed saves: %s', (text) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, text)
    expect(loadGame(storage).error).toMatch(/could not be opened/)
  })
  it('rejects invalid hair lengths, colors and mismatched characters', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const look = createLook('mochi')
    expect(isLook({ ...look, hair: [] })).toBe(false)
    look.hair[0].length = Infinity
    expect(isLook(look)).toBe(false)
    look.hair[0].length = 0.5
    look.hair[0].color = 'url(https://example.com)'
    expect(isLook(look)).toBe(false)
    const save = freshSave()
    save.looks.mochi = createLook('cocoa')
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify(save))
    expect(loadGame(storage).error).not.toBeNull()
  })
  it('handles blocked storage and quota failures without losing in-memory play', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const blocked: StoragePort = { getItem: () => { throw new Error('Denied') }, setItem: () => { throw new Error('Quota') } }
    expect(loadGame(blocked).data.looks.mochi.hair).toHaveLength(STRAND_COUNT)
    expect(loadGame(blocked).error).not.toBeNull()
    expect(saveGame(blocked, freshSave())).toMatch(/storage is full or unavailable/)
  })
  it('snapshots a look so later styling cannot change a saved picture', () => {
    const look = createLook('mochi')
    look.hair[0] = { ...look.hair[0], bendX: 45, bendY: 30, soapy: true }
    const photos = addPhoto([], look, '1', '2026-01-01T12:00:00Z')
    look.hair[0].color = '#000000'
    look.hair[0].bendX = 0
    look.hair[0].soapy = false
    look.accessory = 'star'
    expect(photos[0].look.hair[0].color).not.toBe('#000000')
    expect(photos[0].look.accessory).toBe('none')
    expect(photos[0].look.hair[0]).toMatchObject({ bendX: 45, bendY: 30, soapy: true })
  })
  it('keeps only the 12 most recent pictures in newest-first order', () => {
    let photos = freshSave().photos
    for (let i = 0; i < 20; i++) photos = addPhoto(photos, createLook('biscuit'), String(i), '2026-01-01T12:00:00Z')
    expect(photos).toHaveLength(MAX_PHOTOS)
    expect(photos[0].id).toBe('19')
    expect(photos.at(-1)?.id).toBe('8')
  })
})
