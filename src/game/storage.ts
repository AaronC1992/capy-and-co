import { ACCESSORIES, CHARACTERS, createLooks, HAIR_BEND_LIMITS, HAIR_GROUP_COUNT, STRAND_COUNT } from './model'
import { isHairShape } from './hairLayout'
import type { CharacterId, Look, Looks } from './model'

export const STORAGE_KEY = 'capy-and-co:v1'
export const MAX_PHOTOS = 12
export interface Photo { id: string; look: Look; createdAt: string }
export interface SavedGame { version: 2; active: CharacterId; looks: Looks; photos: Photo[]; sound: boolean }
type StoredGame = Omit<SavedGame, 'version'> & { version: 1 | 2 }
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function freshSave(): SavedGame {
  return { version: 2, active: 'mochi', looks: createLooks(), photos: [], sound: false }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCharacter(value: unknown): value is CharacterId {
  return CHARACTERS.some((friend) => friend.id === value)
}

function isOptionalBoundedNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max)
}

export function isLook(value: unknown, legacy = false): value is Look {
  if (!isRecord(value) || !isCharacter(value.character) || !ACCESSORIES.some((a) => a === value.accessory)) return false
  return Array.isArray(value.hair) && (value.hair.length === STRAND_COUNT || (legacy && value.hair.length === HAIR_GROUP_COUNT)) && value.hair.every((strand: unknown) =>
    isRecord(strand)
    && typeof strand.length === 'number' && Number.isFinite(strand.length) && strand.length >= 0.08 && strand.length <= 1
    && typeof strand.color === 'string' && /^#[0-9a-f]{6}$/i.test(strand.color)
    && typeof strand.curl === 'boolean'
    && typeof strand.flow === 'number' && Number.isFinite(strand.flow) && strand.flow >= -1 && strand.flow <= 1
    && isOptionalBoundedNumber(strand.bendX, HAIR_BEND_LIMITS.minX, HAIR_BEND_LIMITS.maxX)
    && isOptionalBoundedNumber(strand.bendY, HAIR_BEND_LIMITS.minY, HAIR_BEND_LIMITS.maxY)
    && isOptionalBoundedNumber(strand.wetness, 0, 1)
    && (strand.shape === undefined || isHairShape(strand.shape))
    && (strand.soapy === undefined || typeof strand.soapy === 'boolean'),
  )
}

function isSave(value: unknown): value is StoredGame {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isCharacter(value.active) || typeof value.sound !== 'boolean' || !isRecord(value.looks)) return false
  // An already-open tab can save its old 13-strand state during a development refresh.
  const looks = value.looks
  if (!CHARACTERS.every(({ id }) => isLook(looks[id], true) && looks[id].character === id)) return false
  if (!Array.isArray(value.photos) || value.photos.length > MAX_PHOTOS) return false
  const ids = new Set<string>()
  return value.photos.every((photo: unknown) => {
    if (!isRecord(photo) || typeof photo.id !== 'string' || !photo.id || ids.has(photo.id) || !isLook(photo.look, true)
      || typeof photo.createdAt !== 'string' || !Number.isFinite(Date.parse(photo.createdAt))) return false
    ids.add(photo.id)
    return true
  })
}

function expandHair(look: Look): Look {
  if (look.hair.length === STRAND_COUNT) return look
  return { ...look, hair: Array.from({ length: STRAND_COUNT }, (_, index) => ({ ...look.hair[index % HAIR_GROUP_COUNT] })) }
}

export function loadGame(storage: StoragePort): { data: SavedGame; error: string | null } {
  try {
    const text = storage.getItem(STORAGE_KEY)
    if (text === null) return { data: freshSave(), error: null }
    const parsed: unknown = JSON.parse(text)
    if (!isSave(parsed)) throw new Error('The saved salon data has an invalid format.')
    return { data: {
      ...parsed, version: 2,
      looks: { mochi: expandHair(parsed.looks.mochi), biscuit: expandHair(parsed.looks.biscuit), cocoa: expandHair(parsed.looks.cocoa) },
      photos: parsed.photos.map((photo) => ({ ...photo, look: expandHair(photo.look) })),
    }, error: null }
  } catch (error) {
    console.warn('Could not load the local salon:', error)
    return { data: freshSave(), error: 'Your saved salon could not be opened. You can still play; new looks will be saved if browser storage is available.' }
  }
}

export function saveGame(storage: StoragePort, data: SavedGame): string | null {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return null
  } catch (error) {
    console.warn('Could not save the local salon:', error)
    return 'Browser storage is full or unavailable. You can keep playing, but these looks may not survive closing the page. Download pictures to keep them.'
  }
}

export function addPhoto(photos: Photo[], look: Look, id: string, date: string): Photo[] {
  return [{ id, createdAt: date, look: { ...look, hair: look.hair.map((strand) => ({ ...strand })) } }, ...photos].slice(0, MAX_PHOTOS)
}
