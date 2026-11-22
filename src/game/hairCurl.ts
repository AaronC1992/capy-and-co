import { hitHair, hitHairStroke } from './hair'
import type { Point } from './hair'
import type { HairCurlEdit, Look } from './model'

// How much curlier held hair gets every second: two seconds on the same spot goes from straight to tight ringlets.
export const CURL_PER_SECOND = 0.5

// Curling is a hold: the longer the finger stays on a lock of hair, the more curls it gets, and dragging curls
// whatever the finger passes over. The locks under the finger keep curling while it holds still.
export class HairCurler {
  private last: Point
  private lastTime: number
  private targets: number[]
  private active = true

  constructor(look: Look, point: Point, now: number) {
    this.last = { x: point.x, y: point.y }
    this.lastTime = now
    this.targets = hitHair(look, point)
  }

  private advance(look: Look, targets: number[], now: number): HairCurlEdit[] {
    const seconds = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05))
    this.lastTime = Math.max(this.lastTime, now)
    if (!this.active || seconds === 0) return []
    return targets.flatMap((index) => {
      const before = look.hair[index].curl
      const curl = Math.min(1, before + CURL_PER_SECOND * seconds)
      return curl > before ? [{ index, curl }] : []
    })
  }

  move(look: Look, point: Point, now: number): HairCurlEdit[] {
    if (point.x === this.last.x && point.y === this.last.y) return this.hold(look, now)
    const edits = this.advance(look, hitHairStroke(look, this.last, point), now)
    // Retain only this area's locks for holding, not every lock crossed earlier.
    this.targets = hitHair(look, point)
    this.last = { x: point.x, y: point.y }
    return edits
  }

  hold(look: Look, now: number): HairCurlEdit[] {
    return this.advance(look, this.targets, now)
  }

  canCurl(look: Look): boolean {
    return this.active && this.targets.some((index) => look.hair[index].curl < 1)
  }

  stop() {
    this.active = false
    this.targets = []
  }
}
