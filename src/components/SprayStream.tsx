import { SPRAY_RADIUS } from '../game/hairSprayer'
import type { SprayJet } from '../game/hairSprayer'
import { Icon } from './Icon'

const ICON_SIZE = 54
const ICON_SCALE = ICON_SIZE / 24
// The spray bottle icon's nozzle mouth is at (21.2, 9.5) in its 24-unit art.
const MOUTH = { x: 21.2, y: 9.5 }
const LANES = [-0.8, -0.4, 0, 0.4, 0.8]
// The painted patch is a little smaller than the area that gets wet, so hair at its edge still soaks.
const PATCH = SPRAY_RADIUS * 0.82
const SPLASHES = [
  { x: -0.55, y: -0.4 }, { x: 0.5, y: -0.55 }, { x: 0.7, y: 0.15 }, { x: -0.65, y: 0.3 }, { x: 0.05, y: 0.65 }, { x: -0.1, y: -0.75 },
]

const round = (value: number) => Math.round(value * 10) / 10

// The water mist from the sprayer, drawn from the bottle's nozzle to the patch of hair it soaks. Local +x points at the fingertip.
export function SprayStream({ jet, id }: { jet: SprayJet; id: string }) {
  const dx = jet.target.x - jet.nozzle.x
  const dy = jet.target.y - jet.nozzle.y
  const distance = Math.max(24, Math.hypot(dx, dy))
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  // Spraying leftward turns the bottle over, so mirror it to keep the body below the nozzle.
  const flip = dx < 0
  const cone = `M0 -3L${round(distance)} ${round(-PATCH)}Q${round(distance + PATCH * 0.45)} 0 ${round(distance)} ${round(PATCH)}L0 3Z`
  return <g data-testid="spray" pointerEvents="none" aria-hidden="true" transform={`translate(${round(jet.nozzle.x)} ${round(jet.nozzle.y)}) rotate(${round(angle)})`}>
    <defs>
      <linearGradient id={`${id}-mist`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={round(distance)} y2="0">
        <stop stopColor="#c9edf9" stopOpacity=".2" />
        <stop offset="1" stopColor="#bfe6f4" stopOpacity=".62" />
      </linearGradient>
      <radialGradient id={`${id}-patch`}>
        <stop stopColor="#e2f6fd" stopOpacity=".62" />
        <stop offset=".7" stopColor="#bfe6f4" stopOpacity=".4" />
        <stop offset="1" stopColor="#bfe6f4" stopOpacity="0" />
      </radialGradient>
    </defs>
    <path d={cone} fill={`url(#${id}-mist)`} />
    <ellipse cx={round(distance)} cy="0" rx={round(PATCH * 0.95)} ry={round(PATCH)} fill={`url(#${id}-patch)`} />
    <g fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round">
      {LANES.map((lane, index) => <path key={lane} className="spray-drops" style={{ animationDelay: `${-index * 0.07}s` }} d={`M6 ${round(lane * 2.5)}L${round(distance)} ${round(lane * PATCH * 0.8)}`} />)}
    </g>
    {SPLASHES.map((splash, index) => <g key={index} transform={`translate(${round(distance + splash.x * PATCH)} ${round(splash.y * PATCH)})`}>
      <circle className="spray-pop" style={{ animationDelay: `${-index * 0.13}s` }} r={2.6 + (index % 3) * 0.7} fill="#f6fdff" stroke="#8fcde0" strokeWidth=".8" />
    </g>)}
    <g transform={flip ? 'scale(1 -1)' : undefined}>
      <g transform={`translate(${round(-MOUTH.x * ICON_SCALE)} ${round(-MOUTH.y * ICON_SCALE)})`}><Icon name="wash" size={ICON_SIZE} /></g>
    </g>
  </g>
}
