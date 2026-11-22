import { memo, useId } from 'react'
import type { Ref, SVGProps } from 'react'
import { CHARACTERS } from '../game/model'
import type { Look } from '../game/model'
import { SCENE } from '../game/photoBooth'
import type { Background, Face, Frame, Scene, StickerKind } from '../game/photoBooth'
import { Capybara } from './Capybara'

export const BACKGROUND_LABELS: Record<Background, string> = { studio: 'Studio', beach: 'Beach day', stars: 'Starry night', garden: 'Garden', rainbow: 'Rainbow', party: 'Party' }
export const FRAME_LABELS: Record<Frame, string> = { none: 'No frame', polaroid: 'Snapshot', hearts: 'Hearts', flowers: 'Flowers', gold: 'Fancy gold' }
export const FACE_LABELS: Record<Face, string> = { calm: 'Smile', happy: 'Happy', giggle: 'Giggle', surprised: 'Wow!' }
export const STICKER_LABELS: Record<StickerKind, string> = { heart: 'Heart', star: 'Star', sparkle: 'Sparkle', flower: 'Flower', rainbow: 'Rainbow', cloud: 'Cloud', balloon: 'Balloon', paw: 'Paw print' }

const W = SCENE.width
const H = SCENE.height
const HEART = 'M0 16C-26-2-19-26 0-10 19-26 26-2 0 16Z'
const TWINKLE = 'M0-6C.8-1.6 1.6-.8 6 0 1.6.8.8 1.6 0 6-.8 1.6-1.6.8-6 0-1.6-.8-.8-1.6 0-6Z'
const CLOUD = 'M-34 12a14 14 0 0 1 2-27 20 20 0 0 1 36-8 16 16 0 0 1 30 11 12 12 0 0 1 0 24Z'
const PETALS = [0, 72, 144, 216, 288]
const STARS = [[40, 40, 1.2], [110, 72, .8], [180, 30, 1], [252, 58, .7], [380, 150, 1], [30, 150, .9], [92, 210, .6], [362, 240, .8], [24, 290, 1.1], [380, 330, .7], [150, 120, .6], [232, 112, .5]]
const GARDEN_FLOWERS = [[34, 318, '#f3a6bd'], [86, 300, '#fff'], [322, 300, '#c7b4ea'], [372, 318, '#f3a6bd'], [28, 400, '#fff'], [70, 434, '#c7b4ea'], [340, 424, '#fff'], [378, 388, '#f7c08e'], [130, 444, '#f3a6bd'], [290, 446, '#f7c08e']] as const
const RAINBOW = [[196, '#f4a7a6'], [172, '#f7c79a'], [148, '#f5e39b'], [124, '#b8dea3'], [100, '#a7d1ea'], [76, '#c7b3e6']] as const
const PARTY_COLORS = ['#f29bb2', '#f7d27a', '#9fd3c0', '#b7a5e3', '#f6b28c']
// Little flags hung along the bunting string.
const FLAGS = [[20, 36], [60, 45], [100, 49], [140, 48], [180, 43], [220, 33], [260, 28], [300, 27], [340, 32], [380, 41]]
const CONFETTI = [[30, 92, 20], [80, 124, -30], [150, 82, 45], [250, 92, -15], [320, 122, 30], [372, 94, -40], [24, 240, 10], [376, 262, -20], [40, 362, 35], [360, 382, -35], [110, 200, 60], [290, 200, -60], [20, 440, 15], [380, 450, -10], [200, 112, 25], [130, 424, -25]]
const across = (count: number, from: number, to: number) => Array.from({ length: count }, (_, step) => from + (to - from) * step / (count - 1))
const HEART_BORDER = [
  ...across(9, 14, W - 14).flatMap((x) => [[x, 14], [x, H - 14]]),
  ...across(11, 14, H - 14).slice(1, -1).flatMap((y) => [[14, y], [W - 14, y]]),
]
const BLOSSOMS = [
  [16, 16, 1.2, '#f3a6bd'], [W - 16, 16, 1.2, '#c7b4ea'], [16, H - 16, 1.2, '#c7b4ea'], [W - 16, H - 16, 1.2, '#f3a6bd'],
  [200, 10, .8, '#fff'], [200, H - 10, .8, '#fff'], [10, 230, .8, '#fff'], [W - 10, 230, .8, '#fff'],
  [108, 10, .55, '#f3a6bd'], [292, 10, .55, '#c7b4ea'], [108, H - 10, .55, '#c7b4ea'], [292, H - 10, .55, '#f3a6bd'],
  [10, 120, .55, '#c7b4ea'], [W - 10, 120, .55, '#f3a6bd'], [10, 340, .55, '#f3a6bd'], [W - 10, 340, .55, '#c7b4ea'],
] as const

function BackgroundArt({ kind, tint }: { kind: Background; tint: string }) {
  const id = useId().replace(/:/g, '')
  switch (kind) {
    case 'studio': return <g data-background="studio">
      <rect width={W} height={H} fill={tint} />
      <circle cx="200" cy="215" r="175" fill="#fff" opacity=".32" />
      <path d="M0 404q200-26 400 0v56H0Z" fill="#6c6850" opacity=".06" />
    </g>
    case 'beach': return <g data-background="beach">
      <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#a8dcef" /><stop offset="1" stopColor="#e6f6f3" /></linearGradient></defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <circle cx="322" cy="78" r="56" fill="#ffe7a0" opacity=".45" /><circle cx="322" cy="78" r="36" fill="#ffd977" />
      <path d={CLOUD} fill="#fff" opacity=".9" transform="translate(84 92) scale(1.1)" />
      <path d="M0 262q50-10 100 0t100 0 100 0 100 0v90H0Z" fill="#7cc4d6" />
      <path d="M0 290q50-9 100 0t100 0 100 0 100 0" fill="none" stroke="#fff" strokeWidth="4" opacity=".55" />
      <path d="M0 334q110-26 210-8t190-6v140H0Z" fill="#f2dcac" />
      <g fill="#e3c487">{[[40, 400], [120, 432], [250, 442], [330, 410], [372, 446]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" />)}</g>
    </g>
    case 'stars': return <g data-background="stars">
      <defs><linearGradient id={`${id}-night`} x2="0" y2="1"><stop stopColor="#28345f" /><stop offset="1" stopColor="#5d4f8e" /></linearGradient></defs>
      <rect width={W} height={H} fill={`url(#${id}-night)`} />
      <circle cx="320" cy="80" r="32" fill="#fff0bf" /><circle cx="336" cy="68" r="28" fill="#2c3762" />
      <g fill="#fff4c9">{STARS.map(([x, y, size]) => <path key={`${x}-${y}`} d={TWINKLE} transform={`translate(${x} ${y}) scale(${size * 1.4})`} />)}</g>
      <path d="M0 392q110-44 220-14t180-18v100H0Z" fill="#202a4d" opacity=".7" />
    </g>
    case 'garden': return <g data-background="garden">
      <defs><linearGradient id={`${id}-day`} x2="0" y2="1"><stop stopColor="#d4eef7" /><stop offset="1" stopColor="#f2f9ee" /></linearGradient></defs>
      <rect width={W} height={H} fill={`url(#${id}-day)`} />
      <circle cx="74" cy="74" r="30" fill="#ffe08f" />
      <path d={CLOUD} fill="#fff" transform="translate(300 84)" />
      <path d="M0 290q120-62 240-22t160-12v204H0Z" fill="#bcdca4" />
      <path d="M0 356q140-42 280-8t120-4v116H0Z" fill="#9dca86" />
      {GARDEN_FLOWERS.map(([x, y, color]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <path d="M0 0v13" stroke="#6f9f5e" strokeWidth="2.5" />
        <g fill={color} stroke="#d1a6b4" strokeWidth=".8">{PETALS.map((turn) => <circle key={turn} cy="-5" r="4" transform={`rotate(${turn})`} />)}</g>
        <circle r="3" fill="#f7d36d" />
      </g>)}
    </g>
    case 'rainbow': return <g data-background="rainbow">
      <rect width={W} height={H} fill="#fdf3ec" />
      <g fill="none" strokeWidth="24">{RAINBOW.map(([radius, color]) => <path key={radius} d={`M${200 - radius} 340a${radius} ${radius} 0 0 1 ${2 * radius} 0`} stroke={color} />)}</g>
      <g fill="#fff" stroke="#e3ddd4" strokeWidth="2"><path d={CLOUD} transform="translate(54 334) scale(1.5)" /><path d={CLOUD} transform="translate(346 334) scale(-1.5 1.5)" /></g>
      <path d="M0 410q200-24 400 0v50H0Z" fill="#f3e4d6" />
    </g>
    case 'party': return <g data-background="party">
      <defs><linearGradient id={`${id}-party`} x2="0" y2="1"><stop stopColor="#fbe3ec" /><stop offset="1" stopColor="#fdf0e4" /></linearGradient></defs>
      <rect width={W} height={H} fill={`url(#${id}-party)`} />
      {CONFETTI.map(([x, y, turn], index) => <rect key={`${x}-${y}`} x="-6" y="-3" width="12" height="6" rx="2" fill={PARTY_COLORS[index % PARTY_COLORS.length]} transform={`translate(${x} ${y}) rotate(${turn})`} />)}
      {([[46, 160, '#f4a9bd', '#c96f8a'], [354, 176, '#a9d3ec', '#5f97b6']] as const).map(([x, y, fill, line]) => <g key={x} transform={`translate(${x} ${y})`}>
        <path d="M0 36q-9 30 4 62" fill="none" stroke="#9a8a7a" strokeWidth="1.5" />
        <ellipse rx="26" ry="32" fill={fill} stroke={line} strokeWidth="2.5" /><path d="M-5 31h10l-5 7Z" fill={fill} stroke={line} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="-9" cy="-12" rx="6" ry="9" fill="#fff" opacity=".55" />
      </g>)}
      <path d="M-10 26q105 40 210 12t210 14" fill="none" stroke="#b9a08e" strokeWidth="2" />
      {FLAGS.map(([x, y], index) => <path key={x} d="M-14 0h28L0 28Z" fill={PARTY_COLORS[index % PARTY_COLORS.length]} transform={`translate(${x} ${y})`} />)}
    </g>
  }
}

function Blossom({ color }: { color: string }) {
  return <g stroke="#c98da0" strokeWidth="2">
    {PETALS.map((turn) => <ellipse key={turn} cy="-11" rx="8" ry="11" fill={color} transform={`rotate(${turn})`} />)}
    <circle r="7" fill="#f5cf62" stroke="#c9963f" />
  </g>
}

function FrameArt({ kind }: { kind: Frame }) {
  const id = useId().replace(/:/g, '')
  switch (kind) {
    case 'none': return null
    case 'polaroid': return <g data-frame="polaroid">
      <path fillRule="evenodd" d={`M0 0h${W}v${H}H0ZM18 18v372h364V18Z`} fill="#fffdf8" />
      <rect x="18" y="18" width="364" height="372" fill="none" stroke="#e7e0d2" strokeWidth="2" />
      <text x="200" y="434" textAnchor="middle" fontFamily="'Comic Sans MS','Chalkboard SE','Segoe Print',cursive" fontSize="25" fill="#6d6657">Say capy!</text>
    </g>
    case 'hearts': return <g data-frame="hearts">
      <rect x="7" y="7" width={W - 14} height={H - 14} rx="18" fill="none" stroke="#f7c6d3" strokeWidth="14" />
      <g fill="#ee8fab" stroke="#c76683" strokeWidth="5">{HEART_BORDER.map(([x, y]) => <path key={`${x}-${y}`} d={HEART} transform={`translate(${x} ${y + 1}) scale(.5)`} />)}</g>
    </g>
    case 'flowers': return <g data-frame="flowers">
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="20" fill="none" stroke="#a7c98f" strokeWidth="6" />
      {BLOSSOMS.map(([x, y, size, color]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${size})`}>
        {size > 1 && <g fill="#8dbb76">{[30, 150, 270].map((turn) => <ellipse key={turn} cy="-22" rx="6" ry="11" transform={`rotate(${turn})`} />)}</g>}
        <Blossom color={color} />
      </g>)}
    </g>
    case 'gold': return <g data-frame="gold">
      <defs><linearGradient id={`${id}-gold`} x2="1" y2="1"><stop stopColor="#f6e2a0" /><stop offset=".5" stopColor="#d4a648" /><stop offset="1" stopColor="#f3d98a" /></linearGradient></defs>
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="6" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="16" />
      <rect x="22" y="22" width={W - 44} height={H - 44} rx="3" fill="none" stroke="#b78a37" strokeWidth="2" />
      <g stroke="#b78a37">
        {[[10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10]].map(([x, y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle r="15" fill="#f4dc8e" strokeWidth="3" /><circle r="6" fill="#e7a3a0" strokeWidth="2" /></g>)}
        {[[200, 8], [200, H - 8], [8, 230], [W - 8, 230]].map(([x, y]) => <path key={`${x}-${y}`} d="M0-11 11 0 0 11-11 0Z" fill="#f4dc8e" strokeWidth="2.5" transform={`translate(${x} ${y})`} />)}
      </g>
    </g>
  }
}

// Stickers are drawn around 0,0, about as big as a fingertip.
function StickerArt({ kind }: { kind: StickerKind }) {
  switch (kind) {
    case 'heart': return <g stroke="#c4627f" strokeWidth="3" strokeLinejoin="round"><path d={HEART} fill="#f39bb4" /><path d="M-11-12q-6 2-6 8" fill="none" stroke="#fff" strokeLinecap="round" opacity=".8" /></g>
    case 'star': return <path d="M0-23 7-7 24-6 11 5 15 22 0 13-15 22-11 5-24-6-7-7Z" fill="#f8d66d" stroke="#c99a3e" strokeWidth="3" strokeLinejoin="round" />
    case 'sparkle': return <g fill="#fff3ad" stroke="#d3a744" strokeLinejoin="round">
      <path d="M0-24C3-6 6-3 24 0 6 3 3 6 0 24-3 6-6 3-24 0-6-3-3-6 0-24Z" strokeWidth="2.5" />
      <path d={TWINKLE} strokeWidth="1" transform="translate(16 -16) scale(1.3)" />
    </g>
    case 'flower': return <g stroke="#c56f8b" strokeWidth="2.5">
      {PETALS.map((turn) => <ellipse key={turn} cy="-11" rx="8" ry="11" fill="#f7b8ca" transform={`rotate(${turn})`} />)}
      <circle r="7.5" fill="#f6d36e" stroke="#c9963f" />
    </g>
    case 'rainbow': return <g fill="none">
      {([[20, '#ef9c9e'], [14, '#f6d27c'], [8, '#9fd2a6']] as const).map(([radius, color]) => <path key={radius} d={`M${-radius} 8a${radius} ${radius} 0 0 1 ${2 * radius} 0`} stroke={color} strokeWidth="6" />)}
      <g fill="#fff" stroke="#9ab4c4" strokeWidth="2"><circle cx="-20" cy="11" r="7" /><circle cx="-12" cy="13" r="6" /><circle cx="20" cy="11" r="7" /><circle cx="12" cy="13" r="6" /></g>
    </g>
    case 'cloud': return <g>
      <path d={CLOUD} fill="#fff" stroke="#8fb0c3" strokeWidth="4" strokeLinejoin="round" transform="translate(-1 7) scale(.62)" />
      <g fill="#7f9fb2"><circle cx="-7" cy="1" r="2" /><circle cx="7" cy="1" r="2" /></g>
      <path d="M-4 6q4 3 8 0" fill="none" stroke="#7f9fb2" strokeWidth="2" strokeLinecap="round" />
    </g>
    case 'balloon': return <g>
      <path d="M0 18q-6 8 2 16" fill="none" stroke="#7d8f9a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cy="-4" rx="15" ry="19" fill="#9fd1ec" stroke="#5f97b6" strokeWidth="3" />
      <path d="M-4 15h8l-4 5Z" fill="#9fd1ec" stroke="#5f97b6" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="-6" cy="-11" rx="4" ry="6" fill="#fff" opacity=".7" />
    </g>
    case 'paw': return <g fill="#a47c5f"><ellipse cy="8" rx="12" ry="10" /><circle cx="-14" cy="-6" r="5.5" /><circle cx="-5" cy="-14" r="5.5" /><circle cx="5" cy="-14" r="5.5" /><circle cx="14" cy="-6" r="5.5" /></g>
  }
}

export interface LiftedSticker { index: number; x: number; y: number; away: boolean }

interface PhotoSceneProps extends SVGProps<SVGSVGElement> {
  look: Look
  scene: Scene
  svgRef?: Ref<SVGSVGElement>
  // A sticker being dragged to a new spot.
  lifted?: LiftedSticker
}

// A whole photo: the background, the capybara making its face, the frame, and stickers on top.
export const PhotoScene = memo(function PhotoScene({ look, scene, svgRef, lifted, className, ...props }: PhotoSceneProps) {
  const id = useId().replace(/:/g, '')
  const friend = CHARACTERS.find((c) => c.id === look.character)!
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} ref={svgRef} className={className ? `photo-scene ${className}` : 'photo-scene'} {...props}>
    <defs><clipPath id={`${id}-card`}><rect width={W} height={H} rx="20" /></clipPath></defs>
    <g clipPath={`url(#${id}-card)`}>
      <BackgroundArt kind={scene.background} tint={friend.backdrop} />
      {/* Tall hats and hair may poke out of this box, so the scene's own edge does the cropping. */}
      <Capybara look={look} mood={scene.face} viewBox="40 0 420 500" x="10" y="8" width="380" height="452" overflow="visible" aria-hidden="true" />
      <FrameArt kind={scene.frame} />
      {scene.stickers.map((sticker, index) => {
        const held = lifted?.index === index ? lifted : undefined
        // A sticker dragged off the picture waits at the edge, faded, to show it will peel off.
        const x = held ? Math.max(0, Math.min(W, held.x)) : sticker.x
        const y = held ? Math.max(0, Math.min(H, held.y)) : sticker.y
        return <g key={index} data-sticker={sticker.kind} className={held ? `sticker lifted${held.away ? ' away' : ''}` : 'sticker'} transform={`translate(${x} ${y})`}><StickerArt kind={sticker.kind} /></g>
      })}
    </g>
  </svg>
})

export function BackgroundIcon({ kind, tint }: { kind: Background; tint: string }) {
  return <svg className="booth-icon" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><BackgroundArt kind={kind} tint={tint} /></svg>
}

export function FrameIcon({ kind }: { kind: Frame }) {
  return <svg className="booth-icon" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
    <rect width={W} height={H} fill="#e9ecdf" />
    {kind === 'none' ? <rect x="34" y="34" width={W - 68} height={H - 68} rx="16" fill="none" stroke="#b8bdaa" strokeWidth="12" strokeDasharray="34 24" /> : <FrameArt kind={kind} />}
  </svg>
}

export function StickerIcon({ kind }: { kind: StickerKind }) {
  return <svg className="booth-icon sticker-icon" viewBox="-30 -30 60 60" aria-hidden="true"><StickerArt kind={kind} /></svg>
}
