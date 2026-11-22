import type { Look, Strand } from './model'
import { fullReach, HAIR_CENTER_X, HAIR_GROUP_COUNT, HAIR_POINTS, isBald, isSideStrand, MAX_LENGTH, smoothstep, strandReach } from './hairLayout'
import type { HairShape } from './hairLayout'
import { hairRoot } from './hairline'

export { isSideStrand, lengthScale, MIN_REACH } from './hairLayout'

export interface Point { x: number; y: number }
// Temporary brush motion per strand; undefined means the strand is at rest.
export type HairOffsets = readonly (HairShape | undefined)[]
export const FLOW_DISTANCE = 25

// Where falling hair lands and lies, just under the capybara's feet.
export const FLOOR_Y = 486
// Fallen hair folds back at the sides of the picture instead of running out of it.
export const FLOOR_EDGES = [8, 492] as const
// Locks lie a little nearer or farther back on the floor, so the hair there reads as a pile instead of one line.
const FLOOR_DEPTH = 10

// Where on the floor the lock rooted at `rootX` lies.
export function floorUnder(rootX: number): number {
  const spread = (rootX * 0.618034) % 1
  return FLOOR_Y - FLOOR_DEPTH * (spread < 0 ? spread + 1 : spread)
}
// How falling hair is traced: in small steps, turning over the top, slanting down and away from the face, straightening
// to hang down, then lying along the floor.
const FALL_STEP = 2
const FALL_SLANT = 0.55
const TOP_TURN = 36
const DROP_TURN = 60
const FLOOR_TURN = 14
// The layers of a group land side by side instead of on top of each other.
const LANDING_SPREAD = [0, -9, -4.5, 4.5, 9] as const
const FALLS = new Map<string, Float64Array>()
const FALL_CACHE = 600

// The strand's own line before any brushing, standing up to `reach` long; `t` runs from 0 at the root to 1 at the tip.
function standingPoint(strand: Strand, index: number, t: number, reach: number): Point {
  const group = index % HAIR_GROUP_COUNT
  const side = isSideStrand(index)
  const { x: rootX, y: rootY } = hairRoot(index)
  return {
    x: rootX + (side ? (group === 11 ? -16 : 16) : (group - 5) * 4) * t
      + (strand.flow * FLOW_DISTANCE + (strand.bendX ?? 0)) * t * t + Math.sin(t * Math.PI) * 7,
    y: rootY + (side ? reach : -reach) * t + (strand.bendY ?? 0) * t * t,
  }
}

function turnToward(heading: number, target: number, most: number): number {
  return Math.abs(target - heading) <= most ? target : heading + Math.sign(target - heading) * most
}

type FallPhase = 'over' | 'slant' | 'straighten' | 'hang' | 'land' | 'lie'

// Hair longer than it can stand tips over at the top and falls away from the middle of the head, down beside the
// capybara to the floor. Every point only depends on how far along the hair it is, so cutting or growing long hair
// leaves the rest of it exactly where it was. Returns x/y pairs every FALL_STEP along the hair from the standing tip.
export function fallPath(strand: Strand, index: number): Float64Array {
  const key = `${index}|${strand.flow}|${strand.bendX ?? 0}|${strand.bendY ?? 0}`
  const known = FALLS.get(key)
  if (known) return known
  const group = index % HAIR_GROUP_COUNT
  const layer = Math.floor(index / HAIR_GROUP_COUNT)
  const side = isSideStrand(index)
  const full = fullReach(index)
  const top = standingPoint(strand, index, 1, full)
  // Which way the standing tip is heading: the slope of `standingPoint` at t = 1.
  const dx = (side ? (group === 11 ? -16 : 16) : (group - 5) * 4) + 2 * (strand.flow * FLOW_DISTANCE + (strand.bendX ?? 0)) - 7 * Math.PI
  const dy = (side ? full : -full) + 2 * (strand.bendY ?? 0)
  // Hair falls to the side its tip leans to; the middle of the crown parts both ways.
  const lean = top.x - HAIR_CENTER_X + (group === 5 ? (layer % 2 ? 8 : -8) : 0)
  const outward = side ? (group === 11 ? -1 : 1) : lean > 0 ? 1 : lean < 0 ? -1 : group < 5 ? -1 : 1
  const landing = (side ? 135 : 148 + 10 * Math.abs(group - 5)) + outward * LANDING_SPREAD[layer]
  const straighten = landing - DROP_TURN * (1 - Math.cos(FALL_SLANT))
  const slant = Math.PI / 2 - FALL_SLANT
  const floor = floorUnder(hairRoot(index).x)
  const steps = Math.ceil((strandReach(MAX_LENGTH, index) - full) / FALL_STEP) + 1
  const path = new Float64Array((steps + 1) * 2)
  // Headings are measured as if the hair fell to the right: 0 is away from the middle and π/2 is straight down.
  let heading = Math.atan2(dy, outward * dx)
  let phase: FallPhase = 'over'
  let x = top.x
  let y = top.y
  path[0] = x
  path[1] = y
  for (let step = 1; step <= steps; step++) {
    if (phase === 'over') {
      heading = turnToward(heading, slant, FALL_STEP / TOP_TURN)
      if (heading === slant) phase = 'slant'
    }
    if (phase === 'slant' && outward * (x - HAIR_CENTER_X) >= straighten) phase = 'straighten'
    if (phase === 'straighten') {
      heading = turnToward(heading, Math.PI / 2, FALL_STEP / DROP_TURN)
      if (heading === Math.PI / 2) phase = 'hang'
    }
    if (phase !== 'land' && phase !== 'lie' && y >= floor - FLOOR_TURN && Math.sin(heading) > 0) phase = 'land'
    if (phase === 'land') {
      heading = turnToward(heading, 0, FALL_STEP / FLOOR_TURN)
      if (heading === 0) phase = 'lie'
    }
    if (phase === 'lie') {
      y = floor
      const nextX = x + outward * Math.cos(heading) * FALL_STEP
      if (nextX < FLOOR_EDGES[0] || nextX > FLOOR_EDGES[1]) {
        heading = Math.PI - heading
        y -= 3
      }
    }
    x += outward * Math.cos(heading) * FALL_STEP
    y = Math.min(floor, y + Math.sin(heading) * FALL_STEP)
    path[step * 2] = x
    path[step * 2 + 1] = y
  }
  if (FALLS.size >= FALL_CACHE) FALLS.clear()
  FALLS.set(key, path)
  return path
}

function fallPoint(path: Float64Array, along: number): Point {
  const last = path.length / 2 - 1
  const position = Math.max(0, Math.min(last, along / FALL_STEP))
  const lower = Math.min(last - 1, Math.floor(position))
  const share = position - lower
  return {
    x: path[lower * 2] + (path[lower * 2 + 2] - path[lower * 2]) * share,
    y: path[lower * 2 + 1] + (path[lower * 2 + 3] - path[lower * 2 + 1]) * share,
  }
}

// `extra` is transient motion layered over the saved style while the hair is being brushed. This is the strand's own
// line; curls are drawn around it (see `curlyPoints`), so they never change where a tool finds the hair.
export function strandPoints(strand: Strand, index: number, extra?: HairShape): Point[] {
  const reach = strandReach(strand.length, index)
  const full = fullReach(index)
  // Up to full length the whole strand stands and stretches as it grows; past it, it stands at full height and falls.
  const fall = reach > full ? fallPath(strand, index) : null
  return Array.from({ length: HAIR_POINTS + 1 }, (_, step) => {
    const t = step / HAIR_POINTS
    const along = t * reach
    const point = !fall ? standingPoint(strand, index, t, reach)
      : along <= full ? standingPoint(strand, index, along / full, full) : fallPoint(fall, along - full)
    if (step === 0) return point
    const slot = (step - 1) * 2
    return {
      x: point.x + ((strand.shape?.[slot] ?? 0) + (extra?.[slot] ?? 0)),
      y: point.y + ((strand.shape?.[slot + 1] ?? 0) + (extra?.[slot + 1] ?? 0)),
    }
  })
}

// A point that could be skipped without moving the drawn line more than this many SVG units.
export const PATH_TOLERANCE = 0.8

function distanceToChord(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  return length === 0
    ? Math.hypot(point.x - from.x, point.y - from.y)
    : Math.abs((point.x - from.x) * dy - (point.y - from.y) * dx) / length
}

// Painting is what slows the studio down when plenty of hair moves at once. Straight hair looks just as smooth
// drawn through every other point, so only the odd points that sit on a visible bend are kept.
export function pathThrough(points: readonly Point[]): string {
  return linePath(points.filter((point, step) => step % 2 === 0 || step === points.length - 1
    || distanceToChord(point, points[step - 1], points[step + 1]) > PATH_TOLERANCE))
}

// Fallen hair is long, so its points are far apart: it is drawn along a smooth curve through them instead of straight
// lines between them, with `density` drawn points for every point of the strand. Point `step * density` of the result
// is the strand's own point `step`.
export function smoothLine(points: readonly Point[], density: number): Point[] {
  if (points.length < 2 || density <= 1) return [...points]
  const line: Point[] = []
  const last = points.length - 1
  for (let step = 0; step < last; step += 1) {
    const from = points[step]
    const to = points[step + 1]
    const before = step > 0 ? points[step - 1] : { x: 2 * from.x - to.x, y: 2 * from.y - to.y }
    const after = step + 2 <= last ? points[step + 2] : { x: 2 * to.x - from.x, y: 2 * to.y - from.y }
    // The curve may swing a little past its points; it never dips under the floor the hair is lying on.
    const lowest = Math.max(from.y, to.y) >= FLOOR_Y - FLOOR_DEPTH - FLOOR_TURN ? Math.max(from.y, to.y) : Infinity
    line.push(from)
    for (let part = 1; part < density; part += 1) {
      const t = part / density
      const t2 = t * t
      const t3 = t2 * t
      const along = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
      line.push({ x: along(before.x, from.x, to.x, after.x), y: Math.min(lowest, along(before.y, from.y, to.y, after.y)) })
    }
  }
  line.push(points[last])
  return line
}

export function linePath(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

// Curls need several drawn points for every point of the strand's own line to stay round.
export const CURL_DENSITY = 3
// Turning the wave into loops starts around half curl; golden-angle phases keep neighbouring strands out of step.
const CURL_PHASE_STEP = 2.399963

// Curls are drawn around the strand's own line: a gentle wave at first, then loops, then tight ringlets as `curl`
// grows from 0 to 1. The line itself never moves, so every tool still finds and styles the strand as one piece.
// Point `step * density` of the result is where the strand's own point `step` is drawn. Fallen hair winds its curls
// around a smooth curve through its points (see `smoothLine`).
export function curlyPoints(points: readonly Point[], curl: number, seed: number, density = CURL_DENSITY, smooth = false): Point[] {
  if (points.length < 2) return [...points]
  const amount = Math.max(0, Math.min(1, curl))
  let line: Point[] = []
  if (smooth) line = smoothLine(points, density)
  else {
    for (let step = 0; step < points.length - 1; step += 1) {
      const from = points[step]
      const to = points[step + 1]
      for (let part = 0; part < density; part += 1) {
        const share = part / density
        line.push({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share })
      }
    }
    line.push(points[points.length - 1])
  }
  const travelled: number[] = [0]
  for (let i = 1; i < line.length; i += 1) travelled.push(travelled[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y))
  const total = travelled[travelled.length - 1]
  const pitch = 64 - 43 * amount
  const radius = 3 + 7.5 * amount
  // The roots stay put on the scalp; the curls build over the first stretch of hair.
  const ramp = Math.max(8, Math.min(30, total * 0.3))
  const phase = (seed * CURL_PHASE_STEP) % (Math.PI * 2)
  let tangentX = 0
  let tangentY = 1
  return line.map((point, i) => {
    const before = line[Math.max(0, i - 1)]
    const after = line[Math.min(line.length - 1, i + 1)]
    const span = Math.hypot(after.x - before.x, after.y - before.y)
    if (span > 1e-6) {
      tangentX = (after.x - before.x) / span
      tangentY = (after.y - before.y) / span
    }
    const angle = (travelled[i] / pitch) * Math.PI * 2 + phase
    const size = radius * smoothstep(0, ramp, travelled[i])
    const forward = Math.sin(angle) * size
    const sideways = Math.cos(angle) * size
    return {
      x: point.x + tangentX * forward - tangentY * sideways,
      y: point.y + tangentY * forward + tangentX * sideways,
    }
  })
}

// How a strand is painted: the points it is drawn through and the path along them. Curls are drawn through more points
// than the strand has, so point `step * stride` of `line` is where the strand's own point `step` is painted.
export interface DrawnStrand { line: readonly Point[]; stride: number; path: string }

// Fallen hair is drawn through about this many SVG units per point, and curls through this many.
const FALLEN_SPACING = 8
const FALLEN_CURL_SPACING = 1.5

export function drawStrand(strand: Strand, index: number, points: readonly Point[]): DrawnStrand {
  const reach = strandReach(strand.length, index)
  const fallen = reach > fullReach(index)
  if (strand.curl > 0) {
    const density = fallen ? Math.max(CURL_DENSITY, Math.ceil(reach / HAIR_POINTS / FALLEN_CURL_SPACING)) : CURL_DENSITY
    const line = curlyPoints(points, strand.curl, index, density, fallen)
    return { line, stride: density, path: linePath(line) }
  }
  if (fallen) {
    const density = Math.ceil(reach / HAIR_POINTS / FALLEN_SPACING)
    const line = smoothLine(points, density)
    return { line, stride: density, path: pathThrough(line) }
  }
  return { line: points, stride: 1, path: pathThrough(points) }
}

export function strandPath(strand: Strand, index: number, extra?: HairShape): string {
  return drawStrand(strand, index, strandPoints(strand, index, extra)).path
}

export function hitHair(look: Look, point: Point, offsets?: HairOffsets): number[] {
  return hitHairStroke(look, point, point, offsets)
}

export function closestPointOnStroke(point: Point, from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distanceSquared = dx * dx + dy * dy
  const t = distanceSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / distanceSquared))
  return { x: from.x + dx * t, y: from.y + dy * t }
}

// Pick the swept finger area against the displayed curves, not the resting hair. Shaved scalp has no hair to pick.
export function hitHairStroke(look: Look, from: Point, to: Point, offsets?: HairOffsets, radius = 26): number[] {
  return touchStrands(look, from, to, offsets, radius).filter((index) => !isBald(look.hair[index].length))
}

// Every strand the swept finger reaches, shaved ones included, because growing is what brings them back.
export function touchStrands(look: Look, from: Point, to: Point, offsets?: HairOffsets, radius = 26): number[] {
  return look.hair.flatMap((strand, index) =>
    strandPoints(strand, index, offsets?.[index]).some((point) => {
      const closest = closestPointOnStroke(point, from, to)
      return Math.hypot(point.x - closest.x, point.y - closest.y) < radius
    }) ? [index] : [],
  )
}
