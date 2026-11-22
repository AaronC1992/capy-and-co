import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'
import { Capybara } from './Capybara'
import { DressUpPanel } from './DressUpPanel'
import { OUTFIT_LABELS, OutfitIcon } from './Outfit'
import { mixColor } from '../game/color'
import { ACCESSORIES, CHARACTERS, createLook, OUTFITS, STRAND_COUNT } from '../game/model'
import type { CharacterId, Outfit } from '../game/model'
import { MIN_LENGTH } from '../game/hairLayout'

afterEach(() => vi.unstubAllGlobals())
describe('application initialization and artwork', () => {
  it('renders a playable salon immediately without a network asset dependency', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Good hair.')
    expect(html).toContain('Interactive hair studio')
    expect(html).toContain('data-testid="styling-canvas"')
    expect(html).toContain('Do all the hair')
    expect(html).toContain('Style Mochi')
    expect(html).toContain('Style Biscuit')
    expect(html).toContain('Style Cocoa')
    expect(html).not.toMatch(/<img[^>]+https?:/)
  })
  it('renders each lock independently and includes the selected accessory', () => {
    const look = createLook('cocoa')
    const before = renderToStaticMarkup(<Capybara look={look} />)
    look.accessory = 'crown'
    const after = renderToStaticMarkup(<Capybara look={look} />)
    expect((after.match(/data-strand=/g) ?? []).length).toBe(STRAND_COUNT)
    expect(after).not.toBe(before)
    expect(after).toContain('#efd080')
  })
  it('renders persistent lather only on soaped locks, in the studio and in portraits', () => {
    const look = createLook('mochi')
    expect(renderToStaticMarkup(<Capybara look={look} />)).not.toContain('data-soap-strand=')
    look.hair[3] = { ...look.hair[3], bendX: 60, bendY: -40, soapy: true }
    look.hair[7].soapy = true
    for (const portrait of [false, true]) {
      const html = renderToStaticMarkup(<Capybara look={look} portrait={portrait} />)
      expect((html.match(/data-soap-strand=/g) ?? []).length).toBe(2)
      expect(html).toContain('data-soap-strand="3"')
      expect(html).toContain('data-soap-strand="7"')
      expect(html).not.toContain('data-soap-strand="2"')
    }
    look.hair[3].soapy = false
    expect(renderToStaticMarkup(<Capybara look={look} />)).not.toContain('data-soap-strand="3"')
  })
  it('shows damp hair and water drops, then removes them when dry without removing soap', () => {
    const look = createLook('mochi')
    look.hair[4] = { ...look.hair[4], wetness: 1, soapy: true }
    const wet = renderToStaticMarkup(<Capybara look={look} />)
    expect(wet).toContain('data-water-drop="4"')
    look.hair[4].wetness = 0
    const dry = renderToStaticMarkup(<Capybara look={look} />)
    expect(dry).not.toContain('data-water-drop="4"')
    expect(dry).toContain('data-soap-strand="4"')
  })
  it('paints a damp strand with no more strokes than a dry one, only cooler and shinier', () => {
    const look = createLook('mochi')
    const strand = (html: string) => /<g data-strand="1"[^>]*>(.*?)<\/g>/.exec(html)![1]
    const dry = strand(renderToStaticMarkup(<Capybara look={look} />))
    look.hair[1] = { ...look.hair[1], wetness: 1 }
    const wet = strand(renderToStaticMarkup(<Capybara look={look} />))
    expect(wet.match(/<path/g)).toHaveLength(dry.match(/<path/g)!.length)
    expect(wet).toContain(`stroke="${mixColor('#eb9c95', '#35546a', 0.4)}"`)
    expect(dry).not.toContain('#35546a')
  })
  it('draws a scalp cover under the strands that takes on the hair color, soap and dampness', () => {
    const look = createLook('mochi')
    const plain = renderToStaticMarkup(<Capybara look={look} />)
    expect(plain.indexOf('data-testid="scalp-cap"')).toBeGreaterThan(0)
    expect(plain.indexOf('data-testid="scalp-cap"')).toBeLessThan(plain.indexOf('class="hair"'))
    expect(plain).toContain('stop-color="#eb9c95"')
    expect(plain).not.toContain('data-soap-scalp=')
    expect(plain).not.toContain('scalp-wet')
    look.hair = look.hair.map((strand) => ({ ...strand, color: '#8cbfc4', wetness: 1, soapy: true }))
    const styled = renderToStaticMarkup(<Capybara look={look} />)
    expect(styled).toContain('stop-color="#8cbfc4"')
    expect(styled).not.toContain('stop-color="#eb9c95"')
    expect(styled).toContain('scalp-wet')
    expect((styled.match(/data-soap-scalp=/g) ?? []).length).toBe(11)
  })
  it('draws curly hair as a longer, winding stroke than straight hair, with no extra strokes to paint', () => {
    const look = createLook('mochi')
    const strand = (html: string) => /<g data-strand="1"[^>]*>(.*?)<\/g>/.exec(html)![1]
    const segments = (html: string) => (/ d="([^"]*)"/.exec(html)![1].match(/L/g) ?? []).length
    const straight = strand(renderToStaticMarkup(<Capybara look={look} />))
    look.hair[1] = { ...look.hair[1], curl: 1 }
    const curly = strand(renderToStaticMarkup(<Capybara look={look} />))
    expect(segments(curly)).toBeGreaterThanOrEqual(segments(straight) * 2)
    expect(curly.match(/<path/g)).toHaveLength(straight.match(/<path/g)!.length)
  })
  it('draws a shaved lock as nothing and lets the head show only where the hair has been cut away', () => {
    const look = createLook('mochi')
    const full = renderToStaticMarkup(<Capybara look={look} />)
    expect(full).not.toContain('<mask')
    look.hair[4] = { length: MIN_LENGTH, color: look.hair[4].color, curl: 0, flow: 0.3 }
    const patchy = renderToStaticMarkup(<Capybara look={look} />)
    expect(patchy).not.toContain('data-strand="4"')
    expect((patchy.match(/data-strand=/g) ?? []).length).toBe(STRAND_COUNT - 1)
    expect(patchy).toContain('<mask')
    look.hair = look.hair.map((strand) => ({ length: MIN_LENGTH, color: strand.color, curl: 0, flow: strand.flow }))
    for (const portrait of [false, true]) {
      const shaved = renderToStaticMarkup(<Capybara look={look} portrait={portrait} />)
      expect(shaved).not.toContain('data-strand=')
      expect(shaved).toContain('data-testid="scalp-cap"')
    }
  })
  it('draws the dryer stream only while it is blowing, turned to face the way it blows', () => {
    const look = createLook('mochi')
    expect(renderToStaticMarkup(<Capybara look={look} />)).not.toContain('data-testid="airflow"')
    const right = renderToStaticMarkup(<Capybara look={look} airflow={{ nozzle: { x: 120, y: 200 }, direction: { x: 1, y: 0 } }} />)
    expect(right).toContain('data-testid="airflow"')
    expect(right).toContain('translate(120 200) rotate(0)')
    expect(right).not.toContain('scale(1 -1)')
    const left = renderToStaticMarkup(<Capybara look={look} airflow={{ nozzle: { x: 380, y: 200 }, direction: { x: -1, y: 0 } }} />)
    expect(left).toContain('translate(380 200) rotate(180)')
    expect(left).toContain('scale(1 -1)')
  })
  it('draws the spray only while spraying, with the bottle turned to face the way it sprays', () => {
    const look = createLook('mochi')
    expect(renderToStaticMarkup(<Capybara look={look} />)).not.toContain('data-testid="spray"')
    const right = renderToStaticMarkup(<Capybara look={look} spray={{ nozzle: { x: 120, y: 200 }, target: { x: 220, y: 200 } }} />)
    expect(right).toContain('data-testid="spray"')
    expect(right).toContain('translate(120 200) rotate(0)')
    expect(right).not.toContain('scale(1 -1)')
    const left = renderToStaticMarkup(<Capybara look={look} spray={{ nozzle: { x: 380, y: 200 }, target: { x: 280, y: 200 } }} />)
    expect(left).toContain('translate(380 200) rotate(180)')
    expect(left).toContain('scale(1 -1)')
  })
})

// Walks what a component returns, without rendering it, to find the buttons a child could tap.
function buttonsIn(node: ReactNode): ReactElement<{ onClick: () => void }>[] {
  if (Array.isArray(node)) return node.flatMap(buttonsIn)
  if (!isValidElement<{ children?: ReactNode }>(node)) return []
  return node.type === 'button' ? [node as ReactElement<{ onClick: () => void }>] : buttonsIn(node.props.children)
}

describe('dress-up outfits', () => {
  const wearing = (outfit: Outfit, character: CharacterId = 'mochi') => renderToStaticMarkup(<Capybara look={{ ...createLook(character), outfit }} />)
  const idsIn = (html: string, attribute: RegExp) => [...html.matchAll(attribute)].map(([, id]) => id)

  it('draws every outfit differently on every friend, with the same hair and head over the top', () => {
    for (const { id } of CHARACTERS) {
      const drawn = OUTFITS.map((outfit) => wearing(outfit, id))
      expect(new Set(drawn).size).toBe(OUTFITS.length)
      expect(drawn.filter((html) => (html.match(/data-strand=/g) ?? []).length === STRAND_COUNT && html.includes('data-testid="scalp-cap"'))).toHaveLength(OUTFITS.length)
    }
  })
  it('defines every gradient an outfit paints with, once, so no cloth is left unpainted', () => {
    for (const outfit of OUTFITS) {
      const html = wearing(outfit)
      const defined = idsIn(html, / id="([^"]+)"/g)
      expect(new Set(defined).size, `${outfit} repeats an id`).toBe(defined.length)
      expect(idsIn(html, /url\(#([^)]+)\)/g).filter((id) => !defined.includes(id)), `${outfit} paints with a missing id`).toEqual([])
    }
  })
  it('keeps the capes of different capybaras on the page apart, as in the studio and the friend cards', () => {
    const html = renderToStaticMarkup(<><Capybara look={createLook('mochi')} /><Capybara look={createLook('cocoa')} portrait /></>)
    const defined = idsIn(html, / id="([^"]+)"/g)
    expect(defined.filter((id) => id.endsWith('-cape'))).toHaveLength(2)
    expect(new Set(defined).size).toBe(defined.length)
  })
  it('draws a small picture of every outfit for its button, each with its own name', () => {
    const icons = OUTFITS.map((outfit) => renderToStaticMarkup(<OutfitIcon outfit={outfit} />))
    expect(new Set(icons).size).toBe(OUTFITS.length)
    expect(icons.filter((html) => html.includes('class="outfit-icon"') && html.includes('aria-hidden="true"'))).toHaveLength(OUTFITS.length)
    const names = OUTFITS.map((outfit) => OUTFIT_LABELS[outfit].trim())
    expect(names.every(Boolean)).toBe(true)
    expect(new Set(names).size).toBe(OUTFITS.length)
  })
  it('lists every outfit by name above the accessories, marking only what is being worn', () => {
    const html = renderToStaticMarkup(<DressUpPanel outfit="wizard" accessory="bow" dispatch={() => {}} />)
    const tiles = [...html.matchAll(/aria-pressed="(true|false)"[^>]*>[\s\S]*?<span class="tool-label">([^<]+)<\/span>/g)].map(([, pressed, label]) => [label, pressed === 'true'] as const)
    expect(tiles).toHaveLength(OUTFITS.length + ACCESSORIES.length)
    expect(tiles.slice(0, OUTFITS.length)).toEqual(OUTFITS.map((outfit) => [OUTFIT_LABELS[outfit], outfit === 'wizard']))
    expect(tiles.filter(([, worn]) => worn).map(([label]) => label)).toEqual(['Wizard robe', 'Little bow'])
  })
  it('puts on the outfit that is tapped, and the accessory that is tapped, through the same game action', () => {
    const dispatch = vi.fn()
    const tiles = buttonsIn(DressUpPanel({ outfit: 'cozy', accessory: 'none', dispatch }))
    expect(tiles).toHaveLength(OUTFITS.length + ACCESSORIES.length)
    tiles.forEach((tile) => tile.props.onClick())
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      ...OUTFITS.map((outfit) => ({ type: 'outfit', outfit })),
      ...ACCESSORIES.map((accessory) => ({ type: 'accessory', accessory })),
    ])
  })
})
