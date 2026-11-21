import { useRef, useState } from 'react'
import type { Dispatch, KeyboardEvent } from 'react'
import { ACCESSORIES, COLORS, COLOR_NAMES } from '../game/model'
import type { Accessory, SalonAction, Tool } from '../game/model'
import { Icon } from './Icon'

const TOOLS: { id: Tool; label: string; note: string; tint: string }[] = [
  { id: 'brush', label: 'Brush', note: 'Style it. Keep it.', tint: 'mint' },
  { id: 'comb', label: 'Comb', note: 'Gel-smooth control', tint: 'mint' },
  { id: 'snip', label: 'Snip', note: 'A fresh little trim', tint: 'pink' },
  { id: 'grow', label: 'Grow', note: 'Long hair, don’t care', tint: 'rose' },
  { id: 'curl', label: 'Curl', note: 'A little extra bounce', tint: 'yellow' },
  { id: 'soap', label: 'Soap', note: 'Fluffy bubble magic', tint: 'pink' },
  { id: 'wash', label: 'Wash', note: 'Spray it clean', tint: 'blue' },
  { id: 'blower', label: 'Blow-dry', note: 'Whoosh! Hair goes flying', tint: 'blue' },
  { id: 'color', label: 'Color', note: 'Find your happy hue', tint: 'lavender' },
]
const TABS = ['Style', 'Color', 'Dress up'] as const
type Tab = typeof TABS[number]
const ACCESSORY_LABELS: Record<Accessory, string> = { none: 'No accessory', bow: 'Little bow', flower: 'Daisy day', crown: 'Royal capy', cherries: 'Cherry cute', star: 'Superstar' }

interface Props {
  tool: Tool
  onTool: (tool: Tool) => void
  color: string
  onColor: (color: string) => void
  accessory: Accessory
  dispatch: Dispatch<SalonAction>
  onPhoto: () => void
}

export function Toolbox({ tool, onTool, color, onColor, accessory, dispatch, onPhoto }: Props) {
  const [tab, setTab] = useState<Tab>('Style')
  const tabsRef = useRef<HTMLDivElement>(null)
  function chooseTab(next: Tab) {
    setTab(next)
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
    <div className="toolbox-heading"><span className="eyebrow">LITTLE TOOLS, BIG IDEAS</span><Icon name="sparkles" size={28} /></div>
    <h2>Let's make some magic.</h2>
    <p className="toolbox-description">A snip here. A splash of color there.<br />There’s no wrong way to play.</p>
    <div className="tool-tabs" role="tablist" aria-label="Tool categories" ref={tabsRef}>
      {TABS.map((item, index) => <button key={item} role="tab" id={`tab-${index}`} aria-controls={`panel-${index}`} aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onKeyDown={(event) => tabKey(event, index)} onClick={() => chooseTab(item)}>{item}</button>)}
    </div>
    <div className="tool-content" role="tabpanel" id={`panel-${TABS.indexOf(tab)}`} aria-labelledby={`tab-${TABS.indexOf(tab)}`}>
      {tab === 'Style' && <div className="tool-grid styling-tool-grid">{TOOLS.map((item) =>
        <button key={item.id} className={`tool-button ${item.tint} ${tool === item.id ? 'selected' : ''}`} aria-label={item.label} aria-pressed={tool === item.id} onClick={() => { onTool(item.id); if (item.id === 'color') setTab('Color') }}>
          <span className="tool-illustration"><Icon name={item.id} size={38} /></span><span className="tool-label">{item.label}</span><span className="tool-note">{item.note}</span>
          {tool === item.id && <span className="selected-dot"><Icon name="check" size={11} /></span>}
        </button>,
      )}</div>}
      {tab === 'Color' && <div className="color-panel">
        <h3>A rainbow of possibilities</h3>
        <p>Pick a color. Paint a little or a lot!</p>
        <div className="color-grid">{COLORS.map((value, index) => <button key={value} aria-label={COLOR_NAMES[index]} aria-pressed={color === value} className={`color-button ${color === value ? 'selected' : ''}`} onClick={() => { onColor(value); onTool('color') }}><span className="swatch" style={{ background: value }}>{color === value && <Icon name="check" size={21} />}</span><span>{COLOR_NAMES[index]}</span></button>)}</div>
        <div className="little-note"><Icon name="heart" size={17} /> Every lock can be a different color.</div>
      </div>}
      {tab === 'Dress up' && <div className="accessory-panel"><h3>The cherry on top</h3><p>Tap a little something to try it on.</p><div className="tool-grid accessory-grid">{ACCESSORIES.map((item) => <button key={item} className={`tool-button ${accessory === item ? 'selected' : ''}`} aria-pressed={accessory === item} onClick={() => dispatch({ type: 'accessory', accessory: item })}><Icon name={item} size={34} /><span className="tool-label">{ACCESSORY_LABELS[item]}</span></button>)}</div></div>}
    </div>
    <div className="picture-section"><p>Made something you love?</p><button className="primary-button photo-button" onClick={onPhoto}><Icon name="camera" size={21} /> Picture perfect! <Icon name="arrow" size={19} /></button><span>Save a happy little memory.</span></div>
  </aside>
}
