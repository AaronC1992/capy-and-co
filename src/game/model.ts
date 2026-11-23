import { HAIR_GROUP_COUNT, HAIR_POINTS, HAIR_SHAPE_LENGTH, isBald, MAX_LENGTH, MIN_LENGTH, normalizeShape, resizeShape, STRAND_COUNT, STRANDS_PER_GROUP, strandReach } from './hairLayout'
import type { HairShape } from './hairLayout'

export { HAIR_GROUP_COUNT, STRAND_COUNT, STRANDS_PER_GROUP }

export const CHARACTERS = [
  { id: 'mochi', name: 'Mochi', personality: 'Sweet & a little shy', fur: '#bd8d67', light: '#dfb38b', hair: '#eb9c95', backdrop: '#f6e6e2' },
  { id: 'biscuit', name: 'Biscuit', personality: 'A pocketful of sunshine', fur: '#cb9b58', light: '#edc789', hair: '#e5b75c', backdrop: '#f7edce' },
  { id: 'cocoa', name: 'Cocoa', personality: 'Small paws, big ideas', fur: '#92705f', light: '#c3a08a', hair: '#ad9cc9', backdrop: '#ece7f2' },
] as const

export type CharacterId = typeof CHARACTERS[number]['id']
export type Tool = 'brush' | 'comb' | 'snip' | 'grow' | 'curl' | 'soap' | 'wash' | 'blower' | 'color'
// Things to wear on top: one hat, one pair of glasses and one headband at a time, plus clips put anywhere.
export const HATS = ['none', 'crown', 'party', 'beanie', 'sunhat', 'tophat', 'cowboy', 'chef', 'witch', 'pirate', 'cap', 'tiara', 'strawberry'] as const
export const GLASSES = ['none', 'round', 'hearts', 'stars', 'shades', 'cateye', 'goggles', 'monocle', 'disguise', 'rainbow'] as const
export const HEADBANDS = ['none', 'ribbon', 'bunny', 'kitty', 'flowers', 'unicorn', 'bee', 'bear', 'antlers', 'halo'] as const
export const CLIP_KINDS = ['bow', 'daisy', 'star', 'cherries', 'heart', 'butterfly', 'moon', 'rainbow', 'strawberry', 'shell', 'snowflake', 'ladybug'] as const
export const MAX_CLIPS = 12
export type Hat = typeof HATS[number]
export type Glasses = typeof GLASSES[number]
export type Headband = typeof HEADBANDS[number]
export type ClipKind = typeof CLIP_KINDS[number]
export const WEARABLES = { hat: HATS, glasses: GLASSES, headband: HEADBANDS } as const
export type WearSlot = keyof typeof WEARABLES
export const LASHES = ['none', 'natural', 'long', 'curly', 'doll', 'sparkle', 'rainbow'] as const
export const EYESHADOWS = ['none', 'pink', 'lilac', 'sky', 'peach', 'gold', 'rainbow'] as const
export const BLUSHES = ['none', 'rosy', 'peach', 'berry', 'hearts', 'stars', 'freckles'] as const
export const LIPSTICKS = ['none', 'pink', 'cherry', 'coral', 'berry', 'gloss', 'glitter'] as const
export type Lashes = typeof LASHES[number]
export type Eyeshadow = typeof EYESHADOWS[number]
export type Blush = typeof BLUSHES[number]
export type Lipstick = typeof LIPSTICKS[number]
// Makeup is painted on the face rather than worn on it, so it can't be moved around or dropped off.
export const MAKEUP = { lashes: LASHES, eyeshadow: EYESHADOWS, blush: BLUSHES, lipstick: LIPSTICKS } as const
export type MakeupSlot = keyof typeof MAKEUP
const DRESS_UP: Record<WearSlot | MakeupSlot, readonly string[]> = { ...WEARABLES, ...MAKEUP }
// The studio picture the capybara is drawn in; clips can go anywhere inside it.
export const STAGE = { width: 500, height: 520 } as const
// Clothes to dress up in, in the order they are offered. The first is what every capybara starts out wearing.
export const OUTFITS = [
  'cozy', 'hero', 'sweater', 'overalls', 'princess', 'tutu', 'hoodie', 'raincoat', 'party',
  'tee', 'garland', 'wizard', 'sailor', 'apron', 'pajamas', 'poncho', 'tuxedo', 'fairy',
  'sundress', 'mermaid', 'kimono', 'strawberry', 'unicorn', 'frost', 'butterfly', 'cupcake', 'heart', 'daisy',
] as const
export type Outfit = typeof OUTFITS[number]
export const DEFAULT_OUTFIT: Outfit = 'cozy'
export const COLORS = ['#eb9c95', '#b5a0d8', '#8cbfc4', '#a6bd87', '#e5b75c', '#c07955', '#6e5147', '#f3e1bd'] as const
export const COLOR_NAMES = ['Strawberry', 'Lavender', 'Blueberry', 'Pistachio', 'Honey', 'Caramel', 'Chocolate', 'Vanilla'] as const
// Special paints offered beside the plain colors: a rainbow from root to tip, and glitter that sparkles on top of any color.
export const RAINBOW = 'rainbow'
export const GLITTER = 'glitter'
// Where a plain color goes: the whole lock, just the tips with a crisp line, or the tips blending in from the roots.
export const DYE_MODES = ['whole', 'tips', 'fade'] as const
export type DyeMode = typeof DYE_MODES[number]
export const HEX_COLOR = /^#[0-9a-f]{6}$/i
export const HAIR_BEND_LIMITS = { minX: -95, maxX: 95, minY: -65, maxY: 85 } as const
// Pressing "do all the hair" with the curl tool winds every strand this much more; three presses make it fully curly.
const CURL_PER_PRESS = 0.34
// Pressing "do all the hair" with the scissors or the grow tool changes every strand's length this much.
const LENGTH_PER_PRESS = 0.2
// Hair past full length falls a long way, so each press grows or trims it by more.
const FALLEN_LENGTH_PER_PRESS = 0.5

export interface Strand {
  // How long the hair is: 1 stands at full height and MAX_LENGTH falls all the way to the floor. MIN_LENGTH is hair cut
  // right down to the scalp (see `isBald`).
  length: number
  color: string
  // How curly the hair is: 0 is straight, 1 is the tightest curls.
  curl: number
  flow: number
  bendX?: number
  bendY?: number
  // Brushed pose: displacement of each drawn point, saved so hair stays where it was left.
  shape?: HairShape
  soapy?: boolean
  wetness?: number
  // Dyed ends: the tips are this color, dipped with a crisp line, or blending in from the roots when `fade` is set.
  tip?: string
  fade?: boolean
  // Rainbow hair runs through every rainbow color from root to tip, ignoring `color` and `tip`.
  rainbow?: boolean
  glitter?: boolean
}

// A clip where it was put. A clip put on the hair holds the lock `strand` at its point `step`, and moves with it.
export interface Clip {
  kind: ClipKind
  x: number
  y: number
  strand?: number
  step?: number
}

export interface Spot {
  x: number
  y: number
}

export interface Look {
  character: CharacterId
  hair: Strand[]
  outfit: Outfit
  hat: Hat
  glasses: Glasses
  headband: Headband
  clips: Clip[]
  // Where the hat, glasses or headband was moved to; anything not listed sits where it usually does.
  placed?: Partial<Record<WearSlot, Spot>>
  lashes: Lashes
  eyeshadow: Eyeshadow
  blush: Blush
  lipstick: Lipstick
}

export interface HairLengthEdit {
  index: number
  length: number
  bendX?: number
  bendY?: number
  // Omit to rescale an existing brushed pose with the strand; null clears it.
  shape?: HairShape | null
}

// A strand left in a new pose by the brush or the comb.
export interface HairPoseEdit {
  index: number
  flow: number
  bendX?: number
  bendY?: number
  // Complete styled pose; omit to leave it unchanged, null clears it.
  shape?: HairShape | null
}

// How curly a strand is now, from 0 (straight) to 1 (tightest curls).
export interface HairCurlEdit {
  index: number
  curl: number
}

export interface HairAirEdit {
  index: number
  // Omit to leave the strand as damp as it is.
  wetness?: number
  // Blown pose to save so the hair stays swept; omit to leave it unchanged, null clears it.
  shape?: HairShape | null
  // Washes soap and dye out of the strand and straightens its curl, back to the natural color.
  rinse?: boolean
}

export type Looks = Record<CharacterId, Look>

export interface SalonState {
  active: CharacterId
  looks: Looks
  history: Look[]
}

export type SalonAction =
  | { type: 'select'; character: CharacterId }
  // `color` is a #rrggbb color, RAINBOW or GLITTER; `dye` says where a plain color goes (the whole lock if omitted).
  | { type: 'style'; tool: Tool; strands: number[]; color: string; direction: number; checkpoint: boolean; dye?: DyeMode }
  | { type: 'pose'; locks: HairPoseEdit[]; checkpoint: boolean }
  | { type: 'lengths'; edits: HairLengthEdit[]; checkpoint: boolean }
  | { type: 'curl'; edits: HairCurlEdit[]; checkpoint: boolean }
  | { type: 'air'; edits: HairAirEdit[]; checkpoint: boolean }
  | { type: 'wear'; slot: WearSlot | MakeupSlot; item: string }
  // Moves the hat, glasses or headband being worn so it sits at `x`, `y` (see `wornSpot`).
  | { type: 'place'; slot: WearSlot; x: number; y: number }
  // Every clip being worn, after one was put on, moved or taken off.
  | { type: 'clips'; clips: Clip[] }
  // Takes off every clip, the hat, the glasses and the headband in one go (makeup and the outfit stay).
  | { type: 'undress' }
  | { type: 'outfit'; outfit: Outfit }
  | { type: 'undo' }
  | { type: 'reset' }

export function createLook(character: CharacterId): Look {
  const friend = CHARACTERS.find((item) => item.id === character)!
  return {
    character,
    outfit: DEFAULT_OUTFIT,
    hat: 'none',
    glasses: 'none',
    headband: 'none',
    clips: [],
    lashes: 'none',
    eyeshadow: 'none',
    blush: 'none',
    lipstick: 'none',
    hair: Array.from({ length: STRAND_COUNT }, (_, i) => ({
      length: i % HAIR_GROUP_COUNT > 10 ? 0.45 : 0.52 + Math.sin(i % HAIR_GROUP_COUNT * 0.75) * 0.13,
      color: friend.hair,
      curl: 0,
      flow: 0.3,
    })),
  }
}

export function createLooks(): Looks {
  return { mochi: createLook('mochi'), biscuit: createLook('biscuit'), cocoa: createLook('cocoa') }
}

const round1 = (value: number) => Math.round(value * 10) / 10

function movedBack(look: Look, slot: WearSlot): Look {
  if (!look.placed?.[slot]) return look
  const placed = { ...look.placed }
  delete placed[slot]
  const next: Look = { ...look, placed }
  if (!Object.keys(placed).length) delete next.placed
  return next
}

// Whether the capybara has any clip, hat, glasses or headband on that `undress` could take off.
export function isDressed(look: Look): boolean {
  return look.clips.length > 0 || look.hat !== 'none' || look.glasses !== 'none' || look.headband !== 'none'
}

function remember(state: SalonState): Look[] {
  return [...state.history.slice(-39), state.looks[state.active]]
}

function withShape(strand: Strand, shape: HairShape | undefined): Strand {
  if (shape === strand.shape) return strand
  const next = { ...strand }
  if (shape) next.shape = shape
  else delete next.shape
  return next
}

// Resizes a strand without losing the brushed pose, which goes with the hair.
function resized(strand: Strand, index: number, length: number): Strand {
  return withShape({ ...strand, length }, resizeShape(strand.shape, index, strandReach(strand.length, index), strandReach(length, index)))
}

// Hair cut right down to the scalp is gone, and its brushed pose, soap, water, curls, dyed tips and glitter go with it.
// The color stays for when it grows back.
function shorn(strand: Strand): Strand {
  return { length: MIN_LENGTH, color: strand.color, curl: 0, flow: strand.flow, ...(strand.rainbow ? { rainbow: true } : {}) }
}

function withoutDye(strand: Strand): Strand {
  const next = { ...strand }
  delete next.tip
  delete next.fade
  delete next.rainbow
  return next
}

export function isDyed(strand: Strand, natural: string): boolean {
  return strand.color !== natural || strand.tip !== undefined || strand.rainbow === true || strand.glitter === true
}

// Paints one lock. Glitter is added over whatever color is there; rainbow and plain colors replace the old dye.
export function dyeStrand(strand: Strand, paint: string, mode: DyeMode = 'whole'): Strand {
  if (paint === GLITTER) return strand.glitter ? strand : { ...strand, glitter: true }
  if (paint === RAINBOW) return { ...withoutDye(strand), rainbow: true }
  if (!HEX_COLOR.test(paint)) return strand
  if (mode === 'whole') return { ...withoutDye(strand), color: paint }
  return { ...withoutDye(strand), tip: paint, ...(mode === 'fade' ? { fade: true } : {}) }
}

// Water washes soap, every kind of dye and the curl out, back to the friend's natural color.
function rinse(strand: Strand, natural: string): Strand {
  const next = { ...withoutDye(strand), color: natural, curl: 0, soapy: false }
  delete next.glitter
  return next
}

function isBoundedNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function isClip(value: unknown): value is Clip {
  if (typeof value !== 'object' || value === null) return false
  const clip = value as Record<string, unknown>
  const anchored = clip.strand !== undefined || clip.step !== undefined
  return CLIP_KINDS.some((kind) => kind === clip.kind) && isBoundedNumber(clip.x, 0, STAGE.width) && isBoundedNumber(clip.y, 0, STAGE.height)
    && (!anchored || (Number.isInteger(clip.strand) && isBoundedNumber(clip.strand, 0, STRAND_COUNT - 1) && Number.isInteger(clip.step) && isBoundedNumber(clip.step, 0, HAIR_POINTS)))
}

function sameClips(a: readonly Clip[], b: readonly Clip[]): boolean {
  return a.length === b.length && a.every((clip, index) => JSON.stringify(clip) === JSON.stringify(b[index]))
}

function isPlainShape(shape: unknown): boolean {
  return Array.isArray(shape) && shape.length === HAIR_SHAPE_LENGTH && shape.every((value) => typeof value === 'number' && Number.isFinite(value))
}

export function applyHairLengths(look: Look, edits: HairLengthEdit[]): Look {
  const lengths = new Map(edits.filter(({ index, length, bendX, bendY, shape }) => Number.isInteger(index) && index >= 0 && index < STRAND_COUNT && Number.isFinite(length)
    && (bendX === undefined || Number.isFinite(bendX)) && (bendY === undefined || Number.isFinite(bendY))
    && (shape === undefined || shape === null || isPlainShape(shape))).map((edit) => [edit.index, edit]))
  let changed = false
  const hair = look.hair.map((strand, index) => {
    const edit = lengths.get(index)
    if (!edit) return strand
    const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, edit.length))
    if (isBald(length)) {
      if (isBald(strand.length)) return strand
      changed = true
      return shorn(strand)
    }
    const bendX = edit.bendX === undefined ? strand.bendX : Math.max(HAIR_BEND_LIMITS.minX, Math.min(HAIR_BEND_LIMITS.maxX, edit.bendX))
    const bendY = edit.bendY === undefined ? strand.bendY : Math.max(HAIR_BEND_LIMITS.minY, Math.min(HAIR_BEND_LIMITS.maxY, edit.bendY))
    const shape = edit.shape === undefined
      ? resizeShape(strand.shape, index, strandReach(strand.length, index), strandReach(length, index))
      : normalizeShape(edit.shape)
    if (length === strand.length && bendX === strand.bendX && bendY === strand.bendY && shape === strand.shape) return strand
    changed = true
    return withShape({ ...strand, length, ...(bendX === undefined ? {} : { bendX }), ...(bendY === undefined ? {} : { bendY }) }, shape)
  })
  return changed ? { ...look, hair } : look
}

// Curling winds hair that has some length; bare scalp has nothing to curl.
export function applyHairCurl(look: Look, edits: HairCurlEdit[]): Look {
  const curls = new Map(edits.filter(({ index, curl }) => Number.isInteger(index) && index >= 0 && index < STRAND_COUNT && Number.isFinite(curl))
    .map((edit) => [edit.index, edit.curl]))
  let changed = false
  const hair = look.hair.map((strand, index) => {
    const wanted = curls.get(index)
    if (wanted === undefined || isBald(strand.length)) return strand
    const curl = Math.max(0, Math.min(1, wanted))
    if (curl === strand.curl) return strand
    changed = true
    return { ...strand, curl }
  })
  return changed ? { ...look, hair } : look
}

export function applyHairAir(look: Look, edits: HairAirEdit[]): Look {
  const selected = new Map(edits.filter(({ index, wetness, shape }) => Number.isInteger(index) && index >= 0 && index < STRAND_COUNT
    && (wetness === undefined || Number.isFinite(wetness))
    && (shape === undefined || shape === null || isPlainShape(shape))).map((edit) => [edit.index, edit]))
  const natural = CHARACTERS.find((friend) => friend.id === look.character)!.hair
  let changed = false
  const hair = look.hair.map((strand, index) => {
    const edit = selected.get(index)
    if (!edit || isBald(strand.length)) return strand
    const wetness = edit.wetness === undefined ? undefined : Math.max(0, Math.min(1, edit.wetness))
    const wetnessChanged = wetness !== undefined && wetness !== (strand.wetness ?? 0)
    const rinsed = edit.rinse === true && (strand.soapy === true || strand.curl > 0 || isDyed(strand, natural))
    const shape = edit.shape === undefined ? strand.shape : normalizeShape(edit.shape)
    if (!wetnessChanged && !rinsed && shape === strand.shape) return strand
    changed = true
    const clean = rinsed ? rinse(strand, natural) : strand
    return withShape(wetnessChanged ? { ...clean, wetness } : clean, shape)
  })
  return changed ? { ...look, hair } : look
}

export function salonReducer(state: SalonState, action: SalonAction): SalonState {
  const current = state.looks[state.active]
  if (action.type === 'select') return action.character === state.active ? state : { ...state, active: action.character, history: [] }
  if (action.type === 'undo') {
    const previous = state.history.at(-1)
    return previous ? { ...state, looks: { ...state.looks, [state.active]: previous }, history: state.history.slice(0, -1) } : state
  }
  if (action.type === 'reset') {
    return { ...state, looks: { ...state.looks, [state.active]: createLook(state.active) }, history: remember(state) }
  }
  if (action.type === 'wear') {
    const items = Object.hasOwn(DRESS_UP, action.slot) ? DRESS_UP[action.slot] : []
    if (!items.includes(action.item) || current[action.slot] === action.item) return state
    const worn = { ...current, [action.slot]: action.item }
    // Something taken off goes back to its usual place when it is put on again.
    const next = action.item === 'none' && Object.hasOwn(WEARABLES, action.slot) ? movedBack(worn, action.slot as WearSlot) : worn
    return { ...state, looks: { ...state.looks, [state.active]: next }, history: remember(state) }
  }
  if (action.type === 'place') {
    if (!Object.hasOwn(WEARABLES, action.slot) || current[action.slot] === 'none' || !Number.isFinite(action.x) || !Number.isFinite(action.y)) return state
    const spot = { x: round1(Math.max(0, Math.min(STAGE.width, action.x))), y: round1(Math.max(0, Math.min(STAGE.height, action.y))) }
    const before = current.placed?.[action.slot]
    if (before && before.x === spot.x && before.y === spot.y) return state
    return { ...state, looks: { ...state.looks, [state.active]: { ...current, placed: { ...current.placed, [action.slot]: spot } } }, history: remember(state) }
  }
  if (action.type === 'clips') {
    if (action.clips.length > MAX_CLIPS || !action.clips.every(isClip) || sameClips(action.clips, current.clips)) return state
    return { ...state, looks: { ...state.looks, [state.active]: { ...current, clips: action.clips.map((clip) => ({ ...clip })) } }, history: remember(state) }
  }
  if (action.type === 'undress') {
    if (!isDressed(current)) return state
    const bare: Look = { ...current, clips: [], hat: 'none', glasses: 'none', headband: 'none' }
    delete bare.placed
    return { ...state, looks: { ...state.looks, [state.active]: bare }, history: remember(state) }
  }
  if (action.type === 'outfit') {
    if (action.outfit === current.outfit || !OUTFITS.includes(action.outfit)) return state
    return { ...state, looks: { ...state.looks, [state.active]: { ...current, outfit: action.outfit } }, history: remember(state) }
  }
  if (action.type === 'lengths') {
    const next = applyHairLengths(current, action.edits)
    return next === current ? state : { ...state, looks: { ...state.looks, [state.active]: next }, history: action.checkpoint ? remember(state) : state.history }
  }
  if (action.type === 'curl') {
    const next = applyHairCurl(current, action.edits)
    return next === current ? state : { ...state, looks: { ...state.looks, [state.active]: next }, history: action.checkpoint ? remember(state) : state.history }
  }
  if (action.type === 'air') {
    const next = applyHairAir(current, action.edits)
    return next === current ? state : { ...state, looks: { ...state.looks, [state.active]: next }, history: action.checkpoint ? remember(state) : state.history }
  }
  if (action.type === 'pose') {
    const locks = new Map(action.locks.filter(({ index, flow, bendX, bendY, shape }) => Number.isInteger(index) && index >= 0 && index < STRAND_COUNT && Number.isFinite(flow)
      && (bendX === undefined || Number.isFinite(bendX)) && (bendY === undefined || Number.isFinite(bendY))
      && (shape === undefined || shape === null || isPlainShape(shape))).map((lock) => [lock.index, lock]))
    if (!locks.size) return state
    const hair = current.hair.map((strand, index) => {
      const lock = locks.get(index)
      if (!lock || isBald(strand.length)) return strand
      return withShape({
        ...strand, curl: 0, flow: Math.max(-1, Math.min(1, lock.flow)),
        ...(lock.bendX === undefined ? {} : { bendX: Math.max(HAIR_BEND_LIMITS.minX, Math.min(HAIR_BEND_LIMITS.maxX, lock.bendX)) }),
        ...(lock.bendY === undefined ? {} : { bendY: Math.max(HAIR_BEND_LIMITS.minY, Math.min(HAIR_BEND_LIMITS.maxY, lock.bendY)) }),
      }, lock.shape === undefined ? strand.shape : normalizeShape(lock.shape))
    })
    if (hair.every((strand, index) => strand === current.hair[index])) return state
    return { ...state, looks: { ...state.looks, [state.active]: { ...current, hair } }, history: action.checkpoint ? remember(state) : state.history }
  }
  const selected = new Set(action.strands.filter((i) => i >= 0 && i < STRAND_COUNT))
  if (!selected.size) return state
  const hair = current.hair.map((strand, i): Strand => {
    // Bare scalp has no hair to style, but growing always brings hair back.
    if (!selected.has(i) || (isBald(strand.length) && action.tool !== 'grow')) return strand
    switch (action.tool) {
      case 'snip': {
        // Long hair is trimmed back to full length before the standing hair gets any shorter.
        const shorter = strand.length > 1 ? Math.max(1, strand.length - FALLEN_LENGTH_PER_PRESS) : strand.length - LENGTH_PER_PRESS
        return resized(strand, i, Math.min(strand.length, Math.max(0.08, shorter)))
      }
      case 'grow': {
        // Standing hair grows to full height before it starts to fall.
        const longer = strand.length >= 1 ? strand.length + FALLEN_LENGTH_PER_PRESS : Math.min(1, strand.length + LENGTH_PER_PRESS)
        return resized(strand, i, Math.min(MAX_LENGTH, longer))
      }
      case 'curl': return { ...strand, curl: Math.min(1, strand.curl + CURL_PER_PRESS) }
      case 'brush':
      case 'comb': return { ...strand, curl: 0, flow: Math.max(-1, Math.min(1, action.direction)) }
      case 'color': return dyeStrand(strand, action.color, action.dye)
      case 'soap': return { ...strand, soapy: true, wetness: 1 }
      case 'wash': return { ...rinse(strand, CHARACTERS.find((friend) => friend.id === state.active)!.hair), wetness: 1 }
      case 'blower': return { ...strand, wetness: 0, bendY: Math.max(HAIR_BEND_LIMITS.minY, (strand.bendY ?? 0) - 18) }
    }
  })
  if (hair.every((strand, i) => strand === current.hair[i])) return state
  return {
    ...state,
    looks: { ...state.looks, [state.active]: { ...current, hair } },
    history: action.checkpoint ? remember(state) : state.history,
  }
}
