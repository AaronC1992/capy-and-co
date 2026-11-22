import { useId } from 'react'
import type { Blush, Eyeshadow, Lashes, Lipstick, MakeupSlot } from '../game/model'

export const LASH_LABELS: Record<Lashes, string> = {
  none: 'No lashes', natural: 'Natural lashes', long: 'Long lashes', curly: 'Curly lashes', doll: 'Doll lashes', sparkle: 'Sparkle lashes', rainbow: 'Rainbow lashes',
}
export const EYESHADOW_LABELS: Record<Eyeshadow, string> = {
  none: 'No eyeshadow', pink: 'Pink shadow', lilac: 'Lilac shadow', sky: 'Sky shadow', peach: 'Peach shadow', gold: 'Gold shimmer', rainbow: 'Rainbow shadow',
}
export const BLUSH_LABELS: Record<Blush, string> = {
  none: 'No blush', rosy: 'Rosy blush', peach: 'Peach blush', berry: 'Berry blush', hearts: 'Heart cheeks', stars: 'Star cheeks', freckles: 'Freckles',
}
export const LIPSTICK_LABELS: Record<Lipstick, string> = {
  none: 'No lipstick', pink: 'Pink lips', cherry: 'Cherry lips', coral: 'Coral lips', berry: 'Berry lips', gloss: 'Lip gloss', glitter: 'Glitter lips',
}

type Pair = readonly [number, number]
// The shape an eye's upper lid makes: open, wide open, squeezed shut or shut in a smile.
export type Lid = 'calm' | 'wide' | 'shut' | 'happy'
export type LipShape = 'smile' | 'giggle' | 'surprised' | 'sneeze' | 'poked'

// The left eye's upper lid, from its outer corner across to its inner one, around the middle of the eye. The right eye is its mirror image.
const LIDS: Record<Lid, { from: Pair; bend: Pair; to: Pair; middle: Pair }> = {
  calm: { from: [192, 265], bend: [198, 248], to: [204, 265], middle: [198, 265] },
  wide: { from: [190, 263], bend: [198, 241], to: [206, 263], middle: [198, 263] },
  shut: { from: [190, 258], bend: [197, 261.5], to: [204, 265], middle: [197, 268] },
  happy: { from: [188, 268], bend: [198, 258], to: [208, 268], middle: [198, 272] },
}
const LASH_COLOR = '#3f3036'
const RAINBOW = ['#ef8a8a', '#f3c96b', '#9fd09a', '#8cc7e8', '#c4a8e6']
const HEART = 'M0 18C-30-2-22-30 0-12 22-30 30-2 0 18Z'
const STAR = 'M0-28 9-9 30-7 14 6 18 27 0 16-18 27-14 6-30-7-9-9Z'

const round1 = (value: number) => Math.round(value * 10) / 10
const at = ([x, y]: Pair) => `${round1(x)} ${round1(y)}`
const along = (a: number, b: number, c: number, t: number) => (1 - t) ** 2 * a + 2 * t * (1 - t) * b + t * t * c
const unit = (x: number, y: number): Pair => {
  const size = Math.hypot(x, y) || 1
  return [x / size, y / size]
}

function lidCurve(lid: Lid, right: boolean) {
  const flip = ([x, y]: Pair): Pair => [right ? 500 - x : x, y]
  const { from, bend, to, middle } = LIDS[lid]
  return { from: flip(from), bend: flip(bend), to: flip(to), middle: flip(middle) }
}

// A spot part way along the lid, which way is out of the eye there, and which way the eye's outer corner is.
function lidSpot(lid: Lid, right: boolean, t: number) {
  const { from, bend, to, middle } = lidCurve(lid, right)
  const x = along(from[0], bend[0], to[0], t)
  const y = along(from[1], bend[1], to[1], t)
  const dx = 2 * (1 - t) * (bend[0] - from[0]) + 2 * t * (to[0] - bend[0])
  const dy = 2 * (1 - t) * (bend[1] - from[1]) + 2 * t * (to[1] - bend[1])
  const away = dx * (y - middle[1]) - dy * (x - middle[0]) > 0 ? 1 : -1
  return { x, y, out: unit(-dy * away, dx * away), outer: unit(from[0] - to[0], from[1] - to[1]) }
}

const FEW = [0.12, 0.3, 0.48]
const MANY = [0.08, 0.22, 0.36, 0.5, 0.64]
const LASH_STYLES: Record<Exclude<Lashes, 'none'>, { spots: readonly number[]; length: number; width: number }> = {
  natural: { spots: FEW, length: 6, width: 2 },
  long: { spots: FEW, length: 10.5, width: 2.2 },
  curly: { spots: FEW, length: 9, width: 2.2 },
  doll: { spots: MANY, length: 8.5, width: 2.8 },
  sparkle: { spots: FEW, length: 8, width: 2 },
  rainbow: { spots: MANY, length: 9, width: 2.6 },
}

// Lashes fan out of each upper lid, leaning toward the outer corner, so they follow the eyes through every mood and blink with them.
export function LashArt({ lashes, lids }: { lashes: Lashes; lids: readonly [Lid, Lid] }) {
  if (lashes === 'none') return null
  const { spots, length, width } = LASH_STYLES[lashes]
  return <g className="lashes" data-lashes={lashes} fill="none" stroke={LASH_COLOR} strokeWidth={width} strokeLinecap="round">
    {lids.map((lid, eye) => spots.map((t, index) => {
      const { x, y, out, outer } = lidSpot(lid, eye === 1, t)
      const lean = 0.7 - 0.8 * t
      const [ux, uy] = unit(out[0] + outer[0] * lean, out[1] + outer[1] * lean)
      // Wide-open eyes sit closer to the brows, so their lashes are a little shorter.
      const size = length * (1.1 - 0.4 * t) * (lid === 'wide' ? 0.8 : 1)
      const tip: Pair = [x + ux * size, y + uy * size]
      const curl: Pair = [tip[0] + (outer[0] * 0.5 - ux * 0.25) * size, tip[1] + (outer[1] * 0.5 - uy * 0.25) * size]
      return <g key={`${eye}-${index}`}>
        <path d={lashes === 'curly' ? `M${at([x, y])}Q${at(tip)} ${at(curl)}` : `M${at([x, y])}L${at(tip)}`} stroke={lashes === 'rainbow' ? RAINBOW[index] : undefined} />
        {lashes === 'sparkle' && <circle cx={round1(tip[0])} cy={round1(tip[1])} r="2.3" fill={index % 2 ? '#d9f1ff' : '#ffe0f0'} stroke="#c48ab4" strokeWidth=".8" />}
      </g>
    }))}
  </g>
}

const SHADOW_COLORS: Record<Exclude<Eyeshadow, 'none' | 'rainbow'>, string> = { pink: '#f2a0bf', lilac: '#b99be0', sky: '#8fc8ec', peach: '#f6b48a', gold: '#e8c25a' }

// A crescent of color from the lid up toward the brow, reaching a little past both corners so it frames the eye, with a wing at the outer corner.
function shadowPath(lid: Lid, right: boolean) {
  const { from, bend, to } = lidCurve(lid, right)
  const { out, outer } = lidSpot(lid, right, 0.5)
  const start: Pair = [from[0] + outer[0] * 3, from[1] + outer[1] * 3]
  const end: Pair = [to[0] - outer[0] * 2, to[1] - outer[1] * 2]
  const raised: Pair = [bend[0] + out[0] * 20, bend[1] + out[1] * 20]
  const wing: Pair = [start[0] + outer[0] * 4 + out[0] * 4, start[1] + outer[1] * 4 + out[1] * 4]
  return `M${at(start)}Q${at(bend)} ${at(end)}Q${at(raised)} ${at(wing)}Z`
}

// Painted on the lids before the eyes, so the eyes sit on top of it.
export function EyeshadowArt({ eyeshadow, lids, id }: { eyeshadow: Eyeshadow; lids: readonly [Lid, Lid]; id: string }) {
  if (eyeshadow === 'none') return null
  return <g className="eyeshadow" data-eyeshadow={eyeshadow} pointerEvents="none">
    {eyeshadow === 'rainbow' && <defs>
      <linearGradient id={`${id}-shadow`} x1="0" y1="1" x2="0" y2="0">
        {RAINBOW.map((color, index) => <stop key={color} offset={index / (RAINBOW.length - 1)} stopColor={color} />)}
      </linearGradient>
    </defs>}
    {lids.map((lid, eye) => <path key={eye} d={shadowPath(lid, eye === 1)} fill={eyeshadow === 'rainbow' ? `url(#${id}-shadow)` : SHADOW_COLORS[eyeshadow]} opacity=".8" />)}
    {eyeshadow === 'gold' && <g fill="#fffbe8">{lids.map((lid, eye) => [0.3, 0.55, 0.8].map((t) => {
      const { x, y, out } = lidSpot(lid, eye === 1, t)
      return <circle key={`${eye}-${t}`} cx={round1(x + out[0] * 6)} cy={round1(y + out[1] * 6)} r="1.2" />
    }))}</g>}
  </g>
}

const BLUSH_COLORS = { rosy: '#ee7489', peach: '#f59767', berry: '#c24f86' } as const
// The middle of the left cheek where it peeks out beside the muzzle; the right cheek mirrors it.
const CHEEK: Pair = [170, 285]
const FRECKLES: readonly Pair[] = [[-7, -2], [1, -6], [7, -1], [-2, 4], [-10, 5], [5, 6]]

export function BlushArt({ blush, id }: { blush: Blush; id: string }) {
  if (blush === 'none') return null
  const cheeks = [CHEEK, [500 - CHEEK[0], CHEEK[1]] as Pair]
  const color = blush === 'rosy' || blush === 'peach' || blush === 'berry' ? BLUSH_COLORS[blush] : null
  return <g className="blush" data-blush={blush} pointerEvents="none">
    {color && <>
      <defs><radialGradient id={`${id}-blush`}><stop stopColor={color} stopOpacity=".85" /><stop offset=".6" stopColor={color} stopOpacity=".45" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient></defs>
      {cheeks.map(([x, y]) => <ellipse key={x} cx={x + (x < 250 ? 6 : -6)} cy={y + 3} rx="22" ry="15" fill={`url(#${id}-blush)`} />)}
    </>}
    {blush === 'hearts' && cheeks.map(([x, y]) => <path key={x} d={HEART} transform={`translate(${x} ${y + 2}) scale(.3)`} fill="#f17895" stroke="#d4567a" strokeWidth="3" />)}
    {blush === 'stars' && cheeks.map(([x, y]) => <path key={x} d={STAR} transform={`translate(${x} ${y}) scale(.27)`} fill="#f7cc5f" stroke="#d6953a" strokeWidth="3.5" strokeLinejoin="round" />)}
    {blush === 'freckles' && <g fill="#8e5f45" opacity=".75">{cheeks.flatMap(([x, y]) => FRECKLES.map(([dx, dy]) =>
      <circle key={`${x} ${dx} ${dy}`} cx={x + (x < 250 ? dx : -dx)} cy={y + dy} r="1.7" />))}</g>}
  </g>
}

const LIP_COLORS: Record<Exclude<Lipstick, 'none'>, string> = { pink: '#e77f9f', cherry: '#d9475b', coral: '#f08a6c', berry: '#a8457a', gloss: '#f4a7b9', glitter: '#d86fa8' }
// Each mouth's lips, painted wider than its line, and where the light catches glossy lips.
const LIPS: Record<LipShape, { d: string; width: number; shine: Pair }> = {
  smile: { d: 'M233 317q17 17 34 0', width: 9, shine: [243.5, 327.4] },
  giggle: { d: 'M233 316q17 24 34 0Z', width: 9, shine: [244, 329.6] },
  surprised: { d: 'M244 325a6 7.5 0 1 0 12 0 6 7.5 0 1 0-12 0Z', width: 9, shine: [247, 335] },
  sneeze: { d: 'M239 324a11 10 0 1 0 22 0 11 10 0 1 0-22 0Z', width: 9, shine: [245.2, 336.2] },
  poked: { d: 'M236 322q3.5-4 7 0t7 0 7 0 7 0', width: 8, shine: [247, 324.8] },
}

// Painted under the mouth's own line, so the mouth still shows through the color.
export function LipstickArt({ lipstick, shape }: { lipstick: Lipstick; shape: LipShape }) {
  if (lipstick === 'none') return null
  const { d, width, shine } = LIPS[shape]
  return <g className="lipstick" data-lipstick={lipstick} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={LIP_COLORS[lipstick]} strokeWidth={width} />
    {lipstick === 'gloss' && <ellipse cx={shine[0]} cy={shine[1]} rx="2.6" ry="1.1" fill="#fff" opacity=".85" />}
    {/* Glitter dots run along both edges of the lips; the mouth covers whichever side falls inside it. */}
    {lipstick === 'glitter' && [-3.1, 3.1].map((shift) => <path key={shift} d={d} transform={`translate(0 ${shift})`} stroke="#fff6d8" strokeWidth="1.5" strokeDasharray=".1 4" />)}
  </g>
}

const OPEN: readonly [Lid, Lid] = ['calm', 'calm']
const ICON_VIEWS: Record<MakeupSlot, string> = { lashes: '174 238 48 40', eyeshadow: '174 238 48 40', blush: '146 264 52 44', lipstick: '222 304 56 36' }

// A close-up of the eye, cheek or lips wearing the makeup, for its button.
export function MakeupIcon({ slot, item }: { slot: MakeupSlot; item: string }) {
  const id = useId().replace(/:/g, '')
  return <svg className="wearable-icon makeup-icon" viewBox={ICON_VIEWS[slot]} aria-hidden="true">
    {slot === 'eyeshadow' && <EyeshadowArt eyeshadow={item as Eyeshadow} lids={OPEN} id={id} />}
    {(slot === 'lashes' || slot === 'eyeshadow') && <ellipse cx="198" cy="265" rx="5" ry="7" fill="#503e33" stroke="#503e33" strokeWidth="5" />}
    {slot === 'lashes' && <LashArt lashes={item as Lashes} lids={OPEN} />}
    {slot === 'blush' && <>
      <clipPath id={`${id}-cheek`}><circle cx="172" cy="286" r="21" /></clipPath>
      <circle cx="172" cy="286" r="21" fill="#dfb38b" />
      <g clipPath={`url(#${id}-cheek)`}><BlushArt blush={item as Blush} id={id} /></g>
    </>}
    {slot === 'lipstick' && <>
      <ellipse cx="250" cy="321" rx="27" ry="16" fill="#dfb38b" />
      <LipstickArt lipstick={item as Lipstick} shape="smile" />
      <path d="M233 317q17 17 34 0" fill="none" stroke="#805b45" strokeWidth="3.5" strokeLinecap="round" />
    </>}
  </svg>
}
