import { CHARACTERS, createLooks, DEFAULT_OUTFIT, GLASSES, HAIR_BEND_LIMITS, HAIR_GROUP_COUNT, HATS, HEADBANDS, HEX_COLOR, isClip, MAKEUP, MAX_CLIPS, OUTFITS, STAGE, STRAND_COUNT, WEARABLES } from './model'
import { isHairShape, MAX_LENGTH, MIN_LENGTH } from './hairLayout'
import { isScene } from './photoBooth'
import type { Scene } from './photoBooth'
import type { CharacterId, Clip, Look, Looks, MakeupSlot, Outfit, Strand } from './model'

export const STORAGE_KEY = 'capy-and-co:v1'
export const MAX_PHOTOS = 12
// Photos from before the photo booth have no scene.
export interface Photo { id: string; look: Look; createdAt: string; scene?: Scene }
export interface SavedGame { version: 3; active: CharacterId; looks: Looks; photos: Photo[]; sound: boolean }
// Saves made when curls were simply on or off hold a yes or no instead of how curly the hair is,
// and saves from before dress-up have no outfit at all.
type StoredStrand = Omit<Strand, 'curl'> & { curl: number | boolean }
// Saves from before hats, glasses and clips wore one little accessory on the head instead.
const LEGACY_ACCESSORIES = ['none', 'bow', 'flower', 'crown', 'cherries', 'star'] as const
type LegacyAccessory = typeof LEGACY_ACCESSORIES[number]
// Where those accessories sat, so they come back as clips in the same spot.
const LEGACY_CLIPS: Partial<Record<LegacyAccessory, Clip>> = {
  bow: { kind: 'bow', x: 300, y: 172 },
  flower: { kind: 'daisy', x: 312, y: 186 },
  cherries: { kind: 'cherries', x: 303, y: 165 },
  star: { kind: 'star', x: 303, y: 178 },
}
type Wearables = Pick<Look, 'hat' | 'glasses' | 'headband' | 'clips' | 'placed'>
type StoredWear = (Wearables & { accessory?: undefined }) | ({ accessory: LegacyAccessory } & Partial<Record<keyof Wearables, undefined>>)
// Saves from before makeup have none on.
type StoredLook = Omit<Look, 'hair' | 'outfit' | keyof Wearables | MakeupSlot> & Partial<Pick<Look, MakeupSlot>> & { outfit?: Outfit; hair: StoredStrand[] } & StoredWear
const MAKEUP_SLOTS = Object.keys(MAKEUP) as MakeupSlot[]
type StoredGame = Omit<SavedGame, 'version' | 'looks' | 'photos'> & {
  version: 1 | 2 | 3
  looks: Record<CharacterId, StoredLook>
  photos: (Omit<Photo, 'look'> & { look: StoredLook })[]
}
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
// How curly hair that was saved as "curly" comes back: noticeably wavy, with room to curl tighter.
const LEGACY_CURL = 0.4

export function freshSave(): SavedGame {
  return { version: 3, active: 'mochi', looks: createLooks(), photos: [], sound: false }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCharacter(value: unknown): value is CharacterId {
  return CHARACTERS.some((friend) => friend.id === value)
}

function isBoundedNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isOptionalBoundedNumber(value: unknown, min: number, max: number): boolean {
  return value === undefined || isBoundedNumber(value, min, max)
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function isHexColor(value: unknown): boolean {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

// Where moved things sit: only spots on the picture, for things that are being worn.
function isPlaced(value: Record<string, unknown>): boolean {
  const placed = value.placed
  if (placed === undefined) return true
  return isRecord(placed) && !Array.isArray(placed) && Object.entries(placed).every(([slot, spot]) => Object.hasOwn(WEARABLES, slot) && value[slot] !== 'none'
    && isRecord(spot) && isBoundedNumber(spot.x, 0, STAGE.width) && isBoundedNumber(spot.y, 0, STAGE.height))
}

function isWorn(value: Record<string, unknown>): boolean {
  if (value.accessory !== undefined) {
    return LEGACY_ACCESSORIES.some((item) => item === value.accessory)
      && value.hat === undefined && value.glasses === undefined && value.headband === undefined && value.clips === undefined && value.placed === undefined
  }
  return HATS.some((item) => item === value.hat) && GLASSES.some((item) => item === value.glasses) && HEADBANDS.some((item) => item === value.headband)
    && Array.isArray(value.clips) && value.clips.length <= MAX_CLIPS && value.clips.every(isClip) && isPlaced(value)
}

function isMadeUp(value: Record<string, unknown>): boolean {
  return MAKEUP_SLOTS.every((slot) => value[slot] === undefined || MAKEUP[slot].some((item) => item === value[slot]))
}

export function isLook(value: unknown, legacy = false): value is StoredLook {
  if (!isRecord(value) || !isCharacter(value.character) || !isWorn(value) || !isMadeUp(value)) return false
  if (value.outfit !== undefined && !OUTFITS.some((o) => o === value.outfit)) return false
  return Array.isArray(value.hair) && (value.hair.length === STRAND_COUNT || (legacy && value.hair.length === HAIR_GROUP_COUNT)) && value.hair.every((strand: unknown) =>
    isRecord(strand)
    && typeof strand.length === 'number' && Number.isFinite(strand.length) && strand.length >= MIN_LENGTH && strand.length <= MAX_LENGTH
    && isHexColor(strand.color)
    && (typeof strand.curl === 'boolean' || (typeof strand.curl === 'number' && Number.isFinite(strand.curl) && strand.curl >= 0 && strand.curl <= 1))
    && typeof strand.flow === 'number' && Number.isFinite(strand.flow) && strand.flow >= -1 && strand.flow <= 1
    && isOptionalBoundedNumber(strand.bendX, HAIR_BEND_LIMITS.minX, HAIR_BEND_LIMITS.maxX)
    && isOptionalBoundedNumber(strand.bendY, HAIR_BEND_LIMITS.minY, HAIR_BEND_LIMITS.maxY)
    && isOptionalBoundedNumber(strand.wetness, 0, 1)
    && (strand.shape === undefined || isHairShape(strand.shape))
    && isOptionalBoolean(strand.soapy)
    && (strand.tip === undefined || isHexColor(strand.tip))
    && isOptionalBoolean(strand.fade) && isOptionalBoolean(strand.rainbow) && isOptionalBoolean(strand.glitter),
  )
}

function isSave(value: unknown): value is StoredGame {
  if (!isRecord(value) || ![1, 2, 3].includes(value.version as number) || !isCharacter(value.active) || typeof value.sound !== 'boolean' || !isRecord(value.looks)) return false
  // An already-open tab can save its old 13-strand state during a development refresh.
  const looks = value.looks
  if (!CHARACTERS.every(({ id }) => isLook(looks[id], true) && looks[id].character === id)) return false
  if (!Array.isArray(value.photos) || value.photos.length > MAX_PHOTOS) return false
  const ids = new Set<string>()
  return value.photos.every((photo: unknown) => {
    if (!isRecord(photo) || typeof photo.id !== 'string' || !photo.id || ids.has(photo.id) || !isLook(photo.look, true)
      || typeof photo.createdAt !== 'string' || !Number.isFinite(Date.parse(photo.createdAt)) || (photo.scene !== undefined && !isScene(photo.scene))) return false
    ids.add(photo.id)
    return true
  })
}

function readCurl(curl: number | boolean): number {
  if (typeof curl === 'number') return curl
  return curl ? LEGACY_CURL : 0
}

function readWearables(look: StoredLook): Wearables {
  if (look.accessory !== undefined) {
    const clip = LEGACY_CLIPS[look.accessory]
    return { hat: look.accessory === 'crown' ? 'crown' : 'none', glasses: 'none', headband: 'none', clips: clip ? [{ ...clip }] : [] }
  }
  const wearables: Wearables = { hat: look.hat, glasses: look.glasses, headband: look.headband, clips: look.clips.map((clip) => ({ ...clip })) }
  if (look.placed) wearables.placed = copyPlaced(look.placed)
  return wearables
}

function copyPlaced(placed: NonNullable<Look['placed']>): NonNullable<Look['placed']> {
  return Object.fromEntries(Object.entries(placed).map(([slot, spot]) => [slot, { x: spot.x, y: spot.y }]))
}

function readLook(look: StoredLook): Look {
  const hair = look.hair.length === STRAND_COUNT
    ? look.hair
    : Array.from({ length: STRAND_COUNT }, (_, index) => look.hair[index % HAIR_GROUP_COUNT])
  return {
    character: look.character,
    outfit: look.outfit ?? DEFAULT_OUTFIT,
    ...readWearables(look),
    lashes: look.lashes ?? 'none',
    eyeshadow: look.eyeshadow ?? 'none',
    blush: look.blush ?? 'none',
    lipstick: look.lipstick ?? 'none',
    hair: hair.map((strand) => ({ ...strand, curl: readCurl(strand.curl) })),
  }
}

export function loadGame(storage: StoragePort): { data: SavedGame; error: string | null } {
  try {
    const text = storage.getItem(STORAGE_KEY)
    if (text === null) return { data: freshSave(), error: null }
    const parsed: unknown = JSON.parse(text)
    if (!isSave(parsed)) throw new Error('The saved salon data has an invalid format.')
    return { data: {
      ...parsed, version: 3,
      looks: { mochi: readLook(parsed.looks.mochi), biscuit: readLook(parsed.looks.biscuit), cocoa: readLook(parsed.looks.cocoa) },
      photos: parsed.photos.map((photo) => ({ ...photo, look: readLook(photo.look) })),
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

export function addPhoto(photos: Photo[], look: Look, id: string, date: string, scene?: Scene): Photo[] {
  const photo: Photo = { id, createdAt: date, look: { ...look, hair: look.hair.map((strand) => ({ ...strand })), clips: look.clips.map((clip) => ({ ...clip })) } }
  if (look.placed) photo.look.placed = copyPlaced(look.placed)
  if (scene) photo.scene = { ...scene, stickers: scene.stickers.map((sticker) => ({ ...sticker })) }
  return [photo, ...photos].slice(0, MAX_PHOTOS)
}
