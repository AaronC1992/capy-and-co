import { STAGE } from './model'
import type { Clip, ClipKind, Look } from './model'
import { strandPoints } from './hair'
import type { HairOffsets, Point } from './hair'
import { HAIR_GROUP_COUNT, isBald, STRANDS_PER_GROUP, strandReach } from './hairLayout'
import { headTopY } from './hairline'

// A clip put down this close to a lock of hair clips onto it and moves with it from then on.
export const CLIP_GRIP = 28
// How close a finger has to be to a clip to pick it up.
export const CLIP_REACH = 26
// Where clips can be worn besides the hair: the head and ears, and the body.
const WEARABLE_AREAS = [{ x: 250, y: 262, rx: 130, ry: 108 }, { x: 250, y: 405, rx: 120, ry: 84 }] as const
// Spots on the hair that look nice, tried in turn when a clip is put on without saying where.
const NICE_SPOTS: readonly Point[] = [
  { x: 296, y: 150 }, { x: 204, y: 150 }, { x: 250, y: 128 }, { x: 338, y: 236 }, { x: 162, y: 236 }, { x: 272, y: 108 },
  { x: 228, y: 108 }, { x: 318, y: 186 }, { x: 182, y: 186 }, { x: 250, y: 168 }, { x: 346, y: 282 }, { x: 154, y: 282 },
]
// The middle of the top of the head, where a hat sits.
const CROWN_GROUPS = [3, 4, 5, 6, 7]
const round1 = (value: number) => Math.round(value * 10) / 10

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// A clip of `kind` put down at `point`, holding the nearest lock of hair if there is one close enough.
export function clipAt(look: Look, kind: ClipKind, point: Point): Clip {
  const x = round1(clamp(point.x, 0, STAGE.width))
  const y = round1(clamp(point.y, 0, STAGE.height))
  let nearest: { strand: number; step: number; distance: number } | null = null
  for (const [index, strand] of look.hair.entries()) {
    if (isBald(strand.length)) continue
    for (const [step, spot] of strandPoints(strand, index).entries()) {
      const distance = Math.hypot(spot.x - point.x, spot.y - point.y)
      if (distance < CLIP_GRIP && (!nearest || distance < nearest.distance)) nearest = { strand: index, step, distance }
    }
  }
  return nearest ? { kind, x, y, strand: nearest.strand, step: nearest.step } : { kind, x, y }
}

// Where a clip is drawn: on its lock of hair wherever that lock is now, or where it was put.
export function clipPosition(look: Look, clip: Clip, offsets?: HairOffsets): Point {
  if (clip.strand === undefined || clip.step === undefined) return { x: clip.x, y: clip.y }
  const points = strandPoints(look.hair[clip.strand], clip.strand, offsets?.[clip.strand])
  return points[Math.min(clip.step, points.length - 1)]
}

// Clips lean out toward whichever side of the head they are on.
export function clipTilt(point: Point): number {
  return Math.round(clamp((point.x - 250) * 0.22, -32, 32))
}

// The clip a finger at `point` would pick up, preferring the one drawn on top.
export function clipUnder(look: Look, point: Point, offsets?: HairOffsets): number {
  for (let index = look.clips.length - 1; index >= 0; index -= 1) {
    const spot = clipPosition(look, look.clips[index], offsets)
    if (Math.hypot(spot.x - point.x, spot.y - point.y) < CLIP_REACH) return index
  }
  return -1
}

// How high the hat sits: right on the head when the hair is shaved, and riding up on top of long hair.
export function hatBase(look: Look): number {
  const crown = CROWN_GROUPS.flatMap((group) => Array.from({ length: STRANDS_PER_GROUP }, (_, layer) => layer * HAIR_GROUP_COUNT + group))
  const reach = crown.reduce((sum, index) => {
    const strand = look.hair[index]
    return sum + (isBald(strand.length) ? 0 : strandReach(strand.length, index))
  }, 0) / crown.length
  return round1(Math.max(96, headTopY(250) + 8 - reach * 0.65))
}

// Clips can be worn on the hair, the hat, or anywhere on the capybara; anywhere else takes them off.
export function isWearable(look: Look, point: Point, offsets?: HairOffsets): boolean {
  if (WEARABLE_AREAS.some((area) => ((point.x - area.x) / area.rx) ** 2 + ((point.y - area.y) / area.ry) ** 2 <= 1)) return true
  if (look.hat !== 'none') {
    const base = hatBase(look)
    if (Math.abs(point.x - 250) < 80 && point.y > base - 100 && point.y < base + 14) return true
  }
  return look.hair.some((strand, index) => !isBald(strand.length)
    && strandPoints(strand, index, offsets?.[index]).some((spot) => Math.hypot(spot.x - point.x, spot.y - point.y) < CLIP_GRIP))
}

// Puts a clip of `kind` on a nice free spot of the hair, for when it is picked without saying where.
export function nextClipSpot(look: Look): Point {
  const taken = look.clips.map((clip) => clipPosition(look, clip))
  return NICE_SPOTS.find((spot) => taken.every((other) => Math.hypot(other.x - spot.x, other.y - spot.y) > 24))
    ?? NICE_SPOTS[look.clips.length % NICE_SPOTS.length]
}
