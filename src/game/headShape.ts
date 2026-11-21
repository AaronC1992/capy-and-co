import { bezier, HEAD_TOP_PATH, LEFT_CURVE, RIGHT_CURVE, type Curve, type Pt } from './hairline'

// The whole drawn head: the dome from hairline.ts, then the cheeks and jaw.
export const HEAD_PATH = `${HEAD_TOP_PATH}l12 53c8 49-25 69-95 70-69-1-103-21-95-70Z`

// The same outline as HEAD_PATH in absolute coordinates: two-point pieces are lines, four-point pieces are cubic curves.
export const HEAD_OUTLINE: readonly (readonly Pt[])[] = [
  LEFT_CURVE,
  RIGHT_CURVE,
  [{ x: 333, y: 245 }, { x: 345, y: 298 }],
  [{ x: 345, y: 298 }, { x: 353, y: 347 }, { x: 320, y: 367 }, { x: 250, y: 368 }],
  [{ x: 250, y: 368 }, { x: 181, y: 367 }, { x: 147, y: 347 }, { x: 155, y: 298 }],
  [{ x: 155, y: 298 }, { x: 168, y: 246 }],
]

const CURVE_SAMPLES = 20
// The distance field covers the head with a wide margin; beyond it the nearest edge value plus the gap is used.
const LEFT = 100
const TOP = 140
const STEP = 3
const COLUMNS = 101
const ROWS = 88

let field: Float32Array | undefined

function outline(): Pt[] {
  const points: Pt[] = [HEAD_OUTLINE[0][0]]
  for (const piece of HEAD_OUTLINE) {
    if (piece.length === 2) points.push(piece[1])
    else for (let step = 1; step <= CURVE_SAMPLES; step += 1) points.push(bezier(piece as Curve, step / CURVE_SAMPLES))
  }
  return points
}

function build(): Float32Array {
  const polygon = outline()
  const values = new Float32Array(COLUMNS * ROWS)
  for (let row = 0; row < ROWS; row += 1) {
    const y = TOP + row * STEP
    for (let column = 0; column < COLUMNS; column += 1) {
      const x = LEFT + column * STEP
      let nearest = Infinity
      let inside = false
      for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a, a += 1) {
        const p = polygon[a]
        const q = polygon[b]
        if ((p.y > y) !== (q.y > y) && x < (q.x - p.x) * (y - p.y) / (q.y - p.y) + p.x) inside = !inside
        const dx = q.x - p.x
        const dy = q.y - p.y
        const lengthSquared = dx * dx + dy * dy
        const along = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / lengthSquared))
        const ex = x - p.x - dx * along
        const ey = y - p.y - dy * along
        nearest = Math.min(nearest, ex * ex + ey * ey)
      }
      values[row * COLUMNS + column] = inside ? -Math.sqrt(nearest) : Math.sqrt(nearest)
    }
  }
  return values
}

// Builds the distance field now, so the first spray does not pay for it.
export function warmHeadShape(): void {
  if (!field) field = build()
}

// How far a point is outside the drawn head outline: negative inside the head, positive outside.
export function headClearance(x: number, y: number): number {
  if (!field) field = build()
  const gx = Math.min(COLUMNS - 1, Math.max(0, (x - LEFT) / STEP))
  const gy = Math.min(ROWS - 1, Math.max(0, (y - TOP) / STEP))
  const dx = x - (LEFT + gx * STEP)
  const dy = y - (TOP + gy * STEP)
  const column = Math.min(COLUMNS - 2, Math.floor(gx))
  const row = Math.min(ROWS - 2, Math.floor(gy))
  const u = gx - column
  const v = gy - row
  const index = row * COLUMNS + column
  const top = field[index] * (1 - u) + field[index + 1] * u
  const bottom = field[index + COLUMNS] * (1 - u) + field[index + COLUMNS + 1] * u
  return top * (1 - v) + bottom * v + Math.sqrt(dx * dx + dy * dy)
}
