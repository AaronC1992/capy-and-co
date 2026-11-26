import { coneHalfWidth, WIND_RANGE } from '../game/hairWind'
import type { AirJet } from '../game/hairWind'
import { Icon } from './Icon'
import type { GraphicsQuality } from '../game/performance'

const REACH = WIND_RANGE * 0.9
// The painted stream is a little narrower than the air that bends hair, so hair at its edge still moves.
const FILL = 0.85
const LANES = [-0.8, -0.4, 0, 0.4, 0.8]
const LANE_START = 46
const LANE_STEP = 14
const ICON_SIZE = 46
const ICON_SCALE = ICON_SIZE / 24
// The blower icon's nozzle mouth is at (21, 8.5) in its 24-unit art; it sits just behind the fingertip.
const MOUTH_X = 40

const round = (value: number) => Math.round(value * 10) / 10
const half = (x: number) => coneHalfWidth(x) * FILL

const CONE = `M0 ${round(-half(0))}L${round(REACH)} ${round(-half(REACH))}V${round(half(REACH))}L0 ${round(half(0))}Z`

const LANE_PATHS = LANES.map((lane) => {
  const points: string[] = []
  for (let x = LANE_START; x <= REACH; x += LANE_STEP) points.push(`${round(x)} ${round(lane * half(x) + Math.sin(x / 15 + lane * 3) * 3.5)}`)
  return `M${points.join('L')}`
})

// The air from the dryer, drawn along the direction it blows. Local +x is the wind direction.
export function AirStream({ jet, id, graphics = 'high' }: { jet: AirJet; id: string; graphics?: GraphicsQuality }) {
  const angle = Math.atan2(jet.direction.y, jet.direction.x) * 180 / Math.PI
  // Blowing leftward turns the icon over, so mirror it to keep the handle pointing down.
  const flip = jet.direction.x < 0
  return <g data-testid="airflow" pointerEvents="none" aria-hidden="true" transform={`translate(${round(jet.nozzle.x)} ${round(jet.nozzle.y)}) rotate(${round(angle)})`}>
    <defs>
      <linearGradient id={`${id}-air`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={round(REACH)} y2="0">
        <stop stopColor="#bfeaf5" stopOpacity=".5" />
        <stop offset="1" stopColor="#bfeaf5" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={CONE} fill={`url(#${id}-air)`} />
    <g fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      {LANE_PATHS.filter((_, lane) => graphics === 'high' || (graphics === 'medium' ? lane % 2 === 0 : lane === 2)).map((path) => <path key={path} className="air-stream" d={path} />)}
    </g>
    <g transform={flip ? 'scale(1 -1)' : undefined}>
      <g transform={`translate(${round(MOUTH_X - 21 * ICON_SCALE)} ${round(-8.5 * ICON_SCALE)})`}><Icon name="blower" size={ICON_SIZE} /></g>
    </g>
  </g>
}
