import { hitHairStroke, strandPoints } from './hair'
import type { Point } from './hair'
import type { HairAirEdit, Look } from './model'

interface AirTarget {
  index: number
  start: Point
  direction: Point
  age: number
}

export class HairBlower {
  private last: Point
  private lastTime: number
  private targets: AirTarget[]
  private active = true
  private flutter: boolean

  constructor(look: Look, point: Point, now: number, reducedMotion = false) {
    this.flutter = !reducedMotion
    this.last = point
    this.lastTime = now
    this.targets = this.pick(look, point, point)
  }

  private pick(look: Look, from: Point, to: Point): AirTarget[] {
    return hitHairStroke(look, from, to, undefined, 55).map((index) => {
      const strand = look.hair[index]
      const tip = strandPoints(strand, index)[24]
      const dx = tip.x - to.x
      const dy = tip.y - to.y
      const distance = Math.hypot(dx, dy)
      return {
        index, start: { x: strand.bendX ?? 0, y: strand.bendY ?? 0 }, age: 0,
        direction: distance < 8 ? { x: 0, y: -1 } : { x: dx / distance, y: dy / distance },
      }
    })
  }

  private advance(look: Look, targets: AirTarget[], now: number): HairAirEdit[] {
    const seconds = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05))
    this.lastTime = Math.max(this.lastTime, now)
    if (!this.active || seconds === 0) return []
    return targets.map((target) => {
      target.age += seconds
      const reach = Math.min(70, target.age * 45)
      const flutter = this.flutter ? Math.sin(target.age * 10 + target.index * 0.9) * 4 * Math.min(1, target.age * 4) : 0
      return {
        index: target.index,
        bendX: target.start.x + target.direction.x * reach - target.direction.y * flutter,
        bendY: target.start.y + target.direction.y * reach + target.direction.x * flutter,
        wetness: Math.max(0, (look.hair[target.index].wetness ?? 0) - seconds * 0.65),
      }
    })
  }

  move(look: Look, point: Point, now: number): HairAirEdit[] {
    if (point.x === this.last.x && point.y === this.last.y) return this.hold(look, now)
    const crossed = this.pick(look, this.last, point)
    const edits = this.advance(look, crossed, now)
    const held = new Set(hitHairStroke(look, point, point, undefined, 55))
    this.targets = crossed.filter(({ index }) => held.has(index))
    this.last = point
    return edits
  }

  hold(look: Look, now: number): HairAirEdit[] {
    return this.advance(look, this.targets, now)
  }

  isBlowing(): boolean {
    return this.active && this.targets.length > 0
  }

  stop() {
    this.active = false
    this.targets = []
  }
}
