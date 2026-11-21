import { useId } from 'react'
import type { Ref, SVGProps } from 'react'
import { CHARACTERS } from '../game/model'
import type { Accessory, Look } from '../game/model'
import { strandPath, strandPoints } from '../game/hair'
import type { HairOffsets, Point } from '../game/hair'
import { headTopY, HEAD_TOP_PATH, SCALP_CAP_PATH, SCALP_SHEEN_PATHS, scalpTints } from '../game/hairline'
import { Icon } from './Icon'

function Decoration({ accessory }: { accessory: Accessory }) {
  switch (accessory) {
    case 'none': return null
    case 'bow': return <g transform="translate(300 172) rotate(18)" stroke="#b7657c" strokeWidth="3"><path fill="#e99eb5" d="M-6-3C-58-49-59 42-6 11M6-3C58-49 59 42 6 11" /><path fill="#edb3c4" d="m-3 8-15 33 16-6 10 7 7-34" /><rect x="-10" y="-9" width="20" height="26" rx="8" fill="#f6c6d1" /></g>
    case 'flower': return <g transform="translate(312 186)" stroke="#ce947c" strokeWidth="2">{[0, 60, 120, 180, 240, 300].map((angle) => <ellipse key={angle} cx="0" cy="-18" rx="13" ry="19" fill="#fff1db" transform={`rotate(${angle})`} />)}<circle r="14" fill="#e6bc61" /><circle cx="-4" cy="-4" r="4" fill="#f7d986" /></g>
    case 'crown': return <g transform="translate(211 102) rotate(-7)" stroke="#b99044" strokeWidth="3"><path fill="#efd080" d="m0 0 21 15L40-13l20 28L81 0l-8 44H8Z" /><path d="M8 33h65" /><circle cx="41" cy="21" r="5" fill="#e39a97" />{[0, 40, 81].map((x) => <circle key={x} cx={x} cy={x === 40 ? -13 : 0} r="5" fill="#f9e6ae" />)}</g>
    case 'cherries': return <g transform="translate(303 165)" stroke="#776e44" strokeWidth="3"><path d="M-13 33 0-2l17 30" fill="none" /><path d="M0-2C21-23 34 0 0-2" fill="#9eb78b" /><circle cx="-14" cy="34" r="16" fill="#d7767b" /><circle cx="18" cy="30" r="16" fill="#e48d8b" /><path d="m-21 27 4-3m28 2 4-3" stroke="#ffc7b4" strokeWidth="4" /></g>
    case 'star': return <g transform="translate(303 178) rotate(15)" stroke="#b79753" strokeWidth="3"><path fill="#f2d480" d="m0-28 9 19 22 3-16 16 3 22L0 21l-19 11 4-22-16-16 22-3Z" /><path d="m-8 37-7 16m23-16 7 16" /></g>
  }
}

interface CapybaraProps extends SVGProps<SVGSVGElement> {
  look: Look
  svgRef?: Ref<SVGSVGElement>
  happy?: boolean
  portrait?: boolean
  hairOffsets?: HairOffsets
  airflowPoint?: Point
}

function SoapFoam({ look, offsets }: { look: Look; offsets?: HairOffsets }) {
  return <g className="soap-foam" pointerEvents="none" aria-hidden="true">
    {look.hair.map((strand, index) => {
      if (!strand.soapy) return null
      const points = strandPoints(strand, index, offsets?.[index])
      const tip = points[24]
      return <g key={index} data-soap-strand={index}>
        <path d={strandPath(strand, index, offsets?.[index])} fill="none" stroke="#f2fffb" strokeWidth="9" strokeLinecap="round" opacity=".8" />
        {[4, 10, 16, 22].map((step, bubble) => {
          const point = points[step]
          const x = point.x + (bubble % 2 ? 3 : -3)
          const radius = 3.5 + (index + bubble) % 4 * 0.6
          return <g key={step}>
            <circle cx={x} cy={point.y} r={radius} fill={bubble % 3 ? '#fafffc' : '#e4f5f6'} fillOpacity=".94" stroke="#b8d9da" strokeWidth=".65" />
            <path d={`M${x - radius * 0.48} ${point.y - radius * 0.15}q0 ${-radius * 0.48} ${radius * 0.48} ${-radius * 0.48}`} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        })}
        <circle cx={tip.x + (index % 2 ? 7 : -7)} cy={tip.y - 6} r="2.5" fill="#effcff" fillOpacity=".8" stroke="#b8d9da" strokeWidth=".65" />
      </g>
    })}
  </g>
}

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
  return <g className="scalp-cap" data-testid="scalp-cap" pointerEvents="none" aria-hidden="true">
    <defs>
      {gradient('scalp', (tint) => ({ color: tint.color, opacity: 1 }))}
      {wet && gradient('scalp-wet', (tint) => ({ color: '#35546a', opacity: tint.wetness * 0.28 }))}
      {soapy.length > 0 && gradient('scalp-soap', (tint) => ({ color: '#f2fffb', opacity: tint.soap * 0.8 }))}
    </defs>
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
}

export function Capybara({ look, svgRef, happy = false, portrait = false, hairOffsets, airflowPoint, ...props }: CapybaraProps) {
  const id = useId().replace(/:/g, '')
  const friend = CHARACTERS.find((c) => c.id === look.character)!
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={portrait ? '80 55 340 355' : '0 0 500 520'} ref={svgRef} {...props}>
    <defs>
      <linearGradient id={`${id}-fur`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={friend.light} /><stop offset="1" stopColor={friend.fur} /></linearGradient>
      <linearGradient id={`${id}-cape`} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#e8acaa" /><stop offset="1" stopColor="#d99394" /></linearGradient>
      <radialGradient id={`${id}-cheek`}><stop stopColor="#d88879" stopOpacity=".65" /><stop offset="1" stopColor="#d88879" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="250" cy="483" rx="126" ry="15" fill="#6c6850" opacity=".1" />
    <path d="M179 424v52m142-52v52" stroke="#aa8770" strokeWidth="13" strokeLinecap="round" />
    <rect x="149" y="305" width="202" height="140" rx="42" fill="#9bac95" stroke="#82977d" strokeWidth="3" />
    <rect x="129" y="373" width="242" height="40" rx="16" fill="#b9c6a9" stroke="#82977d" strokeWidth="3" />
    <path d="M172 433c-19 12-22 34-4 36h35l14-33m69 0 14 33h35c18-2 15-24-4-36" fill={friend.fur} stroke="#88694e" strokeWidth="3" />
    <path d="M177 458v10m10-10v10m126-10v10m10-10v10" stroke="#88694e" strokeWidth="3" strokeLinecap="round" />
    <path d="M185 327c-26 19-44 62-45 110 58 27 159 26 220 0-3-48-22-95-45-110Z" fill={`url(#${id}-cape)`} stroke="#bc8081" strokeWidth="3" />
    <path d="m196 351-19 72m126-72 18 72" fill="none" stroke="#f2c6bd" strokeWidth="3" opacity=".65" />
    <path d="M210 352q40 25 81 0" fill="none" stroke="#fff4df" strokeWidth="15" />
    <g fill="none" stroke="#f9ddd1" strokeWidth="2.5" strokeLinecap="round"><path d="M234 402c-14-10-20 6 16 26 36-20 30-36 16-26l-16 12Z" /><path d="m213 395 4 4m68-4-4 4m-31-14v5" /></g>
    <path d="M184 227c-45-49-55 25-21 32m150-32c45-49 55 25 21 32" fill={friend.fur} stroke="#89664e" strokeWidth="3.5" />
    <path d="M170 239q-16-21-14 2m171-2q16-21 14 2" fill="none" stroke="#b47b69" strokeWidth="9" strokeLinecap="round" />
    <path d={`${HEAD_TOP_PATH}l12 53c8 49-25 69-95 70-69-1-103-21-95-70Z`} fill={`url(#${id}-fur)`} stroke="#89664e" strokeWidth="3.5" />
    <path d="M181 233c-4-23 9-40 27-47" fill="none" stroke="#f6d5a6" strokeWidth="5" strokeLinecap="round" opacity=".5" />
    <ellipse cx="183" cy="293" rx="24" ry="18" fill={`url(#${id}-cheek)`} />
    <ellipse cx="317" cy="293" rx="24" ry="18" fill={`url(#${id}-cheek)`} />
    <g className={happy ? 'eyes happy-eyes' : 'eyes'} stroke="#503e33" strokeWidth="5" strokeLinecap="round">
      {happy ? <><path d="M188 268q10-10 20 0M292 268q10-10 20 0" fill="none" /></> : <><ellipse cx="198" cy="265" rx="5" ry="7" fill="#503e33" /><ellipse cx="302" cy="265" rx="5" ry="7" fill="#503e33" /><path d="m200 262 .1-.1m100 .1 .1-.1" stroke="#fff5e4" strokeWidth="3" /></>}
    </g>
    <path d="m189 247 12-2m99 0 12 2" stroke="#89664e" strokeWidth="3" strokeLinecap="round" />
    <path d="M213 280c-38 0-48 18-36 43 15 29 127 29 143 0 12-25 2-43-35-43Z" fill={friend.light} stroke="#a17b58" strokeWidth="2.5" />
    <ellipse cx="234" cy="293" rx="7" ry="5" fill="#75513e" transform="rotate(-12 234 293)" />
    <ellipse cx="266" cy="293" rx="7" ry="5" fill="#75513e" transform="rotate(12 266 293)" />
    <path d="M250 307v12m-17-2q17 17 34 0" fill="none" stroke="#805b45" strokeWidth="3.5" strokeLinecap="round" />
    <g fill="#ac805e" opacity=".7"><circle cx="191" cy="305" r="2" /><circle cx="199" cy="316" r="2" /><circle cx="309" cy="305" r="2" /><circle cx="301" cy="316" r="2" /></g>
    <ScalpCap look={look} id={id} />
    <g className="hair" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {look.hair.map((strand, index) => {
        const path = strandPath(strand, index, hairOffsets?.[index])
        const wetness = strand.wetness ?? 0
        const tip = wetness > 0 && index % 5 === 0 ? strandPoints(strand, index, hairOffsets?.[index])[24] : null
        return <g key={index} data-strand={index} data-wetness={wetness}>
          <path d={path} stroke="#6a4b3a" strokeOpacity=".48" strokeWidth="6.4" />
          <path d={path} stroke={strand.color} strokeWidth="5.2" />
          {wetness > 0 && <path d={path} stroke="#35546a" strokeOpacity={wetness * 0.28} strokeWidth="5.2" />}
          <path d={path} stroke="#fff8e9" strokeOpacity=".35" strokeWidth="1" transform="translate(-1 -.3)" />
          {tip && <path data-water-drop={index} d={`M${tip.x} ${tip.y + 2}q-7 9 0 10q7-1 0-10Z`} fill="#afdce9" fillOpacity={wetness} stroke="#79b6ce" strokeWidth=".8" strokeOpacity={wetness} />}
        </g>
      })}
    </g>
    <SoapFoam look={look} offsets={hairOffsets} />
    <Decoration accessory={look.accessory} />
    {airflowPoint && <g data-testid="airflow" transform={`translate(${airflowPoint.x} ${airflowPoint.y})`} pointerEvents="none" aria-hidden="true">
      <path className="air-stream" d="M-6-8Q-28-30-20-48M0-10V-50M6-8Q28-30 20-48" fill="none" stroke="#eafaff" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(-15 -2) rotate(-60 15 15)"><Icon name="blower" size={30} /></g>
    </g>}
    {happy && <g fill="#e4b361"><path d="m123 245 4 10 11 3-11 4-4 10-3-10-11-4 11-3Zm247-90 3 8 9 3-9 3-3 8-3-8-8-3 8-3Z" /></g>}
  </svg>
}
