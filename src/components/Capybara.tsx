import { memo, useId } from 'react'
import type { Ref, SVGProps } from 'react'
import { CHARACTERS } from '../game/model'
import type { Look, Strand } from '../game/model'
import { mixColor } from '../game/color'
import { dyeStops } from '../game/dye'
import type { DyeStop } from '../game/dye'
import { drawStrand, strandPoints } from '../game/hair'
import type { HairOffsets, Point } from '../game/hair'
import { isBald } from '../game/hairLayout'
import type { HairShape } from '../game/hairLayout'
import { headTopY, SCALP_CAP_PATH, SCALP_SHEEN_PATHS, scalpTints } from '../game/hairline'
import { HEAD_PATH } from '../game/headShape'
import type { AirJet } from '../game/hairWind'
import { isReaction } from '../game/reactions'
import type { Reaction } from '../game/reactions'
import type { SprayJet } from '../game/hairSprayer'
import { FaceWear, HairWear } from './Accessories'
import type { LiftedClip } from './Accessories'
import { AirStream } from './AirStream'
import { OutfitBack, OutfitFront, Paws } from './Outfit'
import { SprayStream } from './SprayStream'

interface CapybaraProps extends SVGProps<SVGSVGElement> {
  look: Look
  svgRef?: Ref<SVGSVGElement>
  mood?: Mood
  portrait?: boolean
  hairOffsets?: HairOffsets
  airflow?: AirJet
  spray?: SprayJet
  // A clip being dragged to a new spot.
  liftedClip?: LiftedClip
  // Counts reactions, so poking the same spot again plays its reaction again.
  beat?: number
}

interface StrandProps {
  strand: Strand
  index: number
  offsets?: HairShape
}

// How the capybara feels about what's happening to its hair right now, or about being poked or tickled.
export type Mood = 'calm' | 'happy' | 'giggle' | 'squint' | 'shake' | 'breeze' | 'surprised' | Reaction

const WET_TINT = '#35546a'
const round1 = (value: number) => Math.round(value * 10) / 10

// Every strand is its own memoized piece: a frame only redraws the strands whose style or motion changed.
const SoapStrand = memo(function SoapStrand({ strand, index, offsets }: StrandProps) {
  const { line, stride, path } = drawStrand(strand, index, strandPoints(strand, index, offsets))
  const tip = line[line.length - 1]
  return <g data-soap-strand={index}>
    <path d={path} fill="none" stroke="#f2fffb" strokeWidth="9" strokeLinecap="round" opacity=".8" />
    {[4, 10, 16, 22].map((step, bubble) => {
      const point = line[step * stride]
      const x = point.x + (bubble % 2 ? 3 : -3)
      const radius = 3.5 + (index + bubble) % 4 * 0.6
      return <g key={step}>
        <circle cx={x} cy={point.y} r={radius} fill={bubble % 3 ? '#fafffc' : '#e4f5f6'} fillOpacity=".94" stroke="#b8d9da" strokeWidth=".65" />
        <path d={`M${x - radius * 0.48} ${point.y - radius * 0.15}q0 ${-radius * 0.48} ${radius * 0.48} ${-radius * 0.48}`} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    })}
    <circle cx={tip.x + (index % 2 ? 7 : -7)} cy={tip.y - 6} r="2.5" fill="#effcff" fillOpacity=".8" stroke="#b8d9da" strokeWidth=".65" />
  </g>
})

function SoapFoam({ look, offsets }: { look: Look; offsets?: HairOffsets }) {
  return <g className="soap-foam" pointerEvents="none" aria-hidden="true">
    {look.hair.map((strand, index) => strand.soapy ? <SoapStrand key={index} strand={strand} index={index} offsets={offsets?.[index]} /> : null)}
  </g>
}

// Dyed tips, fades and rainbows run along the lock, from its root toward wherever the hair reaches farthest.
function DyeGradient({ id, line, stops, wet }: { id: string; line: readonly Point[]; stops: DyeStop[]; wet: number }) {
  const root = line[0]
  let end = line[line.length - 1]
  if (Math.hypot(end.x - root.x, end.y - root.y) < 6) {
    for (const point of line) if (Math.hypot(point.x - root.x, point.y - root.y) > Math.hypot(end.x - root.x, end.y - root.y)) end = point
  }
  return <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={round1(root.x)} y1={round1(root.y)} x2={round1(end.x)} y2={round1(end.y + (end === root ? 1 : 0))}>
    {stops.map((stop, index) => <stop key={index} offset={stop.offset} stopColor={wet > 0 ? mixColor(stop.color, WET_TINT, wet * 0.4) : stop.color} />)}
  </linearGradient>
}

const SPARKLE = 'M0-4.6 1.1-1.1 4.6 0 1.1 1.1 0 4.6-1.1 1.1-4.6 0-1.1-1.1Z'

const HairStrand = memo(function HairStrand({ strand, index, offsets, paintId }: StrandProps & { paintId: string }) {
  const { line, path } = drawStrand(strand, index, strandPoints(strand, index, offsets))
  const wetness = strand.wetness ?? 0
  const tip = wetness > 0 && index % 4 === 0 ? line[line.length - 1] : null
  const stops = dyeStops(strand)
  const sparkles = strand.glitter ? [Math.floor(line.length * 0.42), Math.floor(line.length * 0.8)].map((at) => line[Math.min(line.length - 1, at)]) : []
  // Wet hair paints no extra strokes: the cool tint is mixed into the color and the gloss strengthens the highlight.
  return <g data-strand={index} data-wetness={wetness}>
    {stops && <DyeGradient id={paintId} line={line} stops={stops} wet={wetness} />}
    <path d={path} stroke="#6a4b3a" strokeOpacity=".48" strokeWidth="6.4" />
    <path d={path} stroke={stops ? `url(#${paintId})` : wetness > 0 ? mixColor(strand.color, WET_TINT, wetness * 0.4) : strand.color} strokeWidth="5.2" />
    <path d={path} stroke={wetness > 0 ? '#e9f8ff' : '#fff8e9'} strokeOpacity={Math.round((0.35 + wetness * 0.4) * 100) / 100} strokeWidth={Math.round((1 + wetness * 0.6) * 10) / 10} transform="translate(-1 -.3)" />
    {strand.glitter && <path data-glitter-dust={index} d={path} stroke="#fffbe8" strokeWidth="2.6" strokeDasharray=".1 7.5" strokeDashoffset={index % 5 * 1.5} />}
    {/* The twinkle animates the sparkle's own transform, so it is placed by a group around it instead of moved itself. */}
    {sparkles.map((point, sparkle) => <g key={sparkle} transform={`translate(${round1(point.x + (sparkle ? -2 : 2))} ${round1(point.y)})`}>
      <path data-glitter={index} className="glitter" style={{ animationDelay: `${-((index * 3 + sparkle * 5) % 11) * 0.17}s` }}
        d={SPARKLE} fill={sparkle ? '#fff6c9' : '#ffffff'} stroke="#e2b74f" strokeWidth=".7" strokeLinejoin="round" />
    </g>)}
    {tip && <g transform={`translate(${tip.x} ${tip.y})`}><path data-water-drop={index} className="water-drip" style={{ animationDelay: `${-(index % 7) * 0.31}s` }} d="M0 2q-7 9 0 10q7-1 0-10Z" fill="#afdce9" fillOpacity={wetness} stroke="#79b6ce" strokeWidth=".8" strokeOpacity={wetness} /></g>}
  </g>
})

function ScalpCap({ look, id }: { look: Look; id: string }) {
  const tints = scalpTints(look.hair)
  const first = tints[0].x
  const span = tints[tints.length - 1].x - first
  const gradient = (name: string, stop: (tint: (typeof tints)[number]) => { color: string; opacity: number }) =>
    <linearGradient id={`${id}-${name}`} gradientUnits="userSpaceOnUse" x1={first} y1="0" x2={first + span} y2="0">
      {tints.map((tint) => { const { color, opacity } = stop(tint); return <stop key={tint.x} offset={(tint.x - first) / span} stopColor={color} stopOpacity={opacity} /> })}
    </linearGradient>
  const wet = tints.some((tint) => tint.wetness > 0)
  const soapy = tints.filter((tint) => tint.soap >= 0.5)
  // Where the hair has been cut right down, the band lets the head show through instead of looking like hair.
  const bare = tints.some((tint) => tint.cover < 1)
  return <g className="scalp-cap" data-testid="scalp-cap" pointerEvents="none" aria-hidden="true">
    <defs>
      {gradient('scalp', (tint) => ({ color: tint.color, opacity: 1 }))}
      {wet && gradient('scalp-wet', (tint) => ({ color: WET_TINT, opacity: tint.wetness * 0.28 }))}
      {soapy.length > 0 && gradient('scalp-soap', (tint) => ({ color: '#f2fffb', opacity: tint.soap * 0.8 }))}
      {bare && <>
        {gradient('scalp-cover', (tint) => ({ color: '#fff', opacity: tint.cover }))}
        <mask id={`${id}-bare`} maskUnits="userSpaceOnUse" x="0" y="0" width="500" height="520">
          <rect width="500" height="520" fill={`url(#${id}-scalp-cover)`} />
        </mask>
      </>}
    </defs>
    <g mask={bare ? `url(#${id}-bare)` : undefined}>
      <path d={SCALP_CAP_PATH} fill={`url(#${id}-scalp)`} stroke="#6a4b3a" strokeOpacity=".4" strokeWidth="2.2" strokeLinejoin="round" />
      {wet && <path d={SCALP_CAP_PATH} fill={`url(#${id}-scalp-wet)`} />}
      <g fill="none" strokeLinecap="round">
        {SCALP_SHEEN_PATHS.map((path, index) => <path key={path} d={path} stroke={index === 1 ? '#fff8e9' : '#6a4b3a'} strokeOpacity={index === 1 ? 0.3 : 0.18} strokeWidth={index === 1 ? 1.2 : 1.6} />)}
      </g>
      {soapy.length > 0 && <>
        <path d={SCALP_CAP_PATH} fill={`url(#${id}-scalp-soap)`} />
        {soapy.map((tint, index) => {
          const y = headTopY(tint.x) + 9
          return <g key={tint.x} data-soap-scalp={index}>
            <circle cx={tint.x} cy={y} r="4.4" fill="#fafffc" fillOpacity=".94" stroke="#b8d9da" strokeWidth=".65" />
            <circle cx={tint.x + 6} cy={y + 8} r="3" fill="#e4f5f6" fillOpacity=".94" stroke="#b8d9da" strokeWidth=".65" />
          </g>
        })}
      </>}
    </g>
  </g>
}

const DROPS = [[128, 200, -40], [372, 194, 40], [106, 270, -70], [394, 264, 70], [92, 330, -100], [408, 324, 100]]

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'calm') return <g className="eyes eyes-open" stroke="#503e33" strokeWidth="5" strokeLinecap="round">
    <ellipse cx="198" cy="265" rx="5" ry="7" fill="#503e33" /><ellipse cx="302" cy="265" rx="5" ry="7" fill="#503e33" /><path d="m200 262 .1-.1m100 .1 .1-.1" stroke="#fff5e4" strokeWidth="3" />
  </g>
  if (mood === 'surprised') return <g className="eyes eyes-wide" stroke="#503e33" strokeWidth="3" strokeLinecap="round">
    <ellipse cx="198" cy="263" rx="7.5" ry="10" fill="#503e33" /><ellipse cx="302" cy="263" rx="7.5" ry="10" fill="#503e33" /><path d="m201 258 .1-.1m100 .1 .1-.1" stroke="#fff5e4" strokeWidth="4" />
  </g>
  if (mood === 'poked-left' || mood === 'poked-right') {
    // The poked eye shuts tight and the other one goes wide.
    const left = mood === 'poked-left'
    const open = left ? 302 : 198
    return <g className="eyes eyes-poked" stroke="#503e33" strokeLinecap="round" strokeLinejoin="round">
      <path d={left ? 'M190 258l14 7-14 7' : 'M310 258l-14 7 14 7'} fill="none" strokeWidth="5" />
      <ellipse cx={open} cy="263" rx="7.5" ry="10" fill="#503e33" strokeWidth="3" /><path d={`m${open + 3} 258 .1-.1`} stroke="#fff5e4" strokeWidth="4" />
    </g>
  }
  if (mood === 'squint' || mood === 'shake' || mood === 'sneeze') return <g className="eyes eyes-squint" fill="none" stroke="#503e33" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M190 258l14 7-14 7M310 258l-14 7 14 7" />
  </g>
  return <g className="eyes eyes-happy" fill="none" stroke="#503e33" strokeWidth="5" strokeLinecap="round"><path d="M188 268q10-10 20 0M292 268q10-10 20 0" /></g>
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'giggle' || mood === 'boop' || mood === 'ticklish') return <g className="mouth-giggle" stroke="#805b45" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M250 307v9" fill="none" /><path d="M233 316q17 24 34 0Z" fill="#8a5242" />
  </g>
  if (mood === 'surprised') return <g className="mouth-surprised" stroke="#805b45" strokeLinecap="round">
    <path d="M250 307v8" fill="none" strokeWidth="3.5" /><ellipse cx="250" cy="325" rx="6" ry="7.5" fill="#8a5242" strokeWidth="3" />
  </g>
  if (mood === 'sneeze') return <g className="mouth-sneeze" stroke="#805b45" strokeLinecap="round">
    <path d="M250 307v5" fill="none" strokeWidth="3.5" /><ellipse cx="250" cy="324" rx="11" ry="10" fill="#8a5242" strokeWidth="3" />
  </g>
  if (mood === 'poked-left' || mood === 'poked-right') return <path className="mouth-poked" d="M250 307v9m-14 6q3.5-4 7 0t7 0 7 0 7 0" fill="none" stroke="#805b45" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  return <path d="M250 307v12m-17-2q17 17 34 0" fill="none" stroke="#805b45" strokeWidth="3.5" strokeLinecap="round" />
}

const BUBBLE_WORDS: Record<Reaction, string> = { 'poked-left': 'Hey!', 'poked-right': 'Hey!', sneeze: 'Achoo!', boop: 'Boing!', ticklish: 'Hee hee!' }
const PUFFS = [[222, 340, 9], [250, 350, 11], [278, 340, 9], [204, 354, 6], [296, 354, 6]]

// What the capybara says and does when it is poked or tickled.
function ReactionArt({ reaction }: { reaction: Reaction }) {
  const words = BUBBLE_WORDS[reaction]
  const width = 30 + words.length * 13
  return <g className="reaction" data-reaction={reaction} pointerEvents="none" aria-hidden="true">
    {(reaction === 'poked-left' || reaction === 'poked-right') && <g className="poke-stars" fill="#fff3a8" stroke="#9a6a3c" strokeWidth="2" strokeLinejoin="round">
      {[[-40, -16, 1.8], [-38, 20, 1.2], [24, -34, 1.4]].map(([dx, dy, size]) => {
        const x = (reaction === 'poked-left' ? 198 : 302) + (reaction === 'poked-left' ? dx : -dx)
        return <path key={dx} d={`M${x} ${265 + dy - 9 * size}l${2.5 * size} ${6.5 * size} ${6.5 * size} ${2.5 * size}-${6.5 * size} ${2.5 * size}-${2.5 * size} ${6.5 * size}-${2.5 * size}-${6.5 * size}-${6.5 * size}-${2.5 * size} ${6.5 * size}-${2.5 * size}Z`} />
      })}
    </g>}
    {reaction === 'sneeze' && <g className="sneeze-puffs" fill="#fbfdff" stroke="#a9bccb" strokeWidth="2.5">
      {PUFFS.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}
    </g>}
    {reaction === 'boop' && <path className="boop-lines" d="M122 350q-10 24 0 48M106 360q-7 14 0 28M378 350q10 24 0 48M394 360q7 14 0 28" fill="none" stroke="#8a6448" strokeWidth="5" strokeLinecap="round" />}
    {reaction === 'ticklish' && <path className="tickle-lines" d="M126 336l-14-9M122 354h-17M126 372l-14 9M374 336l14-9M378 354h17M374 372l14 9" fill="none" stroke="#8a6448" strokeWidth="5" strokeLinecap="round" />}
    <g transform="translate(358 128)">
      <g className="reaction-bubble">
        <path d={`M14 0h${width - 28}a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H30l-18 22 4-22h-2A14 14 0 0 1 0 32V14A14 14 0 0 1 14 0Z`} fill="#fffdf6" stroke="#a17b58" strokeWidth="3" strokeLinejoin="round" />
        <text x={width / 2} y="31" textAnchor="middle" fontSize="21" fontWeight="700" fill="#6a4b3a">{words}</text>
      </g>
    </g>
  </g>
}

export const Capybara = memo(function Capybara({ look, svgRef, mood = 'calm', portrait = false, hairOffsets, airflow, spray, liftedClip, beat = 0, className, ...props }: CapybaraProps) {
  const id = useId().replace(/:/g, '')
  const friend = CHARACTERS.find((c) => c.id === look.character)!
  const glad = mood === 'happy' || mood === 'giggle' || mood === 'breeze' || mood === 'boop' || mood === 'ticklish'
  const reaction = isReaction(mood) ? mood : null
  // Body reactions take turns between two copies of their animation, so the same reaction can start over.
  const classes = mood === 'calm' ? className : [className, `mood-${mood}`, reaction && `beat-${beat % 2}`].filter(Boolean).join(' ')
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={portrait ? '80 55 340 355' : '0 0 500 520'} ref={svgRef} className={classes} {...props}>
    <defs>
      <linearGradient id={`${id}-fur`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={friend.light} /><stop offset="1" stopColor={friend.fur} /></linearGradient>
      <radialGradient id={`${id}-cheek`}><stop stopColor="#d88879" stopOpacity=".65" /><stop offset="1" stopColor="#d88879" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="250" cy="483" rx="126" ry="15" fill="#6c6850" opacity=".1" />
    <path d="M179 424v52m142-52v52" stroke="#aa8770" strokeWidth="13" strokeLinecap="round" />
    <OutfitBack outfit={look.outfit} id={id} fur={friend.fur} light={friend.light} />
    <Paws fur={friend.fur} />
    <OutfitFront outfit={look.outfit} id={id} fur={friend.fur} light={friend.light} />
    <g className="ear ear-left"><path d="M184 227c-45-49-55 25-21 32" fill={friend.fur} stroke="#89664e" strokeWidth="3.5" /><path d="M170 239q-16-21-14 2" fill="none" stroke="#b47b69" strokeWidth="9" strokeLinecap="round" /></g>
    <g className="ear ear-right"><path d="M334 227c45-49 55 25 21 32" fill={friend.fur} stroke="#89664e" strokeWidth="3.5" /><path d="M341 239q16-21 14 2" fill="none" stroke="#b47b69" strokeWidth="9" strokeLinecap="round" /></g>
    <path d={HEAD_PATH} fill={`url(#${id}-fur)`} stroke="#89664e" strokeWidth="3.5" />
    <path d="M181 233c-4-23 9-40 27-47" fill="none" stroke="#f6d5a6" strokeWidth="5" strokeLinecap="round" opacity=".5" />
    <ellipse cx="183" cy="293" rx="24" ry="18" fill={`url(#${id}-cheek)`} />
    <ellipse cx="317" cy="293" rx="24" ry="18" fill={`url(#${id}-cheek)`} />
    <Eyes mood={mood} />
    <path d="m189 247 12-2m99 0 12 2" stroke="#89664e" strokeWidth="3" strokeLinecap="round" />
    <path d="M213 280c-38 0-48 18-36 43 15 29 127 29 143 0 12-25 2-43-35-43Z" fill={friend.light} stroke="#a17b58" strokeWidth="2.5" />
    <ellipse cx="234" cy="293" rx="7" ry="5" fill="#75513e" transform="rotate(-12 234 293)" />
    <ellipse cx="266" cy="293" rx="7" ry="5" fill="#75513e" transform="rotate(12 266 293)" />
    <Mouth mood={mood} />
    <g fill="#ac805e" opacity=".7"><circle cx="191" cy="305" r="2" /><circle cx="199" cy="316" r="2" /><circle cx="309" cy="305" r="2" /><circle cx="301" cy="316" r="2" /></g>
    <FaceWear look={look} />
    <ScalpCap look={look} id={id} />
    {/* Mitred joins paint far faster than round ones and look the same on hair this smooth. */}
    <g className="hair" fill="none" strokeLinecap="round" strokeLinejoin="miter">
      {look.hair.map((strand, index) => isBald(strand.length) ? null : <HairStrand key={index} strand={strand} index={index} offsets={hairOffsets?.[index]} paintId={`${id}-dye-${index}`} />)}
    </g>
    <SoapFoam look={look} offsets={hairOffsets} />
    <HairWear look={look} offsets={hairOffsets} lifted={liftedClip} />
    {airflow && <AirStream jet={airflow} id={id} />}
    {spray && <SprayStream jet={spray} id={id} />}
    {mood === 'shake' && <g className="shake-drops" fill="#cdeef8" stroke="#5f9fbd" strokeWidth="2">
      {DROPS.map(([x, y, turn]) => <path key={x} d="M0-13q10 13 0 20q-10-7 0-20Z" transform={`translate(${x} ${y}) rotate(${turn})`} />)}
    </g>}
    {/* A new poke (`beat`) draws the stars, puffs and speech bubble afresh, so they pop again. */}
    {reaction && <ReactionArt key={beat} reaction={reaction} />}
    {glad && <g className="joy-sparkles" fill="#e4b361"><path d="m123 245 4 10 11 3-11 4-4 10-3-10-11-4 11-3Zm247-90 3 8 9 3-9 3-3 8-3-8-8-3 8-3Z" /></g>}
  </svg>
})
