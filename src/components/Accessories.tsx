import type { ReactNode } from 'react'
import type { Clip, ClipKind, Glasses, Hat, Headband, Look, WearSlot } from '../game/model'
import { clipPosition, clipTilt, HALO_SPOT, usualSpot, wornSpot } from '../game/accessories'
import type { HairOffsets, Point } from '../game/hair'
import { HEADBAND_PATH, headbandY } from '../game/hairline'

export const HAT_LABELS: Record<Hat, string> = {
  none: 'No hat', crown: 'Royal crown', party: 'Party hat', beanie: 'Cozy beanie', sunhat: 'Sun hat', tophat: 'Top hat',
  cowboy: 'Cowboy hat', chef: 'Chef hat', witch: 'Witch hat', pirate: 'Pirate hat', cap: 'Ball cap', tiara: 'Sparkly tiara', strawberry: 'Berry beanie',
}
export const GLASSES_LABELS: Record<Glasses, string> = {
  none: 'No glasses', round: 'Round specs', hearts: 'Heart eyes', stars: 'Star power', shades: 'Cool shades',
  cateye: 'Cat-eye glam', goggles: 'Swim goggles', monocle: 'Fancy monocle', disguise: 'Silly disguise', rainbow: 'Rainbow specs',
}
export const HEADBAND_LABELS: Record<Headband, string> = {
  none: 'No headband', ribbon: 'Pink ribbon', bunny: 'Bunny ears', kitty: 'Kitty ears', flowers: 'Flower crown',
  unicorn: 'Unicorn horn', bee: 'Bee antennae', bear: 'Teddy ears', antlers: 'Reindeer antlers', halo: 'Angel halo',
}
export const CLIP_LABELS: Record<ClipKind, string> = {
  bow: 'Bow', daisy: 'Daisy', star: 'Star', cherries: 'Cherries', heart: 'Heart', butterfly: 'Butterfly',
  moon: 'Moon', rainbow: 'Rainbow', strawberry: 'Strawberry', shell: 'Seashell', snowflake: 'Snowflake', ladybug: 'Ladybug',
}

const HEART = 'M0 18C-30-2-22-30 0-12 22-30 30-2 0 18Z'
const STAR = 'M0-28 9-9 30-7 14 6 18 27 0 16-18 27-14 6-30-7-9-9Z'
const RAINBOW = ['#ef8a8a', '#f3c96b', '#9fd09a', '#8cc7e8', '#c4a8e6']

// Little seeds dotted over a strawberry.
function Seeds({ spots, size = 2.4 }: { spots: number[][]; size?: number }) {
  return <g fill="#fff1b0" stroke="none">{spots.map(([x, y]) => <ellipse key={`${x} ${y}`} cx={x} cy={y} rx={size * .7} ry={size} />)}</g>
}

function Daisy({ petal = '#fff1db', middle = '#e6bc61', line = '#ce947c' }: { petal?: string; middle?: string; line?: string }) {
  return <g stroke={line} strokeWidth="4">
    {[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cx="0" cy="-18" rx="13" ry="19" fill={petal} transform={`rotate(${angle})`} />)}
    <circle r="14" fill={middle} /><circle cx="-4" cy="-4" r="4" fill="#f7d986" stroke="none" />
  </g>
}

function Bow() {
  return <g stroke="#b7657c" strokeWidth="6"><path fill="#e99eb5" d="M-6-3C-58-49-59 42-6 11M6-3C58-49 59 42 6 11" /><path fill="#edb3c4" d="m-3 8-15 33 16-6 10 7 7-34" /><rect x="-10" y="-9" width="20" height="26" rx="8" fill="#f6c6d1" /></g>
}

// Hats are drawn with the middle of the brim at 0,0.
function HatArt({ hat }: { hat: Hat }) {
  switch (hat) {
    case 'none': return null
    case 'crown': return <g transform="rotate(-6) translate(-41 -44)" stroke="#b99044" strokeWidth="3"><path fill="#efd080" d="m0 0 21 15L40-13l20 28L81 0l-8 44H8Z" /><path d="M8 33h65" /><circle cx="41" cy="21" r="5" fill="#e39a97" />{[0, 40, 81].map((x) => <circle key={x} cx={x} cy={x === 40 ? -13 : 0} r="5" fill="#f9e6ae" />)}</g>
    case 'party': return <g transform="rotate(8)" stroke="#9a6a7e" strokeWidth="3" strokeLinejoin="round">
      <path d="M-36 0 0-90 36 0Q0 12-36 0Z" fill="#f2b8c9" />
      <g stroke="none"><circle cx="-13" cy="-20" r="5.5" fill="#fff3c4" /><circle cx="11" cy="-40" r="5" fill="#bfe0e6" /><circle cx="15" cy="-12" r="4.5" fill="#d8c9ef" /><circle cx="-4" cy="-62" r="4" fill="#fff3c4" /></g>
      <path d="M-37 1Q0 14 37 1" fill="none" stroke="#e48fa8" strokeWidth="6" strokeLinecap="round" />
      <circle cy="-94" r="10" fill="#fff3c4" />
    </g>
    case 'beanie': return <g stroke="#5f7f94" strokeWidth="3">
      <path d="M-60-8C-60-80 60-80 60-8Z" fill="#a9cbe0" />
      <path d="M-30-58c4 14 4 28 2 46M0-66v54M30-58c-4 14-4 28-2 46" fill="none" stroke="#86afc8" strokeLinecap="round" />
      <rect x="-66" y="-16" width="132" height="22" rx="10" fill="#f3e1bd" />
      <circle cy="-78" r="13" fill="#f3e1bd" />
    </g>
    case 'sunhat': return <g transform="rotate(-5)" stroke="#a88a4e" strokeWidth="3">
      <ellipse cy="-6" rx="94" ry="17" fill="#f3dca4" />
      <path d="M-46-10C-46-66 46-66 46-10Z" fill="#f6e3b4" />
      <path d="M-46-12Q0-2 46-12L46-26Q0-16-46-26Z" fill="#e99eb5" strokeWidth="2.5" />
      <g transform="translate(30 -22) scale(.42)"><Daisy /></g>
    </g>
    case 'tophat': return <g transform="rotate(4)" stroke="#3b3040" strokeWidth="3">
      <ellipse cy="-4" rx="62" ry="11" fill="#5c4f63" />
      <path d="M-38-6V-88Q0-96 38-88V-6Z" fill="#6c5d75" />
      <path d="M-38-24H38V-40H-38Z" fill="#e99eb5" strokeWidth="2.5" />
      <path d="M-27-80V-48" stroke="#8e7e98" strokeWidth="5" strokeLinecap="round" />
    </g>
    case 'cowboy': return <g transform="rotate(-4)" stroke="#7a5236" strokeWidth="3" strokeLinejoin="round">
      <path d="M-46-8C-50-44-40-72-22-72-12-72-8-62 0-62S12-72 22-72C40-72 50-44 46-8Z" fill="#c99466" />
      <path d="M-46-14Q0-4 46-14L45-28Q0-18-45-28Z" fill="#8a5a3a" />
      <path d="M0-30l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#f3d36b" strokeWidth="1.5" />
      <path d="M-92-22C-82 4 82 4 92-22 72-6 42-6 0-6S-72-6-92-22Z" fill="#b9835a" />
    </g>
    case 'chef': return <g stroke="#b9ad9c" strokeWidth="3" strokeLinejoin="round">
      <path d="M-42-26C-72-30-70-80-38-74-34-102 6-106 12-86 36-104 72-84 52-60 74-50 62-24 42-26Z" fill="#fffdf8" />
      <rect x="-44" y="-30" width="88" height="32" rx="7" fill="#fffaf0" />
      <path d="M-22-28V-2M0-28V-2M22-28V-2" stroke="#e3d9ca" strokeWidth="2.5" />
    </g>
    case 'witch': return <g stroke="#3f3254" strokeWidth="3" strokeLinejoin="round">
      <ellipse cy="-4" rx="84" ry="14" fill="#6d5a8e" />
      <path d="M-40-8C-30-40-14-74 6-96 14-104 32-104 40-96 26-96 20-90 18-80 26-48 34-24 40-8Z" fill="#7e68a3" />
      <path d="M-38-14Q0-6 38-14L35-28Q0-20-35-28Z" fill="#9fc59a" />
      <rect x="-9" y="-28" width="18" height="16" rx="3" fill="#f3d36b" strokeWidth="2.5" /><rect x="-3" y="-23" width="6" height="6" fill="#9fc59a" stroke="none" />
      <path d="M-14-60l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f3d36b" stroke="none" />
    </g>
    case 'pirate': return <g stroke="#241d29" strokeWidth="3" strokeLinejoin="round">
      <path d="M-84-4C-66-26-38-8 0-12 38-8 66-26 84-4 64-58 26-72 0-58-26-72-64-58-84-4Z" fill="#3e3446" />
      <path d="M-84-4C-66-26-38-8 0-12 38-8 66-26 84-4" fill="none" stroke="#e2b956" strokeWidth="5" strokeLinecap="round" />
      <path d="M-13-26 13-40M-13-40 13-26" stroke="#fffaf0" strokeWidth="5" strokeLinecap="round" />
      <circle cy="-40" r="11" fill="#fffaf0" stroke="none" /><circle cx="-4" cy="-41" r="2.6" fill="#3e3446" stroke="none" /><circle cx="4" cy="-41" r="2.6" fill="#3e3446" stroke="none" />
    </g>
    case 'cap': return <g transform="rotate(-6)" stroke="#a65a5a" strokeWidth="3" strokeLinejoin="round">
      <path d="M-56-4C-58-64 56-64 56-4Z" fill="#e98c8c" />
      <path d="M0-58V-6M-30-48q10 18 8 42M30-48q-10 18-8 42" fill="none" stroke="#f3b0ae" strokeWidth="2.5" />
      <path d="M-6-6C30-16 80-14 94 0 62 10 20 10-6 2Z" fill="#d97575" />
      <circle cy="-58" r="6" fill="#f3b0ae" />
    </g>
    case 'tiara': return <g stroke="#8e9bb0" strokeWidth="3" strokeLinejoin="round">
      <path d="M-52 0C-42-16-26-20-16-22L0-50 16-22C26-20 42-16 52 0Q0-10-52 0Z" fill="#e8edf5" />
      <path d="M-34-12-28-28-20-16M34-12 28-28 20-16" fill="#e8edf5" />
      <path d="M0-40 7-30 0-20-7-30Z" fill="#e88fb0" strokeWidth="2" />
      {[-26, 26].map((x) => <circle key={x} cx={x} cy="-12" r="4.5" fill="#9fd0e6" strokeWidth="2" />)}
      <path d="M-44-34l2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM46-40l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#fff6c9" stroke="#d6b45a" strokeWidth="1.2" />
    </g>
    case 'strawberry': return <g stroke="#a73f4a" strokeWidth="3" strokeLinejoin="round">
      <path d="M-60-4C-64-74 64-74 60-4Q0 8-60-4Z" fill="#e8606a" />
      <Seeds spots={[[-38, -16], [-18, -10], [4, -14], [26, -10], [44, -18], [-30, -36], [-8, -32], [16, -34], [36, -38], [-16, -52], [8, -54]]} size={3} />
      <path d="M0-60C-20-76-44-68-36-56-22-62-10-58 0-60ZM0-60C20-76 44-68 36-56 22-62 10-58 0-60ZM0-60C-10-80 10-80 0-60Z" fill="#7fb069" stroke="#4f7a43" />
      <path d="M0-64q2-16 10-22" fill="none" stroke="#4f7a43" strokeWidth="4" strokeLinecap="round" />
    </g>
  }
}

// Glasses are drawn over the eyes, which sit at 198,265 and 302,265.
function GlassesArt({ glasses }: { glasses: Glasses }) {
  switch (glasses) {
    case 'none': return null
    case 'round': return <g fill="none" stroke="#7b5a8c" strokeWidth="4" strokeLinecap="round">
      <circle cx="198" cy="265" r="22" fill="#dff3f7" fillOpacity=".35" /><circle cx="302" cy="265" r="22" fill="#dff3f7" fillOpacity=".35" />
      <path d="M220 262q30-12 60 0M176 260l-14-8M324 260l14-8" />
    </g>
    case 'hearts': return <g stroke="#c8607d" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      {[198, 302].map((x) => <path key={x} d={HEART} transform={`translate(${x} 262) scale(.95)`} fill="#f7c3d2" fillOpacity=".5" />)}
      <path d="M223 256q27-10 54 0M175 255l-13-6M325 255l13-6" fill="none" />
    </g>
    case 'stars': return <g stroke="#c99b3f" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      {[198, 302].map((x) => <path key={x} d={STAR} transform={`translate(${x} 265) scale(.92)`} fill="#f6dc8c" fillOpacity=".5" />)}
      <path d="M224 262q26-10 52 0M174 260l-12-7M326 260l12-7" fill="none" />
    </g>
    case 'shades': return <g stroke="#2b2430" strokeWidth="4" strokeLinecap="round">
      {[170, 274].map((x) => <rect key={x} x={x} y="249" width="56" height="33" rx="14" fill="#3b3440" fillOpacity=".9" />)}
      <path d="M226 260q24-8 48 0M170 258l-10-6M330 258l10-6" fill="none" />
      <path d="M181 258l9-5M285 258l9-5" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
    </g>
    case 'cateye': return <g stroke="#c8507f" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      {/* The right lens is the left one flipped over the middle of the face. */}
      {['', 'translate(500 0) scale(-1 1)'].map((flip) => <g key={flip} transform={flip || undefined}>
        <path d="M162 244Q186 252 204 250Q224 250 224 264Q222 284 198 284Q176 282 174 266Q172 254 162 244Z" fill="#fbe0ea" fillOpacity=".45" />
        <circle cx="168" cy="250" r="3" fill="#fff6c9" stroke="#d6b45a" strokeWidth="1.5" />
      </g>)}
      <path d="M224 260q26-10 52 0" fill="none" />
    </g>
    case 'goggles': return <g strokeLinecap="round">
      <path d="M148 262h26M326 262h26" stroke="#e0a24f" strokeWidth="9" />
      <path d="M220 263h60" stroke="#5d7a91" strokeWidth="6" />
      {[198, 302].map((x) => <g key={x}><circle cx={x} cy="265" r="24" fill="#bfe6f2" fillOpacity=".5" stroke="#5d7a91" strokeWidth="7" /><path d={`M${x - 12} ${256}q6-6 13-6`} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="3" /></g>)}
    </g>
    case 'monocle': return <g stroke="#c99b3f" strokeLinecap="round">
      <circle cx="302" cy="265" r="21" fill="#e6f4f8" fillOpacity=".35" strokeWidth="4.5" />
      <path d="M292 254q6-5 13-4" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="3" />
      <path d="M320 277q14 12 10 30" fill="none" strokeWidth="3" strokeDasharray="1 5" />
    </g>
    case 'disguise': return <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M176 238q22-12 44 0M280 238q22-12 44 0" fill="none" stroke="#4a362c" strokeWidth="8" />
      {[198, 302].map((x) => <circle key={x} cx={x} cy="265" r="20" fill="#dff3f7" fillOpacity=".25" stroke="#2b2430" strokeWidth="6" />)}
      <path d="M218 263q32-10 64 0M178 260l-14-8M322 260l14-8" fill="none" stroke="#2b2430" strokeWidth="5" />
      <path d="M250 297C238 288 220 290 214 304 226 298 236 305 250 301 264 305 274 298 286 304 280 290 262 288 250 297Z" fill="#4a362c" stroke="#33251e" strokeWidth="2" />
      <ellipse cx="250" cy="284" rx="15" ry="13" fill="#f0a09a" stroke="#a45e5a" strokeWidth="3" /><path d="M243 278q3-3 7-3" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
    </g>
    case 'rainbow': return <g fill="none" strokeLinecap="round">
      {[198, 302].map((x) => <g key={x}>{RAINBOW.slice(0, 3).map((color, ring) => <circle key={color} cx={x} cy="265" r={24 - ring * 3.5} stroke={color} strokeWidth="3.5" />)}<circle cx={x} cy="265" r="14" fill="#fffdf6" fillOpacity=".3" /></g>)}
      <path d="M222 261q28-13 56 0" stroke={RAINBOW[4]} strokeWidth="4" /><path d="M174 260l-13-7M326 260l13-7" stroke={RAINBOW[3]} strokeWidth="4" />
    </g>
  }
}

function Ear({ x, tilt, outer, inner, line, kitty }: { x: number; tilt: number; outer: string; inner: string; line: string; kitty?: boolean }) {
  const y = headbandY(x) + 2
  return <g transform={`translate(${x} ${y}) rotate(${tilt})`} stroke={line} strokeWidth="3" strokeLinejoin="round">
    {kitty ? <><path d="M-20 4-3-40 20 2Z" fill={outer} /><path d="M-10 0-3-24 9 0Z" fill={inner} stroke="none" /></>
      : <><ellipse cy="-36" rx="13" ry="38" fill={outer} /><ellipse cy="-34" rx="6" ry="26" fill={inner} stroke="none" /></>}
  </g>
}

const BAND_COLORS: Record<Exclude<Headband, 'none' | 'halo'>, { band: string; line: string }> = {
  ribbon: { band: '#e99eb5', line: '#b7657c' },
  bunny: { band: '#f8f4ee', line: '#a99c8c' },
  kitty: { band: '#8a6a5c', line: '#5e463b' },
  flowers: { band: '#9fbf8a', line: '#6f8f5c' },
  unicorn: { band: '#d8c9ef', line: '#9c86c2' },
  bee: { band: '#f3cf55', line: '#3f3540' },
  bear: { band: '#9a7158', line: '#6a4c3c' },
  antlers: { band: '#c4956a', line: '#7d5a3c' },
}

// Something standing up from the headband at `x`, leaning out by `tilt` degrees.
function OnBand({ x, tilt = 0, lift = 2, children }: { x: number; tilt?: number; lift?: number; children: ReactNode }) {
  return <g transform={`translate(${x} ${headbandY(x) + lift}) rotate(${tilt})`}>{children}</g>
}

const ANTLER = 'M0 0C-2-18-8-32-20-46M-5-20C-16-22-26-28-30-38M-12-36C-12-44-8-50-2-54'

// Headbands go across the top of the head, over the roots of the hair. The halo floats above it instead.
function HeadbandArt({ headband }: { headband: Headband }) {
  if (headband === 'none') return null
  if (headband === 'halo') return <g className="halo">
    <ellipse cx="250" cy="142" rx="58" ry="14" fill="none" stroke="#c9a23f" strokeWidth="11" />
    <ellipse cx="250" cy="142" rx="58" ry="14" fill="none" stroke="#f3d36b" strokeWidth="7" />
    <path d="M214 134q18-6 36-6" fill="none" stroke="#fff6c9" strokeWidth="3" strokeLinecap="round" />
    <path d="M318 118l2 5 5 2-5 2-2 5-2-5-5-2 5-2ZM180 126l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#fff6c9" stroke="#d6b45a" strokeWidth="1.2" />
  </g>
  const colors = BAND_COLORS[headband]
  return <g>
    {headband === 'bunny' && [218, 282].map((x, side) => <Ear key={x} x={x} tilt={side ? 10 : -10} outer="#f8f4ee" inner="#f2c3cd" line="#a99c8c" />)}
    {headband === 'kitty' && [212, 288].map((x, side) => <Ear key={x} x={x} tilt={side ? 14 : -14} outer="#8a6a5c" inner="#f2c3cd" line="#5e463b" kitty />)}
    {headband === 'bear' && [204, 296].map((x) => <OnBand key={x} x={x} lift={-14}>
      <circle r="21" fill="#9a7158" stroke="#6a4c3c" strokeWidth="3" /><circle r="11" fill="#e8b9a6" />
    </OnBand>)}
    {headband === 'bee' && [226, 274].map((x, side) => <OnBand key={x} x={x}>
      <path d={side ? 'M0 0q10-26 26-40' : 'M0 0q-10-26-26-40'} fill="none" stroke="#3f3540" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx={side ? 27 : -27} cy="-42" r="9" fill="#3f3540" /><circle cx={side ? 24 : -30} cy="-45" r="2.6" fill="#fff" fillOpacity=".7" />
    </OnBand>)}
    {headband === 'antlers' && [214, 286].map((x, side) => <OnBand key={x} x={x} tilt={side ? 8 : -8}>
      <g transform={side ? 'scale(-1 1)' : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={ANTLER} stroke="#6b4a2e" strokeWidth="10" /><path d={ANTLER} stroke="#a77b4f" strokeWidth="6" />
      </g>
    </OnBand>)}
    <path d={HEADBAND_PATH} fill="none" stroke={colors.line} strokeWidth={headband === 'flowers' ? 10 : 15} strokeLinecap="round" />
    <path d={HEADBAND_PATH} fill="none" stroke={colors.band} strokeWidth={headband === 'flowers' ? 6 : 11} strokeLinecap="round" />
    {headband === 'bee' && <path d={HEADBAND_PATH} fill="none" stroke="#3f3540" strokeWidth="11" strokeDasharray="10 12" />}
    {headband === 'unicorn' && <OnBand x={250} lift={4}>
      <path d="M-13 0 0-60 13 0Z" fill="#fff3c4" stroke="#c9a44f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M-10-12l18-6M-7-26l13-5M-4-40l8-3" fill="none" stroke="#e2b956" strokeWidth="2.5" strokeLinecap="round" />
      {[[-24, 4, '#f6c6d1'], [24, 4, '#cfe6ef']].map(([dx, dy, petal]) => <g key={dx} transform={`translate(${dx} ${dy}) scale(.3)`}><Daisy petal={petal as string} /></g>)}
    </OnBand>}
    {headband === 'ribbon' && <g transform={`translate(196 ${headbandY(196)}) rotate(-24) scale(.5)`}><Bow /></g>}
    {headband === 'flowers' && [192, 221, 250, 279, 308].map((x, index) =>
      <g key={x} transform={`translate(${x} ${headbandY(x)}) scale(.36)`}><Daisy petal={['#f6c6d1', '#fff1db', '#d8c9ef', '#fff3c4', '#cfe6ef'][index]} /></g>)}
  </g>
}

// Clips are drawn around 0,0.
function ClipArt({ kind }: { kind: ClipKind }) {
  switch (kind) {
    case 'bow': return <g transform="scale(.42)"><Bow /></g>
    case 'daisy': return <g transform="scale(.5)"><Daisy /></g>
    case 'star': return <g transform="scale(.62)" stroke="#b79753" strokeWidth="4.5"><path fill="#f2d480" d="m0-28 9 19 22 3-16 16 3 22L0 21l-19 11 4-22-16-16 22-3Z" /></g>
    case 'cherries': return <g transform="scale(.55) translate(-2 -16)" stroke="#776e44" strokeWidth="5"><path d="M-13 33 0-2l17 30" fill="none" /><path d="M0-2C21-23 34 0 0-2" fill="#9eb78b" /><circle cx="-14" cy="34" r="16" fill="#d7767b" /><circle cx="18" cy="30" r="16" fill="#e48d8b" /><path d="m-21 27 4-3m28 2 4-3" stroke="#ffc7b4" strokeWidth="5" /></g>
    case 'heart': return <g transform="scale(.8)" stroke="#b7657c" strokeWidth="3.5" strokeLinejoin="round"><path d={HEART} fill="#ec9cae" /><path d="M-11-10q-5 3-4 9" fill="none" stroke="#fff" strokeOpacity=".7" strokeLinecap="round" /></g>
    case 'butterfly': return <g stroke="#6d7fa0" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M0 0C-10-22-34-22-30-4-28 6-12 6 0 0ZM0 0C10-22 34-22 30-4 28 6 12 6 0 0Z" fill="#b9d7f0" />
      <path d="M0 2C-8 18-26 22-24 10-22 2-10 2 0 2ZM0 2C8 18 26 22 24 10 22 2 10 2 0 2Z" fill="#d8c9ef" />
      <ellipse rx="3" ry="12" fill="#6e5147" stroke="none" /><path d="M-1-11q-4-8-9-9M1-11q4-8 9-9" fill="none" strokeLinecap="round" />
    </g>
    case 'moon': return <g stroke="#b99044" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6-24C-16-22-28-2-20 14-12 28 8 30 20 20 2 22-12 8-10-6-8-16-2-22 6-24Z" fill="#f6dc8c" />
      <path d="M-13 2q3 4 7 1" fill="none" /><circle cx="-10" cy="10" r="3" fill="#f2b8a8" stroke="none" />
      <path d="M16-14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#fff6c9" strokeWidth="1.2" />
    </g>
    case 'rainbow': return <g fill="none" strokeLinecap="round">
      {RAINBOW.slice(0, 4).map((color, ring) => <path key={color} d={`M${-24 + ring * 5} 8A${24 - ring * 5} ${24 - ring * 5} 0 0 1 ${24 - ring * 5} 8`} stroke={color} strokeWidth="5" />)}
      {[-1, 1].map((side) => <g key={side} fill="#fffdf8" stroke="#bdb3a6" strokeWidth="2"><circle cx={side * 22} cy="12" r="7" /><circle cx={side * 14} cy="14" r="6" /><circle cx={side * 28} cy="15" r="5" /></g>)}
    </g>
    case 'strawberry': return <g stroke="#a73f4a" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M0 26C-24 14-26-8-15-13-7-16 7-16 15-13 26-8 24 14 0 26Z" fill="#e8606a" />
      <Seeds spots={[[-10, -4], [4, -6], [13, 2], [-4, 6], [-14, 8], [6, 12], [0, 19]]} size={2} />
      <path d="M-15-13C-12-22-2-20 0-16 2-20 12-22 15-13 6-8-6-8-15-13Z" fill="#7fb069" stroke="#4f7a43" />
      <path d="M0-17q1-8 5-11" fill="none" stroke="#4f7a43" strokeWidth="3" strokeLinecap="round" />
    </g>
    case 'shell': return <g stroke="#c27c6a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M0 20-24 0C-28-14-18-24-12-20-8-26 0-26 0-22 0-26 8-26 12-20 18-24 28-14 24 0Z" fill="#f7c9b8" />
      <path d="M0 20-12-19M0 20 0-22M0 20 12-19M0 20-22-6M0 20 22-6" fill="none" strokeWidth="2" />
      <path d="M-8 20h16l-3 7h-10Z" fill="#f0b29e" />
    </g>
    case 'snowflake': return <g stroke="#7fb3d6" strokeWidth="4" strokeLinecap="round" fill="none">
      {[0, 60, 120, 180, 240, 300].map((angle) => <path key={angle} d="M0 0V-24M0-14l-7-6M0-14l7-6" transform={`rotate(${angle})`} />)}
      <circle r="5" fill="#e4f3fb" strokeWidth="3" />
    </g>
    case 'ladybug': return <g stroke="#8a3a3a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-4-26q-4-8-10-8M4-26q4-8 10-8" fill="none" stroke="#3f3540" />
      <circle cy="-18" r="10" fill="#3f3540" stroke="#2a2330" /><circle cx="-4" cy="-21" r="2" fill="#fff" stroke="none" /><circle cx="4" cy="-21" r="2" fill="#fff" stroke="none" />
      <circle cy="2" r="20" fill="#e45b5b" />
      <path d="M0-18V22" fill="none" />
      <g fill="#3f3540" stroke="none"><circle cx="-10" cy="-4" r="4" /><circle cx="10" cy="-4" r="4" /><circle cx="-9" cy="11" r="3.5" /><circle cx="9" cy="11" r="3.5" /></g>
    </g>
  }
}

// Something being carried by a finger: a clip (by its number) or the hat, glasses or headband, and whether letting go
// there would take it off.
export interface Lifted { item: number | WearSlot; x: number; y: number; away: boolean }

function Clips({ look, offsets, lifted }: { look: Look; offsets?: HairOffsets; lifted?: Lifted }) {
  return <g className="clips">{look.clips.map((clip: Clip, index) => {
    const held = lifted?.item === index ? lifted : null
    const spot = held ?? clipPosition(look, clip, offsets)
    return <g key={index} data-clip={clip.kind} className={held ? `clip lifted${held.away ? ' away' : ''}` : 'clip'} transform={`translate(${Math.round(spot.x * 10) / 10} ${Math.round(spot.y * 10) / 10}) rotate(${clipTilt(spot)})`}>
      <ClipArt kind={clip.kind} />
    </g>
  })}</g>
}

const round1 = (value: number) => Math.round(value * 10) / 10
// Glasses pushed this far up from the eyes sit on the hair instead of under it.
const PUSHED_UP = 24

// Where each piece of art is drawn around: the hat around its brim at 0,0, the glasses on the eyes, the halo at
// HALO_SPOT, and the other headbands across the top of the head.
function artSpot(look: Look, slot: WearSlot): Point {
  if (slot === 'hat') return { x: 0, y: 0 }
  if (slot === 'headband' && look.headband === 'halo') return HALO_SPOT
  return usualSpot(look, slot)
}

// Something worn, moved to wherever it has been put or is being carried.
function Worn({ look, slot, lifted, children }: { look: Look; slot: WearSlot; lifted?: Lifted; children: ReactNode }) {
  const held = lifted?.item === slot ? lifted : null
  const spot = held ?? wornSpot(look, slot)
  const art = artSpot(look, slot)
  const x = round1(spot.x - art.x)
  const y = round1(spot.y - art.y)
  return <g {...{ [`data-${slot}`]: look[slot] }} className={held ? `worn lifted${held.away ? ' away' : ''}` : 'worn'} pointerEvents="none"
    transform={x || y ? `translate(${x} ${y})` : undefined}>{children}</g>
}

function onHair(look: Look, lifted?: Lifted): boolean {
  return lifted?.item === 'glasses' || wornSpot(look, 'glasses').y < usualSpot(look, 'glasses').y - PUSHED_UP
}

// Glasses sit on the face, under any hair that falls over it.
export function FaceWear({ look, lifted }: { look: Look; lifted?: Lifted }) {
  if (look.glasses === 'none' || onHair(look, lifted)) return null
  return <Worn look={look} slot="glasses"><GlassesArt glasses={look.glasses} /></Worn>
}

// The headband, the hat and the clips go on over the hair, and so do glasses pushed up onto it or being carried.
export function HairWear({ look, offsets, lifted }: { look: Look; offsets?: HairOffsets; lifted?: Lifted }) {
  return <>
    {look.headband !== 'none' && <Worn look={look} slot="headband" lifted={lifted}><HeadbandArt headband={look.headband} /></Worn>}
    {look.glasses !== 'none' && onHair(look, lifted) && lifted?.item !== 'glasses'
      && <Worn look={look} slot="glasses"><GlassesArt glasses={look.glasses} /></Worn>}
    {look.hat !== 'none' && <Worn look={look} slot="hat" lifted={lifted}><HatArt hat={look.hat} /></Worn>}
    {look.clips.length > 0 && <Clips look={look} offsets={offsets} lifted={lifted} />}
    {look.glasses !== 'none' && lifted?.item === 'glasses' && <Worn look={look} slot="glasses" lifted={lifted}><GlassesArt glasses={look.glasses} /></Worn>}
  </>
}

const ICON_VIEWS: Record<WearSlot | 'clip', string> = { hat: '-100 -108 200 124', glasses: '152 228 196 74', headband: '152 104 196 150', clip: '-30 -30 60 60' }

// A small picture of something to wear, for its button.
export function WearableIcon({ slot, item }: { slot: WearSlot | 'clip'; item: string }) {
  return <svg className="wearable-icon" viewBox={ICON_VIEWS[slot]} aria-hidden="true">
    {slot === 'hat' && <HatArt hat={item as Hat} />}
    {slot === 'glasses' && <><circle cx="198" cy="265" r="5" fill="#503e33" /><circle cx="302" cy="265" r="5" fill="#503e33" /><GlassesArt glasses={item as Glasses} /></>}
    {slot === 'headband' && <><path d="M168 246c-1-60 40-74 81-74s84 13 84 73" fill="#dfb38b" stroke="#89664e" strokeWidth="3.5" /><HeadbandArt headband={item as Headband} /></>}
    {slot === 'clip' && <ClipArt kind={item as ClipKind} />}
  </svg>
}
