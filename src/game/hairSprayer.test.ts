import { describe, expect, it } from 'vitest'
import { HairSprayer, SPRAY_RADIUS } from './hairSprayer'
import { strandPoints } from './hair'
import type { Point } from './hair'
import { HAIR_POINTS, HAIR_SHAPE_LENGTH } from './hairLayout'
import { applyHairAir, CHARACTERS, createLook, STRAND_COUNT } from './model'
import type { HairAirEdit, Look } from './model'

const STRAND = 5
const FRAME = 1000 / 60
// Locks that hang down the left side of the head, far from a mist over the top of the head.
const FAR = [11, 24, 37, 50, 63]

const restPoint = (look: Look, step: number, index = STRAND) => strandPoints(look.hair[index], index)[step]
const natural = (look: Look) => CHARACTERS.find((friend) => friend.id === look.character)!.hair

// Holds the finger still for `seconds`, applying the edits each frame as the studio does.
function hold(sprayer: HairSprayer, look: Look, from: number, seconds: number): { look: Look; now: number; edits: HairAirEdit[] } {
  const frames = Math.round(seconds * 60)
  const edits: HairAirEdit[] = []
  let next = look
  let now = from
  for (let i = 0; i < frames; i++) {
    now += FRAME
    const step = sprayer.hold(now)
    edits.push(...step)
    next = applyHairAir(next, step)
  }
  return { look: next, now, edits }
}

// Mists the middle of strand 5 for `seconds`.
function sprayMiddle(seconds: number, base: Look = createLook('mochi')) {
  const finger = restPoint(base, 12)
  const sprayer = new HairSprayer(base, finger, 0)
  return { base, finger, sprayer, ...hold(sprayer, base, 0, seconds) }
}

const wetnessOf = (look: Look, index = STRAND) => look.hair[index].wetness ?? 0
const nearest = (look: Look, index: number, finger: Point) => Math.min(...strandPoints(look.hair[index], index).slice(1).map((point) => Math.hypot(point.x - finger.x, point.y - finger.y)))

describe('the water sprayer', () => {
  it('wets the hair in the mist and leaves hair outside it dry', () => {
    const { base, finger, look, edits } = sprayMiddle(0.5)
    const touched = new Set(edits.map((edit) => edit.index))
    expect(touched.has(STRAND)).toBe(true)
    expect(touched.size).toBeGreaterThan(2)
    expect(touched.size).toBeLessThan(STRAND_COUNT)
    for (let index = 0; index < STRAND_COUNT; index++) {
      if (nearest(base, index, finger) >= SPRAY_RADIUS) {
        expect(touched.has(index), `strand ${index}`).toBe(false)
        expect(look.hair[index], `strand ${index}`).toBe(base.hair[index])
      }
    }
    for (const index of FAR) expect(look.hair[index]).toBe(base.hair[index])
    expect(wetnessOf(look)).toBeGreaterThan(0.9)
  })
  it('leaves a first splash on hair the moment the mist reaches it, even before any time passes', () => {
    const base = createLook('mochi')
    const finger = restPoint(base, 12)
    const sprayer = new HairSprayer(base, finger, 0)
    const edits = sprayer.hold(0)
    const edit = edits.find(({ index }) => index === STRAND)
    expect(edit?.wetness).toBeGreaterThan(0.25)
    expect(sprayer.poses().some(({ index }) => index === STRAND)).toBe(true)
  })
  it('soaks hair in the middle of the mist in about half a second', () => {
    const early = sprayMiddle(0.2)
    const full = sprayMiddle(0.6)
    expect(wetnessOf(early.look)).toBeGreaterThan(0.5)
    expect(wetnessOf(early.look)).toBeLessThan(0.95)
    expect(wetnessOf(full.look)).toBe(1)
  })
  it('never lowers wetness, never goes past fully wet, and reports it in steady steps', () => {
    const { edits } = sprayMiddle(1)
    const levels = edits.filter(({ index, wetness }) => index === STRAND && wetness !== undefined).map(({ wetness }) => wetness!)
    expect(levels.length).toBeGreaterThan(3)
    levels.forEach((level, step) => {
      expect(level).toBeLessThanOrEqual(1)
      if (step > 0) expect(level).toBeGreaterThanOrEqual(levels[step - 1])
    })
    expect(levels.at(-1)).toBe(1)
  })
  it('does not dry out hair that was already wetter than the mist has made it', () => {
    const dry = createLook('mochi')
    const damp: Look = { ...dry, hair: dry.hair.map((strand) => ({ ...strand, wetness: 0.8 })) }
    const { edits, look } = sprayMiddle(0.05, damp)
    expect(edits.every(({ wetness }) => wetness === undefined || wetness >= 0.8)).toBe(true)
    expect(look.hair.every((strand) => (strand.wetness ?? 0) >= 0.8)).toBe(true)
  })
  it('rinses each strand once, washing out soap, dye and curls and nothing outside the mist', () => {
    const dry = createLook('mochi')
    const dirty: Look = { ...dry, hair: dry.hair.map((strand) => ({ ...strand, color: '#d62f8b', soapy: true, curl: true })) }
    const { edits, look } = sprayMiddle(0.5, dirty)
    const rinsed = edits.filter((edit) => edit.rinse)
    expect(new Set(rinsed.map(({ index }) => index)).size).toBe(rinsed.length)
    expect(rinsed.map(({ index }) => index)).toContain(STRAND)
    expect(look.hair[STRAND]).toMatchObject({ color: natural(dry), soapy: false, curl: false })
    for (const index of FAR) expect(look.hair[index]).toMatchObject({ color: '#d62f8b', soapy: true, curl: true })
  })
  it('hangs every soaked strand from its root with the same length and without changing the root', () => {
    const { base, sprayer } = sprayMiddle(0.5)
    const poses = sprayer.poses()
    expect(poses.some(({ index }) => index === STRAND)).toBe(true)
    expect(poses.length).toBeGreaterThan(2)
    for (const { index, offsets } of poses) {
      expect(offsets).toHaveLength(HAIR_SHAPE_LENGTH)
      expect(offsets.every(Number.isFinite)).toBe(true)
      const rest = strandPoints(base.hair[index], index)
      const hung = rest.map((point, step) => (step === 0 ? point : { x: point.x + offsets[(step - 1) * 2], y: point.y + offsets[(step - 1) * 2 + 1] }))
      for (let step = 1; step <= HAIR_POINTS; step++) {
        expect(Math.hypot(hung[step].x - hung[step - 1].x, hung[step].y - hung[step - 1].y)).toBeCloseTo(Math.hypot(rest[step].x - rest[step - 1].x, rest[step].y - rest[step - 1].y), 6)
      }
    }
    expect(poses.some(({ index }) => FAR.includes(index))).toBe(false)
  })
  it('pulls the hair under the mist further down the longer it is sprayed', () => {
    const SIDE = 13
    const tipY = (sprayer: HairSprayer) => sprayer.poses().find(({ index }) => index === SIDE)!.offsets[HAIR_SHAPE_LENGTH - 1]
    const base = createLook('mochi')
    const finger = restPoint(base, 12, SIDE)
    const spray = (seconds: number) => {
      const sprayer = new HairSprayer(base, finger, 0)
      hold(sprayer, base, 0, seconds)
      return sprayer
    }
    const brief = tipY(spray(0.05))
    const soaked = tipY(spray(0.6))
    expect(brief).toBeGreaterThan(0)
    expect(soaked).toBeGreaterThan(brief + 15)
  })
  it('keeps the hair soaked and hanging when the finger moves on', () => {
    const { base, sprayer, look, now } = sprayMiddle(0.5)
    const before = sprayer.poses().find(({ index }) => index === STRAND)!.offsets
    const away = sprayer.move({ x: 470, y: 480 }, now + FRAME)
    expect(away).toEqual([])
    const after = sprayer.poses().find(({ index }) => index === STRAND)!.offsets
    expect(after).toEqual(before)
    expect(applyHairAir(look, away).hair[STRAND]).toBe(look.hair[STRAND])
    expect(base.hair[STRAND].wetness).toBeUndefined()
  })
  it('stops spraying once the hair under the mist is soaked and hanging, and keeps going while it is still getting wet', () => {
    const base = createLook('mochi')
    const sprayer = new HairSprayer(base, restPoint(base, 12), 0)
    sprayer.hold(FRAME)
    expect(sprayer.isSpraying()).toBe(true)
    hold(sprayer, base, FRAME, 3)
    sprayer.poses()
    expect(sprayer.isSpraying()).toBe(false)
  })
  it('works out how each strand hangs at a measured pace, yet settles on the exact final pose', () => {
    const base = createLook('mochi')
    const finger = restPoint(base, 12)
    const sprayer = new HairSprayer(base, finger, 0)
    const poseOf = (poses: ReturnType<HairSprayer['poses']>) => poses.find(({ index }) => index === STRAND)!.offsets
    const seen = new Set<readonly number[]>()
    let now = 0
    for (let frame = 0; frame < 60; frame++) {
      now += FRAME
      sprayer.hold(now)
      seen.add(poseOf(sprayer.poses()))
    }
    // One second of frames is worked out about every 50 ms, not every 16 ms.
    expect(seen.size).toBeGreaterThan(5)
    expect(seen.size).toBeLessThan(25)
    const exact = new HairSprayer(base, finger, 0)
    hold(exact, base, 0, 1)
    expect(poseOf(sprayer.poses(true))).toEqual(poseOf(exact.poses(true)))
  })
  it('has nothing to spray, and keeps no poses, when the mist falls on bare picture', () => {
    const base = createLook('mochi')
    const sprayer = new HairSprayer(base, { x: 30, y: 500 }, 0)
    expect(sprayer.hold(FRAME)).toEqual([])
    expect(sprayer.isSpraying()).toBe(false)
    expect(sprayer.poses()).toEqual([])
  })
  it('gives up its poses and stops reporting changes when the finger lifts', () => {
    const { sprayer, now } = sprayMiddle(0.3)
    expect(sprayer.poses().length).toBeGreaterThan(0)
    sprayer.stop()
    expect(sprayer.poses()).toEqual([])
    expect(sprayer.isSpraying()).toBe(false)
    expect(sprayer.hold(now + FRAME)).toEqual([])
    expect(sprayer.move({ x: 250, y: 150 }, now + 2 * FRAME)).toEqual([])
  })
  it('holds the bottle up and to the left of the fingertip, aimed at it, and keeps it on the picture', () => {
    const base = createLook('mochi')
    const jet = new HairSprayer(base, { x: 250, y: 200 }, 0).jet()
    expect(jet.target).toEqual({ x: 250, y: 200 })
    expect(jet.nozzle.x).toBeLessThan(250)
    expect(jet.nozzle.y).toBeLessThan(200)
    const corner = new HairSprayer(base, { x: 4, y: 4 }, 0).jet()
    expect(corner.nozzle.x).toBeGreaterThan(4)
    expect(corner.nozzle.y).toBeGreaterThan(4)
    expect(corner.target).toEqual({ x: 4, y: 4 })
  })
  it('works from real pointer points, whose x and y are not plain properties and vanish when spread', () => {
    const pointer = (x: number, y: number): Point => Object.create({ get x() { return x }, get y() { return y } })
    const sprayer = new HairSprayer(createLook('mochi'), pointer(250, 200), 0)
    expect(sprayer.jet()).toEqual({ nozzle: { x: 206, y: 142 }, target: { x: 250, y: 200 } })
    sprayer.move(pointer(260, 210), FRAME)
    expect(sprayer.jet()).toEqual({ nozzle: { x: 216, y: 152 }, target: { x: 260, y: 210 } })
  })
})
