import { HAIR_GROUP_COUNT, HAIR_SHAPE_LENGTH, isBald, MIN_LENGTH, normalizeShape, scaleShape, STRAND_COUNT, STRANDS_PER_GROUP, strandReach } from './hairLayout'
import type { HairShape } from './hairLayout'

export { HAIR_GROUP_COUNT, STRAND_COUNT, STRANDS_PER_GROUP }

export const CHARACTERS = [
  { id: 'mochi', name: 'Mochi', personality: 'Sweet & a little shy', fur: '#bd8d67', light: '#dfb38b', hair: '#eb9c95', backdrop: '#f6e6e2' },
  { id: 'biscuit', name: 'Biscuit', personality: 'A pocketful of sunshine', fur: '#cb9b58', light: '#edc789', hair: '#e5b75c', backdrop: '#f7edce' },
  { id: 'cocoa', name: 'Cocoa', personality: 'Small paws, big ideas', fur: '#92705f', light: '#c3a08a', hair: '#ad9cc9', backdrop: '#ece7f2' },
] as const

export type CharacterId = typeof CHARACTERS[number]['id']
export type Tool = 'brush' | 'comb' | 'snip' | 'grow' | 'curl' | 'soap' | 'wash' | 'blower' | 'color'
export const ACCESSORIES = ['none', 'bow', 'flower', 'crown', 'cherries', 'star'] as const
export type Accessory = typeof ACCESSORIES[number]
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
export const HAIR_BEND_LIMITS = { minX: -95, maxX: 95, minY: -65, maxY: 85 } as const
// Pressing "do all the hair" with the curl tool winds every strand this much more; three presses make it fully curly.
const CURL_PER_PRESS = 0.34

export interface Strand {
  // How long the hair is, up to 1 for full length. MIN_LENGTH is hair cut right down to the scalp (see `isBald`).
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
}

export interface Look {
  character: CharacterId
  hair: Strand[]
  accessory: Accessory
  outfit: Outfit
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
  | { type: 'style'; tool: Tool; strands: number[]; color: string; direction: number; checkpoint: boolean }
  | { type: 'pose'; locks: HairPoseEdit[]; checkpoint: boolean }
  | { type: 'lengths'; edits: HairLengthEdit[]; checkpoint: boolean }
  | { type: 'curl'; edits: HairCurlEdit[]; checkpoint: boolean }
  | { type: 'air'; edits: HairAirEdit[]; checkpoint: boolean }
  | { type: 'accessory'; accessory: Accessory }
  | { type: 'outfit'; outfit: Outfit }
  | { type: 'undo' }
  | { type: 'reset' }

export function createLook(character: CharacterId): Look {
  const friend = CHARACTERS.find((item) => item.id === character)!
  return {
    character,
    accessory: 'none',
    outfit: DEFAULT_OUTFIT,
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

// Resizes a strand without losing the brushed pose, which scales with the hair.
function resized(strand: Strand, index: number, length: number): Strand {
  return withShape({ ...strand, length }, scaleShape(strand.shape, strandReach(length, index) / strandReach(strand.length, index)))
}

// Hair cut right down to the scalp is gone, and its brushed pose, soap, water and curls go with it. The color stays
// for when it grows back.
function shorn(strand: Strand): Strand {
  return { length: MIN_LENGTH, color: strand.color, curl: 0, flow: strand.flow }
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
    const length = Math.max(MIN_LENGTH, Math.min(1, edit.length))
    if (isBald(length)) {
      if (isBald(strand.length)) return strand
      changed = true
      return shorn(strand)
    }
    const bendX = edit.bendX === undefined ? strand.bendX : Math.max(HAIR_BEND_LIMITS.minX, Math.min(HAIR_BEND_LIMITS.maxX, edit.bendX))
    const bendY = edit.bendY === undefined ? strand.bendY : Math.max(HAIR_BEND_LIMITS.minY, Math.min(HAIR_BEND_LIMITS.maxY, edit.bendY))
    const shape = edit.shape === undefined
      ? scaleShape(strand.shape, strandReach(length, index) / strandReach(strand.length, index))
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
    const rinsed = edit.rinse === true && (strand.soapy === true || strand.curl > 0 || strand.color !== natural)
    const shape = edit.shape === undefined ? strand.shape : normalizeShape(edit.shape)
    if (!wetnessChanged && !rinsed && shape === strand.shape) return strand
    changed = true
    const clean = rinsed ? { ...strand, color: natural, curl: 0, soapy: false } : strand
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
  if (action.type === 'accessory') {
    if (action.accessory === current.accessory) return state
    return { ...state, looks: { ...state.looks, [state.active]: { ...current, accessory: action.accessory } }, history: remember(state) }
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
      case 'snip': return resized(strand, i, Math.min(strand.length, Math.max(0.08, strand.length - 0.2)))
      case 'grow': return resized(strand, i, Math.min(1, strand.length + 0.2))
      case 'curl': return { ...strand, curl: Math.min(1, strand.curl + CURL_PER_PRESS) }
      case 'brush':
      case 'comb': return { ...strand, curl: 0, flow: Math.max(-1, Math.min(1, action.direction)) }
      case 'color': return { ...strand, color: action.color }
      case 'soap': return { ...strand, soapy: true, wetness: 1 }
      case 'wash': return { ...strand, color: CHARACTERS.find((friend) => friend.id === state.active)!.hair, curl: 0, soapy: false, wetness: 1 }
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
