import { useId, useRef } from 'react'
import type { Dispatch, KeyboardEvent } from 'react'
import { COLORS, COLOR_NAMES, DYE_MODES, GLITTER, HEX_COLOR, RAINBOW } from '../game/model'
import type { ClipKind, DyeMode, Look, SalonAction, Tool } from '../game/model'
import { RAINBOW_COLORS } from '../game/dye'
import { DressUpPanel } from './DressUpPanel'
import { Icon } from './Icon'

const TOOLS: { id: Tool; label: string; note: string; tint: string }[] = [
  { id: 'brush', label: 'Brush', note: 'Style it. Keep it.', tint: 'mint' },
  { id: 'comb', label: 'Comb', note: 'Gel-smooth control', tint: 'mint' },
  { id: 'snip', label: 'Snip', note: 'A fresh little trim', tint: 'pink' },
  { id: 'grow', label: 'Grow', note: 'Long hair, don’t care', tint: 'rose' },
  { id: 'curl', label: 'Curl', note: 'Hold for bouncy curls', tint: 'yellow' },
  { id: 'soap', label: 'Soap', note: 'Fluffy bubble magic', tint: 'pink' },
  { id: 'wash', label: 'Wash', note: 'Spray it clean', tint: 'blue' },
  { id: 'blower', label: 'Blow-dry', note: 'Whoosh! Hair goes flying', tint: 'blue' },
  { id: 'color', label: 'Color', note: 'Find your happy hue', tint: 'lavender' },
]
const TABS = ['Style', 'Color', 'Dress up'] as const
export type Tab = typeof TABS[number]
const DYE_LABELS: Record<DyeMode, string> = { whole: 'All over', tips: 'Dipped tips', fade: 'Fade' }

// A little lock of hair showing where the color goes.
function DyePreview({ mode, color }: { mode: DyeMode; color: string }) {
  const id = useId().replace(/:/g, '')
  const root = mode === 'whole' ? color : '#c9a888'
  return <svg className="dye-preview" viewBox="0 0 24 34" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {mode === 'fade' ? <><stop offset=".15" stopColor={root} /><stop offset=".85" stopColor={color} /></>
        : <><stop offset=".5" stopColor={root} /><stop offset=".5" stopColor={color} /></>}
    </linearGradient></defs>
    <path d="M12 2c-6 6 5 10-1 17s4 9 0 13" fill="none" stroke="#6a4b3a" strokeOpacity=".45" strokeWidth="6.5" strokeLinecap="round" />
    <path d="M12 2c-6 6 5 10-1 17s4 9 0 13" fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" />
  </svg>
}

function ColorButton({ label, background, selected, className = '', onClick }: { label: string; background: string; selected: boolean; className?: string; onClick: () => void }) {
  return <button aria-label={label} aria-pressed={selected} className={`color-button ${selected ? 'selected' : ''}`} onClick={onClick}>
    <span className={`swatch ${className}`} style={{ background }}>{selected && <Icon name="check" size={21} />}</span><span>{label}</span>
  </button>
}

interface Props {
  tab: Tab
  onTab: (tab: Tab) => void
  tool: Tool
  onTool: (tool: Tool) => void
  color: string
  onColor: (color: string) => void
  dye: DyeMode
  onDye: (dye: DyeMode) => void
  look: Look
  name: string
  clip: ClipKind
  onClip: (clip: ClipKind) => void
  onWear: () => void
  dispatch: Dispatch<SalonAction>
  onPhoto: () => void
}

export function Toolbox({ tab, onTab, tool, onTool, color, onColor, dye, onDye, look, name, clip, onClip, onWear, dispatch, onPhoto }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const plain = HEX_COLOR.test(color)
  function chooseTab(next: Tab) {
    onTab(next)
    if (next === 'Color') onTool('color')
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return
    event.preventDefault()
    chooseTab(TABS[next])
    tabsRef.current?.querySelectorAll('button')[next].focus()
  }
  return <aside className="toolbox" aria-label="Styling tools">
    <div className="tool-tabs" role="tablist" aria-label="Tool categories" ref={tabsRef}>
      {TABS.map((item, index) => <button key={item} role="tab" id={`tab-${index}`} aria-controls={`panel-${index}`} aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onKeyDown={(event) => tabKey(event, index)} onClick={() => chooseTab(item)}>{item}</button>)}
    </div>
    <div className="tool-content" role="tabpanel" id={`panel-${TABS.indexOf(tab)}`} aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
      {tab === 'Style' && <div className="tool-grid styling-tool-grid">{TOOLS.map((item) =>
        <button key={item.id} className={`tool-button ${item.tint} ${tool === item.id ? 'selected' : ''}`} aria-label={item.label} aria-pressed={tool === item.id} onClick={() => { onTool(item.id); if (item.id === 'color') onTab('Color') }}>
          <span className="tool-illustration"><Icon name={item.id} size={38} /></span><span className="tool-label">{item.label}</span><span className="tool-note">{item.note}</span>
          {tool === item.id && <span className="selected-dot"><Icon name="check" size={11} /></span>}
        </button>,
      )}</div>}
      {tab === 'Color' && <div className="color-panel">
        <h3>A rainbow of possibilities</h3>
        <p>Pick a color, then paint a little or a lot!</p>
        <div className="dye-modes" role="group" aria-label="Where the color goes">{DYE_MODES.map((mode) =>
          <button key={mode} aria-pressed={plain && dye === mode} disabled={!plain} className={`dye-mode ${plain && dye === mode ? 'selected' : ''}`} onClick={() => { onDye(mode); onTool('color') }}>
            <DyePreview mode={mode} color={plain ? color : COLORS[1]} /><span>{DYE_LABELS[mode]}</span>
          </button>,
        )}</div>
        <div className="color-grid">
          {COLORS.map((value, index) => <ColorButton key={value} label={COLOR_NAMES[index]} background={value} selected={color === value} onClick={() => { onColor(value); onTool('color') }} />)}
          <ColorButton label="Rainbow" background={`linear-gradient(160deg, ${RAINBOW_COLORS.join(', ')})`} selected={color === RAINBOW} onClick={() => { onColor(RAINBOW); onTool('color') }} />
          <ColorButton label="Glitter" className="glitter-swatch" background="radial-gradient(circle at 30% 30%, #fff 0 2px, transparent 3px), radial-gradient(circle at 68% 58%, #fff 0 2px, transparent 3px), radial-gradient(circle at 40% 75%, #fffbe8 0 1.5px, transparent 2.5px), linear-gradient(135deg, #f6dc8c, #e9b8d8 55%, #b9d7f0)" selected={color === GLITTER} onClick={() => { onColor(GLITTER); onTool('color') }} />
        </div>
        <div className="little-note"><Icon name="heart" size={17} /> {plain ? 'Every lock can be a different color.' : color === RAINBOW ? 'Every color at once, from roots to tips!' : 'Glitter sparkles on top of any color.'}</div>
      </div>}
      {tab === 'Dress up' && <DressUpPanel look={look} name={name} clip={clip} onClip={onClip} onWear={onWear} dispatch={dispatch} />}
    </div>
    <div className="picture-section"><button className="primary-button photo-button" onClick={onPhoto}><Icon name="camera" size={21} /> Picture perfect! <Icon name="arrow" size={19} /></button></div>
  </aside>
}
