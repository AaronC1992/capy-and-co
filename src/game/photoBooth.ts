import type { Point } from './hair'

export const BACKGROUNDS = ['studio', 'beach', 'stars', 'garden', 'rainbow', 'party'] as const
export const FRAMES = ['none', 'polaroid', 'hearts', 'flowers', 'gold'] as const
// The faces a capybara can pull for the camera.
export const FACES = ['calm', 'happy', 'giggle', 'surprised'] as const
export const STICKER_KINDS = ['heart', 'star', 'sparkle', 'flower', 'rainbow', 'cloud', 'balloon', 'paw'] as const
export type Background = typeof BACKGROUNDS[number]
export type Frame = typeof FRAMES[number]
export type Face = typeof FACES[number]
export type StickerKind = typeof STICKER_KINDS[number]
export interface Sticker { kind: StickerKind; x: number; y: number }
export interface Scene { background: Background; frame: Frame; face: Face; stickers: Sticker[] }

export const SCENE = { width: 400, height: 460 } as const
export const MAX_STICKERS = 10
// How close a finger has to be to a sticker to pick it up.
export const STICKER_REACH = 26
// How photos taken before the photo booth look: the friend's own color and a plain smile.
export const PLAIN_SCENE: Scene = { background: 'studio', frame: 'none', face: 'calm', stickers: [] }
// Spots around the capybara, tried in turn when a sticker is added without saying where.
const NICE_SPOTS: readonly Point[] = [
  { x: 62, y: 62 }, { x: 338, y: 62 }, { x: 48, y: 196 }, { x: 352, y: 196 }, { x: 200, y: 40 },
  { x: 58, y: 330 }, { x: 342, y: 330 }, { x: 124, y: 112 }, { x: 276, y: 112 }, { x: 200, y: 428 },
]
const round1 = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function freshScene(): Scene {
  return { background: 'studio', frame: 'none', face: 'happy', stickers: [] }
}

export function isOnPicture(point: Point): boolean {
  return point.x >= 0 && point.x <= SCENE.width && point.y >= 0 && point.y <= SCENE.height
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSticker(value: unknown): value is Sticker {
  return isRecord(value) && STICKER_KINDS.some((kind) => kind === value.kind)
    && typeof value.x === 'number' && typeof value.y === 'number' && isOnPicture({ x: value.x, y: value.y })
}

export function isScene(value: unknown): value is Scene {
  return isRecord(value) && BACKGROUNDS.some((item) => item === value.background) && FRAMES.some((item) => item === value.frame)
    && FACES.some((item) => item === value.face)
    && Array.isArray(value.stickers) && value.stickers.length <= MAX_STICKERS && value.stickers.every(isSticker)
}

export function nextStickerSpot(stickers: readonly Sticker[]): Point {
  const free = NICE_SPOTS.find((spot) => stickers.every((sticker) => Math.hypot(sticker.x - spot.x, sticker.y - spot.y) > STICKER_REACH))
  if (free) return free
  const spot = NICE_SPOTS[stickers.length % NICE_SPOTS.length]
  return { x: spot.x + 14, y: spot.y + 14 }
}

// The top sticker under `point`, or -1 when there is none.
export function stickerAt(stickers: readonly Sticker[], point: Point): number {
  for (let index = stickers.length - 1; index >= 0; index--) {
    if (Math.hypot(stickers[index].x - point.x, stickers[index].y - point.y) <= STICKER_REACH) return index
  }
  return -1
}

export function placeSticker(scene: Scene, kind: StickerKind, point: Point): Scene {
  if (scene.stickers.length >= MAX_STICKERS) return scene
  const sticker = { kind, x: round1(clamp(point.x, 0, SCENE.width)), y: round1(clamp(point.y, 0, SCENE.height)) }
  return { ...scene, stickers: [...scene.stickers, sticker] }
}

// Letting go of a dragged sticker moves it there, or peels it off if it was dragged off the picture.
export function dropSticker(scene: Scene, index: number, point: Point): Scene {
  if (!isOnPicture(point)) return { ...scene, stickers: scene.stickers.filter((_, other) => other !== index) }
  return { ...scene, stickers: scene.stickers.map((sticker, other) => other === index ? { ...sticker, x: round1(point.x), y: round1(point.y) } : sticker) }
}
