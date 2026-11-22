import type { Point } from './hair'

// Spots on the capybara that react when they are poked or tickled, named by the side of the picture they are on.
export const BODY_SPOTS = ['eye-left', 'eye-right', 'nose', 'armpit-left', 'armpit-right', 'belly'] as const
export type BodySpot = typeof BODY_SPOTS[number]
export const REACTION_KINDS = ['poked-left', 'poked-right', 'sneeze', 'boop', 'ticklish'] as const
export type Reaction = typeof REACTION_KINDS[number]

export function isReaction(mood: string): mood is Reaction {
  return REACTION_KINDS.some((kind) => kind === mood)
}

// Each spot as an oval in the studio picture: the eyes, the end of the snout, where the arms meet the body, and the tummy.
const SPOT_AREAS: Record<BodySpot, { x: number; y: number; rx: number; ry: number }> = {
  'eye-left': { x: 198, y: 265, rx: 20, ry: 20 },
  'eye-right': { x: 302, y: 265, rx: 20, ry: 20 },
  nose: { x: 250, y: 292, rx: 30, ry: 15 },
  'armpit-left': { x: 172, y: 366, rx: 24, ry: 22 },
  'armpit-right': { x: 328, y: 366, rx: 24, ry: 22 },
  belly: { x: 250, y: 402, rx: 54, ry: 40 },
}

export const REACTIONS: Record<BodySpot, Reaction> = {
  'eye-left': 'poked-left',
  'eye-right': 'poked-right',
  nose: 'sneeze',
  'armpit-left': 'ticklish',
  'armpit-right': 'ticklish',
  belly: 'boop',
}

// How long each reaction shows, in milliseconds.
export const REACTION_TIMES: Record<Reaction, number> = { 'poked-left': 900, 'poked-right': 900, sneeze: 1300, boop: 1000, ticklish: 1200 }

// A poke or a rub gets the spot's reaction, except a rubbed tummy giggles instead of jiggling.
export function reactionFor(spot: BodySpot, rubbed: boolean): Reaction {
  return rubbed && spot === 'belly' ? 'ticklish' : REACTIONS[spot]
}

// Clips don't go on the eyes or the nose when they are tapped: those just react.
export function isFaceSpot(spot: BodySpot | null): boolean {
  return spot === 'eye-left' || spot === 'eye-right' || spot === 'nose'
}

export function spotAt(point: Point): BodySpot | null {
  return BODY_SPOTS.find((spot) => {
    const area = SPOT_AREAS[spot]
    return ((point.x - area.x) / area.rx) ** 2 + ((point.y - area.y) / area.ry) ** 2 <= 1
  }) ?? null
}

// A quick tap that hardly slides is a poke.
export const POKE_SLIDE = 10
export const POKE_TIME = 600
// Rubbing turns back on itself after sliding at least RUB_STEP; turning around RUB_TURNS times over one spot is a tickle.
const RUB_STEP = 5
const RUB_TURNS = 2

// Follows one finger on the capybara to tell a poke or a tickle apart from styling.
export class BodyTouch {
  private readonly start: Point
  private readonly startTime: number
  private slid = false
  private anchor: Point
  private heading: Point | null = null
  private rubbing: BodySpot | null
  private turns = 0

  constructor(point: Point, now: number) {
    this.start = point
    this.startTime = now
    this.anchor = point
    this.rubbing = spotAt(point)
  }

  // Follows the finger. Returns the spot being tickled each time the rubbing has turned around often enough.
  move(point: Point): BodySpot | null {
    if (Math.hypot(point.x - this.start.x, point.y - this.start.y) > POKE_SLIDE) this.slid = true
    const spot = spotAt(point)
    if (spot !== this.rubbing) {
      this.rubbing = spot
      this.turns = 0
      this.heading = null
      this.anchor = point
      return null
    }
    const dx = point.x - this.anchor.x
    const dy = point.y - this.anchor.y
    const distance = Math.hypot(dx, dy)
    if (distance < RUB_STEP) return null
    const heading = { x: dx / distance, y: dy / distance }
    if (this.heading && heading.x * this.heading.x + heading.y * this.heading.y < -0.3) this.turns += 1
    this.heading = heading
    this.anchor = point
    if (!spot || this.turns < RUB_TURNS) return null
    this.turns = 0
    return spot
  }

  // The spot poked, if the finger lifted quickly without sliding away.
  lift(point: Point, now: number): BodySpot | null {
    if (this.slid || now - this.startTime > POKE_TIME || Math.hypot(point.x - this.start.x, point.y - this.start.y) > POKE_SLIDE) return null
    return spotAt(this.start)
  }
}
