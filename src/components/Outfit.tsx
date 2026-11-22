import { memo, useId } from 'react'
import type { ReactNode } from 'react'
import type { Outfit } from '../game/model'

export const OUTFIT_LABELS: Record<Outfit, string> = {
  cozy: 'Cozy cape',
  hero: 'Super capy',
  sweater: 'Snuggly sweater',
  overalls: 'Overalls',
  princess: 'Princess gown',
  tutu: 'Twirly tutu',
  hoodie: 'Comfy hoodie',
  raincoat: 'Rainy day coat',
  party: 'Party dress',
  tee: 'Star tee',
  garland: 'Flower lei',
  wizard: 'Wizard robe',
  sailor: 'Sailor top',
  apron: 'Chef apron',
  pajamas: 'Sleepy PJs',
  poncho: 'Rainbow poncho',
  tuxedo: 'Fancy suit',
  fairy: 'Fairy wings',
  sundress: 'Sunny sundress',
  mermaid: 'Mermaid shimmer',
  kimono: 'Blossom kimono',
  strawberry: 'Strawberry dress',
  unicorn: 'Unicorn dress',
  frost: 'Snow queen cape',
  butterfly: 'Butterfly dress',
  cupcake: 'Cupcake dress',
  heart: 'Sweetheart dress',
  daisy: 'Daisy dress',
}

interface ArtProps {
  outfit: Outfit
  id: string
  fur: string
  light: string
}

// Clothes are drawn in two layers around the paws: `back` sits under them (the body, anything behind it) and `front`
// over them (skirts, capes and sleeves that hang past the paws). Everything uses plain attributes, never CSS classes,
// so a saved picture carries the clothes too.
type Layer = (props: ArtProps) => ReactNode

const FUR_LINE = '#88694e'
const round1 = (value: number) => Math.round(value * 10) / 10

function starPath(cx: number, cy: number, outer: number, inner: number) {
  let path = ''
  for (let tip = 0; tip < 10; tip++) {
    const radius = tip % 2 ? inner : outer
    const angle = (tip * Math.PI) / 5 - Math.PI / 2
    path += `${tip ? 'L' : 'M'}${round1(cx + radius * Math.cos(angle))} ${round1(cy + radius * Math.sin(angle))}`
  }
  return `${path}Z`
}

const stars = (list: number[][]) => list.map(([x, y, outer, inner]) => starPath(x, y, outer, inner)).join('')

// A moon: a circle with a smaller circle bitten out of its right side.
function crescentPath(cx: number, cy: number, radius: number) {
  const bite = radius * 0.82
  const shift = radius * 0.5
  const x = (shift * shift + radius * radius - bite * bite) / (2 * shift)
  const y = Math.sqrt(radius * radius - x * x)
  const major = x > shift ? 1 : 0
  const [px, top, bottom] = [round1(cx + x), round1(cy - y), round1(cy + y)]
  return `M${px} ${top}A${radius} ${radius} 0 1 0 ${px} ${bottom}A${round1(bite)} ${round1(bite)} 0 ${major} 1 ${px} ${top}Z`
}

// Both arms as rounded bars hanging at the sides of the body.
function capsules(top: number, bottom: number) {
  const arm = (x: number) => `M${x} ${top + 22}a22 22 0 0 1 44 0V${bottom - 22}a22 22 0 0 1-44 0Z`
  return arm(134) + arm(322)
}

// A zig-zag fringe of blades pointing down.
function fringe(from: number, to: number, top: number, tip: number, step: number) {
  let path = `M${from} ${top}`
  for (let x = from; x + step <= to + 0.1; x += step) path += `L${x + step / 2} ${tip}L${x + step} ${top}`
  return `${path}Z`
}

const scallops = (count: number, width: number, depth: number) => `a${width / 2} ${depth} 0 0 0 ${width} 0`.repeat(count)

const LEI_STRING = 'M176 350Q250 436 324 350'
// Dots along the flower lei at the given positions (0 to 1) of its curve.
function leiDots(stops: number[]) {
  return stops.map((t) => {
    const u = 1 - t
    return `M${round1(u * u * 176 + 2 * u * t * 250 + t * t * 324)} ${round1(u * u * 350 + 2 * u * t * 436 + t * t * 350)}h.1`
  }).join('')
}

const PONCHO_OUTLINE = 'M160 326 122 446Q250 458 378 446L340 326Z'
const PONCHO_BANDS = [
  { y: 428, color: '#8fc4e3' }, { y: 416, color: '#a9d49a' }, { y: 404, color: '#f5e08a' }, { y: 392, color: '#f6bf8a' }, { y: 380, color: '#f4a3a8' },
]
// The poncho above a straight cut across it, used to stack its rainbow stripes.
function ponchoAbove(y: number) {
  const left = 160 - 38 * ((y - 326) / 120)
  return `M160 326L${round1(left)} ${y}H${round1(500 - left)}L340 326Z`
}
const PONCHO_FRINGE = Array.from({ length: 21 }, (_, step) => {
  const x = 126 + step * 12
  const t = (x - 122) / 256
  const y = round1(446 + 24 * t * (1 - t))
  return `M${x} ${y}v9`
}).join('')

const LEAF = 'M250 398C224 412 224 440 250 456C276 440 276 412 250 398Z'
const LEAVES = [{ angle: -75, color: '#8cc276' }, { angle: 75, color: '#8cc276' }, { angle: -50, color: '#a9d392' }, { angle: 50, color: '#a9d392' }, { angle: -25, color: '#c2e0a6' }, { angle: 25, color: '#c2e0a6' }, { angle: 0, color: '#b4da9a' }]

// Small shapes are drawn as zero-length strokes with round caps, so a whole scatter of them costs a single path.
const dots = (list: number[][]) => list.map(([x, y]) => `M${x} ${y}h.1`).join('')

// Round petals around each flower [x, y, reach], to be drawn as dots.
function petals(list: number[][], count = 5) {
  return list.map(([cx, cy, reach]) => Array.from({ length: count }, (_, petal) => {
    const angle = (petal * 2 * Math.PI) / count - Math.PI / 2
    return `M${round1(cx + reach * Math.cos(angle))} ${round1(cy + reach * Math.sin(angle))}h.1`
  }).join('')).join('')
}

// Hearts [x, y, width], each point down and centered on its position.
function hearts(list: number[][]) {
  return list.map(([cx, cy, width]) => {
    const at = (x: number, y: number) => `${round1(cx + x * width)} ${round1(cy + y * width)}`
    return `M${at(0, 0.45)}C${at(-0.55, 0.05)} ${at(-0.55, -0.4)} ${at(-0.27, -0.4)}C${at(-0.1, -0.4)} ${at(0, -0.28)} ${at(0, -0.2)}C${at(0, -0.28)} ${at(0.1, -0.4)} ${at(0.27, -0.4)}C${at(0.55, -0.4)} ${at(0.55, 0.05)} ${at(0, 0.45)}Z`
  }).join('')
}

// Six-armed snowflakes [x, y, reach]: three strokes crossing at the middle.
function snowflakes(list: number[][]) {
  return list.map(([cx, cy, reach]) => [0, 60, 120].map((degrees) => {
    const dx = round1(reach * Math.cos((degrees * Math.PI) / 180))
    const dy = round1(reach * Math.sin((degrees * Math.PI) / 180))
    return `M${round1(cx - dx)} ${round1(cy - dy)}L${round1(cx + dx)} ${round1(cy + dy)}`
  }).join('')).join('')
}

// A band of cloth with a scalloped hem, from x across `count` scallops of `width`.
const flounce = (x: number, top: number, bottom: number, count: number, width: number, depth: number) => `M${x} ${top}V${bottom}${scallops(count, width, depth)}V${top}Z`

const RAINBOW = ['#f4a3a8', '#f6bf8a', '#f5e08a', '#a9d49a', '#8fc4e3']

function Torso({ fill, stroke }: { fill: string; stroke: string }) {
  return <rect x="149" y="305" width="202" height="140" rx="42" fill={fill} stroke={stroke} strokeWidth="3" />
}

interface ArmsProps {
  fur: string
  // Sleeve colors. Without them the bare fur arms show.
  tone?: string
  line?: string
  // Where the sleeve ends; shorter than the full arm leaves the rest bare.
  reach?: number
  cuff?: string
}

function Arms({ fur, tone, line, reach = 434, cuff }: ArmsProps) {
  return <>
    {(!tone || reach < 434) && <path d={capsules(346, 434)} fill={fur} stroke={FUR_LINE} strokeWidth="3" />}
    {tone && <path d={capsules(346, reach)} fill={tone} stroke={line} strokeWidth="3" />}
    {tone && cuff && <path d={`M136 ${reach - 14}h40M324 ${reach - 14}h40`} stroke={cuff} strokeWidth="8" />}
  </>
}

const WING = <>
  <path d="M158 352C128 322 92 282 74 296 58 312 78 366 128 376 142 378 152 366 158 352Z" fill="#d4eef2" fillOpacity=".92" stroke="#8cc3cf" strokeWidth="2.5" strokeLinejoin="round" />
  <path d="M156 380C126 382 94 404 98 430 102 452 140 444 160 410 164 398 162 388 156 380Z" fill="#e3f4f6" fillOpacity=".92" stroke="#8cc3cf" strokeWidth="2.5" strokeLinejoin="round" />
  <path d="M154 354C126 336 100 312 84 302M150 380C122 384 106 398 104 422" fill="none" stroke="#8cc3cf" strokeWidth="2" strokeLinecap="round" opacity=".7" />
</>

// Round-petalled flowers [x, y, reach]: an edge ring, the petals, then the middle.
function flowers(list: number[][], petal: string, edge: string, middle: string, count = 5, core = 4.5) {
  const ring = petals(list, count)
  return <>
    <path d={ring} fill="none" stroke={edge} strokeWidth="9.5" strokeLinecap="round" />
    <path d={ring} fill="none" stroke={petal} strokeWidth="6.5" strokeLinecap="round" />
    <path d={dots(list)} fill="none" stroke={middle} strokeWidth={core} strokeLinecap="round" />
  </>
}

// Fluffy white fur: a row of round tufts along a curve, over a slightly bigger soft outline.
const furTrim = (d: string) => <>
  <path d={d} fill="none" stroke="#a9c4d9" strokeWidth="19" strokeDasharray="0.1 11" strokeLinecap="round" />
  <path d={d} fill="none" stroke="#fff" strokeWidth="14" strokeDasharray="0.1 11" strokeLinecap="round" />
</>

const SUNDRESS_BOW = <>
  <path d="M285 412 273 442 287 435ZM291 412 303 442 289 435Z" fill="#f29a86" stroke="#c96f5f" strokeWidth="2.5" strokeLinejoin="round" />
  <path d="M288 408C272 392 258 398 262 410 266 424 282 420 288 408ZM288 408C304 392 318 398 314 410 310 424 294 420 288 408Z" fill="#f6ad9b" stroke="#c96f5f" strokeWidth="2.5" strokeLinejoin="round" />
  <circle cx="288" cy="408" r="5" fill="#f29a86" stroke="#c96f5f" strokeWidth="2.5" />
</>

// Hips, a narrow knee, then a two-lobed fin that spreads over the feet.
const MERMAID_TAIL = 'M151 404H349C349 420 340 428 332 432C356 438 380 446 388 460C340 478 280 470 250 452C220 470 160 478 112 460C120 446 144 438 168 432C160 428 151 420 151 404Z'
const MERMAID_RAYS = <path d="M172 441Q148 447 124 457M184 451Q154 459 130 464M198 459Q172 467 152 465" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
const shell = (x: number) => <>
  <path d={`M${x - 17} 392A17 17 0 0 1 ${x + 17} 392Z`} fill="#f6b3d0" stroke="#c9789f" strokeWidth="2.5" strokeLinejoin="round" />
  <path d={`M${x} 392V378M${x} 392 ${x - 9} 381M${x} 392 ${x + 9} 381`} fill="none" stroke="#c9789f" strokeWidth="2" strokeLinecap="round" />
</>

// The left sleeve; the right one is the same drawing mirrored.
const KIMONO_SLEEVE_SHAPE = 'M126 360Q126 348 138 348H174Q186 348 186 360V438Q186 448 176 448H136Q126 448 126 438Z'
const KIMONO_SLEEVE = <>
  <path d={KIMONO_SLEEVE_SHAPE} fill="#f9dbe4" />
  <path d="M127.5 436H184.5V438Q184.5 446.5 176 446.5H136Q127.5 446.5 127.5 438Z" fill="#f4a3b8" />
  {flowers([[154, 376, 4.5], [168, 402, 4.5], [148, 418, 4.5]], '#fffaf0', '#e98aa8', '#f6d66f')}
  <path d={KIMONO_SLEEVE_SHAPE} fill="none" stroke="#d99bb0" strokeWidth="3" strokeLinejoin="round" />
</>

const BERRY = 'M147 352H353C360 404 322 450 250 458C178 450 140 404 147 352Z'
const SEEDS = [[200, 406], [232, 407], [268, 407], [300, 406], [186, 419], [216, 420], [250, 420], [284, 420], [314, 419], [200, 432], [232, 433], [268, 433], [300, 432], [232, 445], [268, 445]].map(([x, y]) => `M${x} ${y}v2.5`).join('')
const CALYX_LEAF = 'M250 364C240 372 240 392 250 402C260 392 260 372 250 364Z'
const CALYX_ANGLES = [-72, -36, 0, 36, 72]

// A cape panel hanging from the left shoulder, trimmed with fur; the right one is mirrored.
const frostPanel = (id: string) => <>
  <path d="M178 340C140 362 116 408 112 454Q150 468 190 454L202 366Z" fill={`url(#${id}-ice)`} stroke="#79a9cf" strokeWidth="3" strokeLinejoin="round" />
  <path d={snowflakes([[140, 392, 7], [162, 426, 6], [132, 436, 5]])} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  {furTrim('M202 366 190 454')}
  {furTrim('M112 454Q150 468 190 454')}
</>

// Both wings on the left side, the lower one first so the upper wing overlaps it; the right side is mirrored.
const butterflyWings = (id: string) => <>
  <path d="M156 384C132 380 96 390 90 416 86 440 118 456 140 432 152 420 160 400 156 384Z" fill={`url(#${id}-wing)`} stroke="#8a5aa8" strokeWidth="3" strokeLinejoin="round" />
  <path d="M158 356C140 316 108 296 84 308 64 320 70 360 96 378 116 392 144 388 158 372Z" fill={`url(#${id}-wing)`} stroke="#8a5aa8" strokeWidth="3" strokeLinejoin="round" />
  <path d="M154 362Q124 342 92 318M152 378Q118 376 94 372M154 396Q126 400 102 420" fill="none" stroke="#8a5aa8" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
  <path d={dots([[98, 336], [112, 354]])} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="10" strokeLinecap="round" />
  <path d={dots([[100, 360], [116, 420], [128, 404]])} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="6" strokeLinecap="round" />
</>
const MINI_BUTTERFLIES = [{ x: 198, y: 424, color: '#f9b95c' }, { x: 250, y: 432, color: '#f58ab4' }, { x: 302, y: 424, color: '#f9b95c' }]

// Pleat lines of the cupcake wrapper, from the waist out to the wider hem.
const CUPCAKE_PLEATS = Array.from({ length: 7 }, (_, step) => {
  const top = 173.5 + step * 25.5
  return `M${top} 404L${round1(250 + (top - 250) * 1.184)} 452`
}).join('')
const SPRINKLES = [
  { color: '#ffffff', d: 'M190 391l4-2M218 400l4 2M296 381l4-2M308 396l3 3' },
  { color: '#8fc4e3', d: 'M206 382l3 3M230 396l4-2M274 402l4 1M300 404l3-3' },
  { color: '#f5e08a', d: 'M198 400l4-2M222 384l4 2M280 384l3 3M312 388l-1 4' },
  { color: '#a9d49a', d: 'M210 394l3-3M236 380l4-1M268 394l4 1M292 392l3 3' },
]

const HEM_HEARTS = Array.from({ length: 10 }, (_, step) => 136 + step * (228 / 9))

// Two on the bodice, a chain along the waist, then four scattered on the skirt.
const DAISIES = [
  [206, 397, 6], [294, 397, 6],
  ...Array.from({ length: 9 }, (_, step) => [170 + step * 20, 412, 6]),
  [192, 432, 6], [226, 440, 6], [274, 440, 6], [308, 432, 6],
]

const ART: Record<Outfit, { back: Layer; front: Layer }> = {
  cozy: {
    back: () => <>
      <rect x="149" y="305" width="202" height="140" rx="42" fill="#9bac95" stroke="#82977d" strokeWidth="3" />
      <rect x="129" y="373" width="242" height="40" rx="16" fill="#b9c6a9" stroke="#82977d" strokeWidth="3" />
    </>,
    front: ({ id }) => <>
      <defs><linearGradient id={`${id}-cape`} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#e8acaa" /><stop offset="1" stopColor="#d99394" /></linearGradient></defs>
      <path d="M185 327c-26 19-44 62-45 110 58 27 159 26 220 0-3-48-22-95-45-110Z" fill={`url(#${id}-cape)`} stroke="#bc8081" strokeWidth="3" />
      <path d="m196 351-19 72m126-72 18 72" fill="none" stroke="#f2c6bd" strokeWidth="3" opacity=".65" />
      <path d="M210 352q40 25 81 0" fill="none" stroke="#fff4df" strokeWidth="15" />
      <g fill="none" stroke="#f9ddd1" strokeWidth="2.5" strokeLinecap="round"><path d="M234 402c-14-10-20 6 16 26 36-20 30-36 16-26l-16 12Z" /><path d="m213 395 4 4m68-4-4 4m-31-14v5" /></g>
    </>,
  },
  hero: {
    back: () => <>
      <path d="M176 316C130 340 108 410 112 466c44 16 232 16 276 0 4-56-18-126-64-150Z" fill="#d9707a" stroke="#b0525d" strokeWidth="3" />
      <Torso fill="#86b0e0" stroke="#5f88bb" />
      <path d="M160 421h180v12H160Z" fill="#f2cf6b" stroke="#c4a04a" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="250" cy="396" r="20" fill="#f7e08c" stroke="#c4a04a" strokeWidth="3" />
      <path d={starPath(250, 396, 13, 5.5)} fill="#e0707a" stroke="#b0525d" strokeWidth="2" strokeLinejoin="round" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#86b0e0" line="#5f88bb" cuff="#f2cf6b" />,
  },
  sweater: {
    back: () => <>
      <Torso fill="#f2bd96" stroke="#c9946f" />
      <path d="M160 392h180M160 412h180M164 430h172" stroke="#fff0dc" strokeWidth="8" />
      <path d="M204 354q46 44 92 0" fill="none" stroke="#c9946f" strokeWidth="21" strokeLinecap="round" />
      <path d="M204 354q46 44 92 0" fill="none" stroke="#fff0dc" strokeWidth="15" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#f2bd96" line="#c9946f" cuff="#fff0dc" />,
  },
  overalls: {
    back: () => <>
      <Torso fill="#f4d97e" stroke="#c9ad4f" />
      <path d="M204 384 182 356M296 384l22-28" stroke="#5a82ab" strokeWidth="16" />
      <path d="M204 384 182 356M296 384l22-28" stroke="#7ea6d0" strokeWidth="10" />
      <path d="M200 372h100v20h51v11a42 42 0 0 1-42 42H191a42 42 0 0 1-42-42v-11h51Z" fill="#7ea6d0" stroke="#5a82ab" strokeWidth="3" strokeLinejoin="round" />
      <path d="M232 400h36v18q0 6-6 6h-24q-6 0-6-6Z" fill="none" stroke="#5a82ab" strokeWidth="2.5" strokeDasharray="4 3" />
      <path d="M208 386h.1M292 386h.1" stroke="#f4d97e" strokeWidth="9" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#f4d97e" line="#c9ad4f" reach={392} />,
  },
  princess: {
    back: () => <Torso fill="#c7aee8" stroke="#9d83c4" />,
    front: ({ fur }) => <>
      <path d={`M170 398 124 438${scallops(9, 28, 11)}L330 398Z`} fill="#dccbf2" stroke="#9d83c4" strokeWidth="3" strokeLinejoin="round" />
      <path d="M206 410 192 440M250 410v36M294 410l14 30" fill="none" stroke="#b79bde" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
      <path d="M152 394h196v14H152Z" fill="#f3b9cf" stroke="#cf8ba7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M246 408 238 432M254 408l8 24" stroke="#ea92b3" strokeWidth="6" strokeLinecap="round" />
      <path d="M250 401c-16-14-32-6-28 8s24 4 28-8Zm0 0c16-14 32-6 28 8s-24 4-28-8Z" fill="#ea92b3" stroke="#b9638a" strokeWidth="2.5" strokeLinejoin="round" />
      <Arms fur={fur} />
      <circle cx="152" cy="366" r="27" fill="#ddcdf3" stroke="#9d83c4" strokeWidth="3" />
      <circle cx="348" cy="366" r="27" fill="#ddcdf3" stroke="#9d83c4" strokeWidth="3" />
    </>,
  },
  tutu: {
    back: () => <>
      <Torso fill="#f4b6cf" stroke="#cf87a8" />
      <path d="M202 358q48 40 96 0" fill="none" stroke="#fbd6e5" strokeWidth="8" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <>
      <ellipse cx="250" cy="434" rx="136" ry="17" fill="#f7bfd5" stroke="#d796b3" strokeWidth="3" />
      <ellipse cx="250" cy="428" rx="120" ry="15" fill="#f9cfe0" stroke="#d796b3" strokeWidth="3" />
      <ellipse cx="250" cy="422" rx="102" ry="12" fill="#fcdfea" stroke="#d796b3" strokeWidth="3" />
      <path d="M168 424h.1M206 434h.1M294 434h.1M332 424h.1M250 436h.1" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M198 396h104v13H198Z" fill="#ee9fc0" stroke="#cf87a8" strokeWidth="3" strokeLinejoin="round" />
      <Arms fur={fur} />
    </>,
  },
  hoodie: {
    back: () => <>
      <Torso fill="#7dc1bb" stroke="#549a95" />
      <ellipse cx="250" cy="352" rx="84" ry="35" fill="#6bb2ac" stroke="#549a95" strokeWidth="3" />
      <path d="M190 408h120l10 24H180Z" fill="#6bb2ac" stroke="#549a95" strokeWidth="3" strokeLinejoin="round" />
      <path d="M232 380v32M268 380v32" stroke="#f6edd2" strokeWidth="4" strokeLinecap="round" />
      <path d="M232 417h.1M268 417h.1" stroke="#e3d6aa" strokeWidth="8" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#7dc1bb" line="#549a95" cuff="#549a95" />,
  },
  raincoat: {
    back: () => <Torso fill="#f6dc72" stroke="#cdb04a" />,
    front: ({ fur }) => <>
      <path d="M149 392 131 446H369L351 392Z" fill="#f6dc72" />
      <path d="M149 392 131 446H369L351 392" fill="none" stroke="#cdb04a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M250 376V446" stroke="#cdb04a" strokeWidth="3" />
      <path d="M232 396h.1M232 414h.1M232 432h.1M268 396h.1M268 414h.1M268 432h.1" stroke="#e9a93c" strokeWidth="8" strokeLinecap="round" />
      <path d="M182 414h32v16h-32ZM286 414h32v16h-32Z" fill="#f2d25f" stroke="#cdb04a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M210 366 194 394l36-8ZM290 366l16 28-36-8Z" fill="#f0cf52" stroke="#cdb04a" strokeWidth="3" strokeLinejoin="round" />
      <Arms fur={fur} tone="#f6dc72" line="#cdb04a" cuff="#e9c653" />
    </>,
  },
  party: {
    back: () => <>
      <Torso fill="#f6b5c8" stroke="#d68ba3" />
      <path d="M186 384h.1M214 392h.1M286 392h.1M314 384h.1M250 400h.1" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <>
      <path d="M158 398 124 444Q250 466 376 444L342 398Z" fill="#f9c3d3" stroke="#d68ba3" strokeWidth="3" strokeLinejoin="round" />
      <path d="M190 414h.1M226 424h.1M262 412h.1M298 424h.1M174 414h.1M326 410h.1M160 436h.1M206 442h.1M250 446h.1M294 442h.1M340 436h.1" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M154 392h192v12H154Z" fill="#f5d67a" stroke="#c9a547" strokeWidth="3" strokeLinejoin="round" />
      <path d="M250 398c-18-15-36-6-31 9s27 5 31-9Zm0 0c18-15 36-6 31 9s-27 5-31-9Z" fill="#f8e29a" stroke="#c9a547" strokeWidth="2.5" strokeLinejoin="round" />
      <Arms fur={fur} tone="#f6b5c8" line="#d68ba3" reach={392} />
    </>,
  },
  tee: {
    back: () => <>
      <Torso fill="#9fd0ea" stroke="#74a8c6" />
      <path d="M206 356q44 36 88 0" fill="none" stroke="#74a8c6" strokeWidth="7" strokeLinecap="round" />
      <path d={starPath(250, 408, 25, 11)} fill="#f6d66f" stroke="#c9a74a" strokeWidth="3" strokeLinejoin="round" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#9fd0ea" line="#74a8c6" reach={392} />,
  },
  garland: {
    back: ({ fur, light }) => <>
      <Torso fill={fur} stroke={FUR_LINE} />
      <ellipse cx="250" cy="408" rx="50" ry="32" fill={light} opacity=".55" />
    </>,
    front: ({ fur }) => <>
      <path d={fringe(124, 364, 412, 452, 16)} fill="#7fb06a" stroke="#5f8f4d" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={fringe(132, 372, 412, 448, 16)} fill="#9bcd80" stroke="#6e9f58" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M134 414h232" stroke="#c79a58" strokeWidth="11" strokeLinecap="round" />
      <path d="M142 414h216" stroke="#ebd29c" strokeWidth="3" strokeDasharray="6 5" />
      <path d={LEI_STRING} fill="none" stroke="#6fae5f" strokeWidth="10" strokeLinecap="round" />
      <path d={leiDots([0.12, 0.5, 0.88])} stroke="#f48fb1" strokeWidth="17" strokeLinecap="round" />
      <path d={leiDots([0.25, 0.62])} stroke="#fff0cf" strokeWidth="17" strokeLinecap="round" />
      <path d={leiDots([0.38, 0.75])} stroke="#f9b45f" strokeWidth="17" strokeLinecap="round" />
      <path d={leiDots([0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88])} stroke="#f6d66f" strokeWidth="6" strokeLinecap="round" />
      <Arms fur={fur} />
    </>,
  },
  wizard: {
    back: () => <Torso fill="#7a78c0" stroke="#58579a" />,
    front: () => <>
      <path d="M149 392 124 448Q250 466 376 448L351 392Z" fill="#7a78c0" />
      <path d="M149 392 124 448Q250 466 376 448L351 392" fill="none" stroke="#58579a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M206 366 250 400 294 366M250 400V454" fill="none" stroke="#e7d48a" strokeWidth="4" strokeLinejoin="round" />
      <path d={stars([[196, 396, 5, 2.2], [304, 398, 6, 2.6], [194, 438, 7, 3], [222, 444, 5, 2.2], [288, 446, 6, 2.6]])} fill="#f3df8e" />
      <path d={crescentPath(318, 430, 11)} fill="#f3df8e" />
      <path d="M152 410Q250 428 348 410" fill="none" stroke="#e7d48a" strokeWidth="7" strokeLinecap="round" />
      <path d="M250 418 242 442M250 418l9 22" stroke="#e7d48a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="250" cy="419" r="6" fill="#f3df8e" stroke="#c9b25f" strokeWidth="2.5" />
      <path d="M150 350 122 440H186L182 350ZM350 350 378 440H314L318 350Z" fill="#7a78c0" stroke="#58579a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M128 430H185M315 430H372" stroke="#e7d48a" strokeWidth="6" />
    </>,
  },
  sailor: {
    back: () => <>
      <Torso fill="#f6f2e8" stroke="#cbc5b2" />
      <path d="M178 358 250 430 322 358V374L250 446 178 374Z" fill="#41598a" stroke="#2f426a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M182 366 250 438 318 366" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M245 402 233 428 250 421 267 428 255 402Z" fill="#e0636e" stroke="#b44450" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="250" cy="396" r="8" fill="#e0636e" stroke="#b44450" strokeWidth="2.5" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#f6f2e8" line="#cbc5b2" reach={392} cuff="#41598a" />,
  },
  apron: {
    back: () => <Torso fill="#e98f87" stroke="#bf6a63" />,
    front: ({ fur }) => <>
      <path d="M212 372H288V396H322V440H178V396H212Z" fill="#fbf7ee" stroke="#cfc7b0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M178 428H322" stroke="#e98f87" strokeWidth="4" />
      <path d="M226 406h48v18H226Z" fill="none" stroke="#cfc7b0" strokeWidth="2.5" strokeLinejoin="round" />
      <Arms fur={fur} tone="#e98f87" line="#bf6a63" cuff="#fbf7ee" />
    </>,
  },
  pajamas: {
    back: () => <>
      <Torso fill="#c9bee8" stroke="#9b8fc6" />
      <path d="M204 354q46 44 92 0" fill="none" stroke="#f1edfb" strokeWidth="9" strokeLinecap="round" />
      <path d="M250 378V440" stroke="#9b8fc6" strokeWidth="2.5" />
      <path d="M250 388h.1M250 406h.1M250 424h.1" stroke="#f1edfb" strokeWidth="8" strokeLinecap="round" />
      <path d={stars([[200, 394, 6, 2.6], [300, 392, 5, 2.2], [210, 432, 5, 2.2], [292, 434, 6, 2.6]])} fill="#f6dd7d" />
      <path d={crescentPath(204, 412, 8) + crescentPath(298, 414, 8)} fill="#f6dd7d" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#c9bee8" line="#9b8fc6" cuff="#f1edfb" />,
  },
  poncho: {
    back: () => <Torso fill="#eadfc9" stroke="#c7b99d" />,
    front: () => <>
      <path d={PONCHO_OUTLINE} fill="#b9a5e0" />
      {PONCHO_BANDS.map(({ y, color }) => <path key={y} d={ponchoAbove(y)} fill={color} />)}
      <path d={PONCHO_OUTLINE} fill="none" stroke="#8f7fa8" strokeWidth="3" strokeLinejoin="round" />
      <path d={PONCHO_FRINGE} fill="none" stroke="#d9c28a" strokeWidth="3.5" strokeLinecap="round" />
    </>,
  },
  tuxedo: {
    back: () => <>
      <Torso fill="#585d73" stroke="#3d4154" />
      <path d="M200 362 250 430 300 362Z" fill="#fbf7ee" stroke="#8b90a8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M250 404h.1M250 420h.1" stroke="#3d4154" strokeWidth="5" strokeLinecap="round" />
      <path d="M250 382 228 370V394ZM250 382 272 370V394Z" fill="#d9525f" stroke="#a63a46" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="250" cy="382" r="5" fill="#d9525f" stroke="#a63a46" strokeWidth="2.5" />
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#585d73" line="#3d4154" cuff="#fbf7ee" />,
  },
  fairy: {
    back: () => <>
      <g>{WING}</g>
      <g transform="matrix(-1 0 0 1 500 0)">{WING}</g>
      <Torso fill="#a9d392" stroke="#7ba865" />
      <path d="M204 374c10-14 28-12 34 0-12 10-28 10-34 0ZM296 374c-10-14-28-12-34 0 12 10 28 10 34 0Z" fill="#8cc276" stroke="#6a9a58" strokeWidth="2.5" />
    </>,
    front: ({ fur }) => <>
      {LEAVES.map(({ angle, color }) => <path key={angle} d={LEAF} transform={`rotate(${angle} 250 398)`} fill={color} stroke="#6a9a58" strokeWidth="2.5" strokeLinejoin="round" />)}
      <Arms fur={fur} />
    </>,
  },
  sundress: {
    back: ({ fur, light }) => <>
      <Torso fill={fur} stroke={FUR_LINE} />
      <ellipse cx="250" cy="388" rx="46" ry="24" fill={light} opacity=".55" />
    </>,
    front: ({ id, fur }) => <>
      <defs>
        <pattern id={`${id}-check`} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#f8d974" />
          <rect width="12" height="24" fill="#fff7d6" fillOpacity=".6" />
          <rect width="24" height="12" fill="#fff7d6" fillOpacity=".6" />
        </pattern>
      </defs>
      <path d="M204 394 196 352M296 394 304 352" fill="none" stroke="#c96f5f" strokeWidth="16" strokeLinecap="round" />
      <path d="M204 394 196 352M296 394 304 352" fill="none" stroke="#f29a86" strokeWidth="10" strokeLinecap="round" />
      <path d="M164 388Q250 408 336 388V416H164Z" fill={`url(#${id}-check)`} stroke="#d8b24a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M164 388Q250 408 336 388" fill="none" stroke="#f29a86" strokeWidth="5" strokeLinecap="round" />
      <path d="M152 412H348L376 448Q250 466 124 448Z" fill={`url(#${id}-check)`} stroke="#d8b24a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M124 448Q250 466 376 448" fill="none" stroke="#f29a86" strokeWidth="6" strokeLinecap="round" />
      <path d="M152 400H348V416H152Z" fill="#f29a86" stroke="#c96f5f" strokeWidth="3" strokeLinejoin="round" />
      {SUNDRESS_BOW}
      <Arms fur={fur} />
    </>,
  },
  mermaid: {
    back: ({ fur, light }) => <>
      <Torso fill={fur} stroke={FUR_LINE} />
      <ellipse cx="250" cy="392" rx="48" ry="24" fill={light} opacity=".55" />
    </>,
    front: ({ id, fur }) => <>
      <defs>
        <linearGradient id={`${id}-fin`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#7fdcd4" /><stop offset=".55" stopColor="#82b4ee" /><stop offset="1" stopColor="#b79af2" />
        </linearGradient>
      </defs>
      <path d={MERMAID_TAIL} fill={`url(#${id}-fin)`} stroke="#5b86c2" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M160 410${scallops(9, 20, 9)}M170 419${scallops(8, 20, 9)}M180 428${scallops(7, 20, 9)}`} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      {MERMAID_RAYS}
      <g transform="matrix(-1 0 0 1 500 0)">{MERMAID_RAYS}</g>
      <path d={stars([[134, 452, 4.5, 2], [366, 452, 4.5, 2], [250, 438, 5, 2.2]])} fill="#fff" fillOpacity=".9" />
      <path d="M203 380 198 360M297 380 302 360" fill="none" stroke="#c9789f" strokeWidth="2" strokeLinecap="round" />
      {shell(213)}
      {shell(287)}
      <Arms fur={fur} />
    </>,
  },
  kimono: {
    back: () => <>
      <Torso fill="#fbf0e3" stroke="#d9c4aa" />
      <path d="M200 358 250 400 300 358" fill="none" stroke="#d9a3b3" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M200 358 250 400 300 358" fill="none" stroke="#f7d3dc" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    front: () => <>
      <path d="M147 426H353L363 452Q250 464 137 452Z" fill="#fbf0e3" stroke="#d9c4aa" strokeWidth="3" strokeLinejoin="round" />
      <path d="M141 447Q250 459 359 447" fill="none" stroke="#f4a3b8" strokeWidth="7" />
      {flowers([[200, 436, 4.5], [225, 440, 4.5], [250, 436, 4.5], [275, 440, 4.5], [300, 436, 4.5]], '#f6adc0', '#e0809f', '#f6d66f')}
      <rect x="149" y="392" width="202" height="34" rx="6" fill="#e0708f" stroke="#b94d6d" strokeWidth="3" />
      <path d="M154 401H346M154 417H346" stroke="#f4a3b8" strokeWidth="2.5" />
      <path d="M156 409H344" stroke="#f6d66f" strokeWidth="3.5" strokeDasharray="0.1 9" strokeLinecap="round" />
      <circle cx="250" cy="409" r="8" fill="#f6d66f" stroke="#c9a547" strokeWidth="2.5" />
      <circle cx="250" cy="409" r="3" fill="#e0708f" />
      <g>{KIMONO_SLEEVE}</g>
      <g transform="matrix(-1 0 0 1 500 0)">{KIMONO_SLEEVE}</g>
    </>,
  },
  strawberry: {
    back: ({ fur }) => <>
      <Torso fill={fur} stroke={FUR_LINE} />
      <path d={BERRY} fill="#ee6a7b" stroke="#c4485b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M188 386Q180 412 196 436" fill="none" stroke="#f9a0ac" strokeWidth="5" strokeLinecap="round" />
      <path d={SEEDS} fill="none" stroke="#fff2cc" strokeWidth="3.6" strokeLinecap="round" />
      {CALYX_ANGLES.map((angle) => <path key={angle} d={CALYX_LEAF} transform={`rotate(${angle} 250 364)`} fill="#7fb86a" stroke="#4f8f45" strokeWidth="2.5" strokeLinejoin="round" />)}
    </>,
    front: ({ fur }) => <Arms fur={fur} tone="#ee6a7b" line="#c4485b" reach={392} cuff="#fff2cc" />,
  },
  unicorn: {
    back: () => <>
      <Torso fill="#f6f1fd" stroke="#cdbfe3" />
      {RAINBOW.map((color, row) => <path key={color} d={`M184 358Q250 ${2 * (402 - row * 7) - 358} 316 358`} fill="none" stroke={color} strokeWidth="6.5" />)}
    </>,
    front: ({ fur }) => <>
      <path d={`M160 412 124 446${scallops(9, 28, 10)}L340 412Z`} fill="#cdb8ee" stroke="#a98fd4" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M166 412 138 435${scallops(8, 28, 10)}L334 412Z`} fill="#dccbf4" stroke="#a98fd4" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M174 412 152 424${scallops(7, 28, 9)}L326 412Z`} fill="#eadffa" stroke="#a98fd4" strokeWidth="3" strokeLinejoin="round" />
      <path d={stars([[204, 424, 4.5, 2], [296, 424, 4.5, 2], [250, 432, 4.5, 2], [160, 440, 5, 2.2], [340, 440, 5, 2.2], [210, 447, 5, 2.2], [290, 447, 5, 2.2]])} fill="#f6d66f" />
      <path d="M149 406H351V418H149Z" fill="#f6d66f" stroke="#c9a547" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="250" cy="412" r="11" fill="#fff" stroke="#c9a547" strokeWidth="2.5" />
      <path d="M250 400 256 416H244Z" fill="#f6d66f" stroke="#c9a547" strokeWidth="2" strokeLinejoin="round" />
      <Arms fur={fur} tone="#f6f1fd" line="#cdbfe3" reach={392} cuff="#f3b9cf" />
    </>,
  },
  frost: {
    back: () => <Torso fill="#e4f2fb" stroke="#a9c9e0" />,
    front: ({ id }) => <>
      <defs>
        <linearGradient id={`${id}-ice`} x1="0" y1="0" x2="0.6" y2="1"><stop stopColor="#cdeaf8" /><stop offset="1" stopColor="#8fc1e3" /></linearGradient>
      </defs>
      <path d="M170 414H330L352 452Q250 468 148 452Z" fill="#e4f2fb" stroke="#a9c9e0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M149 402H351V414H149Z" fill="#c9d8e8" stroke="#9fb8d0" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="250" cy="408" r="10" fill="#fff" stroke="#8fb5d3" strokeWidth="2.5" />
      <path d={snowflakes([[250, 408, 6]])} fill="none" stroke="#8fb5d3" strokeWidth="1.8" strokeLinecap="round" />
      <g>{frostPanel(id)}</g>
      <g transform="matrix(-1 0 0 1 500 0)">{frostPanel(id)}</g>
      {furTrim('M186 352Q250 398 314 352')}
    </>,
  },
  butterfly: {
    back: ({ id }) => <>
      <defs>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f9b95c" /><stop offset="1" stopColor="#f58ab4" /></linearGradient>
      </defs>
      <g>{butterflyWings(id)}</g>
      <g transform="matrix(-1 0 0 1 500 0)">{butterflyWings(id)}</g>
      <Torso fill="#cdb8ee" stroke="#9f86cc" />
      <path d="M204 354q46 44 92 0" fill="none" stroke="#9f86cc" strokeWidth="9" strokeLinecap="round" />
      <path d="M204 354q46 44 92 0" fill="none" stroke="#efe6fb" strokeWidth="5" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <>
      <path d={`M162 406 133 438${scallops(9, 26, 10)}L338 406Z`} fill="#e6daf8" stroke="#9f86cc" strokeWidth="3" strokeLinejoin="round" />
      {MINI_BUTTERFLIES.map(({ x, y, color }) => <g key={x} fill="none" strokeLinecap="round">
        <path d={dots([[x - 4, y - 2], [x + 4, y - 2]])} stroke={color} strokeWidth="7" />
        <path d={dots([[x - 3, y + 4], [x + 3, y + 4]])} stroke={color} strokeWidth="5" />
        <path d={`M${x} ${y - 4}v10`} stroke="#8a5aa8" strokeWidth="1.8" />
      </g>)}
      <path d="M152 398H348V410H152Z" fill="#b48ad4" stroke="#8a5aa8" strokeWidth="3" strokeLinejoin="round" />
      <Arms fur={fur} />
    </>,
  },
  cupcake: {
    back: () => <Torso fill="#f8bfd2" stroke="#d98aa8" />,
    front: ({ fur }) => <>
      <path d="M148 404H352L370 452H130Z" fill="#dba97b" stroke="#b07f52" strokeWidth="3" strokeLinejoin="round" />
      <path d={CUPCAKE_PLEATS} fill="none" stroke="#b9895a" strokeWidth="2.5" strokeLinecap="round" />
      <path d={flounce(149, 384, 404, 8, 25.25, 11)} fill="#f8bfd2" />
      <path d={`M149 404${scallops(8, 25.25, 11)}`} fill="none" stroke="#d98aa8" strokeWidth="3" strokeLinejoin="round" />
      {SPRINKLES.map(({ color, d }) => <path key={color} d={d} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />)}
      <path d="M252 380Q258 368 268 364" fill="none" stroke="#7a5a3a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="250" cy="390" r="11" fill="#e0475b" stroke="#a82e43" strokeWidth="2.5" />
      <path d="M244 386q2-3 5-3" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.5" strokeLinecap="round" />
      <Arms fur={fur} />
    </>,
  },
  heart: {
    back: () => <>
      <Torso fill="#e968a9" stroke="#b8387c" />
      <path d={hearts([[250, 388, 42]])} fill="#ffd6e8" stroke="#d98bb4" strokeWidth="2.5" strokeLinejoin="round" />
    </>,
    front: ({ fur }) => <>
      <path d="M154 408H346L374 442H126Z" fill="#ee7db5" stroke="#b8387c" strokeWidth="3" strokeLinejoin="round" />
      <path d={hearts([[212, 427, 11], [250, 429, 11], [288, 427, 11]])} fill="#ffd6e8" />
      {HEM_HEARTS.map((x) => <path key={x} d={hearts([[x, 444, 28]])} fill="#ffd6e8" stroke="#d98bb4" strokeWidth="2.5" strokeLinejoin="round" />)}
      <path d="M149 406H351V418H149Z" fill="#ffd6e8" stroke="#d98bb4" strokeWidth="3" strokeLinejoin="round" />
      <Arms fur={fur} tone="#e968a9" line="#b8387c" reach={392} cuff="#ffd6e8" />
    </>,
  },
  daisy: {
    back: () => <>
      <Torso fill="#b7c6f2" stroke="#8a9bd0" />
      <path d="M176 354Q250 398 324 354" fill="none" stroke="#c7cfe9" strokeWidth="15" strokeDasharray="0.1 8" strokeLinecap="round" />
      <path d="M176 354Q250 398 324 354" fill="none" stroke="#fffdf6" strokeWidth="11" strokeDasharray="0.1 8" strokeLinecap="round" />
    </>,
    front: ({ fur }) => <>
      <path d="M152 414H348L380 448Q250 466 120 448Z" fill="#b7c6f2" stroke="#8a9bd0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M156 412H344" fill="none" stroke="#8cc276" strokeWidth="4" strokeLinecap="round" />
      {flowers(DAISIES, '#fffdf6', '#c7cfe9', '#f6d66f', 8, 6)}
      <Arms fur={fur} tone="#b7c6f2" line="#8a9bd0" reach={392} cuff="#fffdf6" />
    </>,
  },
}

export const OutfitBack = memo(function OutfitBack(props: ArtProps) {
  return <>{ART[props.outfit].back(props)}</>
})

export const OutfitFront = memo(function OutfitFront(props: ArtProps) {
  return <>{ART[props.outfit].front(props)}</>
})

export const Paws = memo(function Paws({ fur }: { fur: string }) {
  return <>
    <path d="M172 433c-19 12-22 34-4 36h35l14-33m69 0 14 33h35c18-2 15-24-4-36" fill={fur} stroke={FUR_LINE} strokeWidth="3" />
    <path d="M177 458v10m10-10v10m126-10v10m10-10v10" stroke={FUR_LINE} strokeWidth="3" strokeLinecap="round" />
  </>
})

const ICON_FUR = '#c9a27c'
const ICON_FUR_LIGHT = '#e2c3a1'

// A small picture of the clothes for the dress-up buttons, drawn from the same art the capybara wears.
export const OutfitIcon = memo(function OutfitIcon({ outfit }: { outfit: Outfit }) {
  const id = useId().replace(/:/g, '')
  const props = { outfit, id, fur: ICON_FUR, light: ICON_FUR_LIGHT }
  return <svg className="outfit-icon" viewBox="72 298 356 178" aria-hidden="true" focusable="false">
    <OutfitBack {...props} />
    <Paws fur={ICON_FUR} />
    <OutfitFront {...props} />
  </svg>
})
