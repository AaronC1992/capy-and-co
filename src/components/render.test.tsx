import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'
import { Capybara } from './Capybara'
import { createLook, STRAND_COUNT } from '../game/model'

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
    look.hair[5] = { ...look.hair[5], wetness: 1, soapy: true }
    const wet = renderToStaticMarkup(<Capybara look={look} />)
    expect(wet).toContain('data-water-drop="5"')
    look.hair[5].wetness = 0
    const dry = renderToStaticMarkup(<Capybara look={look} />)
    expect(dry).not.toContain('data-water-drop="5"')
    expect(dry).toContain('data-soap-strand="5"')
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
})
