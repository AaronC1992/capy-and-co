import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../App'
import { Capybara } from './Capybara'
import type { Mood } from './Capybara'
import { DressUpPanel } from './DressUpPanel'
import { CLIP_LABELS, GLASSES_LABELS, HAT_LABELS, HEADBAND_LABELS, WearableIcon } from './Accessories'
import { OUTFIT_LABELS, OutfitIcon } from './Outfit'
import { mixColor } from '../game/color'
import { CHARACTERS, CLIP_KINDS, createLook, GLASSES, HATS, HEADBANDS, MAX_CLIPS, OUTFITS, STRAND_COUNT } from '../game/model'
import type { CharacterId, Clip, Look, Outfit } from '../game/model'
import { clipAt, nextClipSpot } from '../game/accessories'
import { strandPoints } from '../game/hair'
import { MIN_LENGTH } from '../game/hairLayout'
import { BoothControls } from './PhotoBooth'
import { BACKGROUND_LABELS, FACE_LABELS, FRAME_LABELS, PhotoScene, STICKER_LABELS } from './PhotoScene'
import { Gallery } from './Gallery'
import { BACKGROUNDS, FACES, FRAMES, freshScene, MAX_STICKERS, nextStickerSpot, placeSticker, STICKER_KINDS } from '../game/photoBooth'
import type { Scene, Sticker } from '../game/photoBooth'
import { addPhoto } from '../game/storage'
import { REACTION_KINDS } from '../game/reactions'
import type { Reaction } from '../game/reactions'

afterEach(() => vi.unstubAllGlobals())
describe('application initialization and artwork', () => {
  it('renders a playable salon immediately without a network asset dependency', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Interactive hair studio')
    expect(html).toContain('data-testid="styling-canvas"')
    expect(html).toContain('Do all the hair')
    expect(html).toContain('Style Mochi')
    expect(html).toContain('Style Biscuit')
    expect(html).toContain('Style Cocoa')
    expect(html).not.toMatch(/<img[^>]+https?:/)
  })
  it('shows just the game: no welcome banner or footer, with help still one tap away in the header', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    const html = renderToStaticMarkup(<App />)
    for (const extra of ['Good hair.', 'Made for little hands', 'No scores. No rush.', 'Your very own little salon', 'happy place', "Let's make some magic."]) {
      expect(html).not.toContain(extra)
    }
    expect(html).not.toContain('<footer')
    const help = html.indexOf('aria-label="How to play"')
    expect(help).toBeGreaterThan(0)
    expect(help).toBeLessThan(html.indexOf('</header>'))
  })
  it('renders each lock independently with the hat, glasses, headband and clips being worn, glasses under the hair and the rest on top', () => {
    const look = createLook('cocoa')
    const before = renderToStaticMarkup(<Capybara look={look} />)
    expect(before).not.toMatch(/data-(hat|glasses|headband|clip)=/)
    const clips: Clip[] = [{ kind: 'heart', x: 290, y: 150, strand: 4, step: 12 }, { kind: 'butterfly', x: 250, y: 400 }]
    Object.assign(look, { hat: 'crown', glasses: 'round', headband: 'flowers', clips })
    const after = renderToStaticMarkup(<Capybara look={look} />)
    expect((after.match(/data-strand=/g) ?? []).length).toBe(STRAND_COUNT)
    expect(after).toContain('#efd080')
    const firstStrand = after.indexOf('data-strand=')
    expect(after.indexOf('data-glasses="round"')).toBeLessThan(firstStrand)
    for (const worn of ['data-headband="flowers"', 'data-hat="crown"', 'data-clip="heart"', 'data-clip="butterfly"']) expect(after.indexOf(worn)).toBeGreaterThan(firstStrand)
    const grip = strandPoints(look.hair[4], 4)[12]
    expect(after).toContain(`data-clip="heart" class="clip" transform="translate(${Math.round(grip.x * 10) / 10} ${Math.round(grip.y * 10) / 10})`)
    expect(after).toContain('data-clip="butterfly" class="clip" transform="translate(250 400)')
    const carried = renderToStaticMarkup(<Capybara look={look} liftedClip={{ index: 1, x: 480, y: 30, away: true }} />)
    expect(carried).toContain('data-clip="butterfly" class="clip lifted away" transform="translate(480 30)')
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
  it('paints dipped, faded and rainbow locks with their own gradient and twinkles glitter on top', () => {
    const look = createLook('mochi')
    const strand = (html: string, index: number) => new RegExp(`<g data-strand="${index}"[^>]*>(.*?)</g>`).exec(html)![1]
    const plain = renderToStaticMarkup(<Capybara look={look} />)
    expect(plain).not.toContain('-dye-')
    expect(plain).not.toContain('data-glitter')
    look.hair[1] = { ...look.hair[1], color: '#abcdef', tip: '#f0d878' }
    look.hair[2] = { ...look.hair[2], tip: '#9fcb8b', fade: true }
    look.hair[3] = { ...look.hair[3], rainbow: true, glitter: true }
    const html = renderToStaticMarkup(<Capybara look={look} />)
    for (const index of [1, 2, 3]) expect(strand(html, index)).toMatch(new RegExp(`<linearGradient id="([^"]+-dye-${index})"[\\s\\S]*stroke="url\\(#\\1\\)"`))
    expect(strand(html, 1)).toContain('stop-color="#f0d878"')
    expect(strand(html, 2)).toContain('stop-color="#9fcb8b"')
    expect((strand(html, 3).match(/stop-color=/g) ?? []).length).toBe(6)
    expect((html.match(/data-glitter=/g) ?? []).length).toBe(2)
    expect((html.match(/data-glitter-dust=/g) ?? []).length).toBe(1)
    expect(strand(html, 3)).toContain('data-glitter')
    // The twinkle animates the sparkle's transform, which would throw away a position set on the sparkle itself.
    expect(html.match(/<[^>]*class="glitter"[^>]*>/g)!.filter((sparkle) => sparkle.includes('transform='))).toEqual([])
    expect(html).toMatch(/<g transform="translate\([\d.]+ [\d.]+\)"><path data-glitter="3" class="glitter"/)
    expect(strand(html, 4)).not.toContain('url(#')
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
  it('shows how the capybara feels: blinking when calm, a new face for each mood, and water flying when it shakes off', () => {
    const look = createLook('mochi')
    const face = (mood?: Mood) => renderToStaticMarkup(<Capybara look={look} mood={mood} className="studio-capy" />)
    const calm = face()
    expect(calm).toContain('class="studio-capy"')
    expect(calm).toContain('eyes-open')
    expect(calm).not.toContain('joy-sparkles')
    const moods: Mood[] = ['happy', 'giggle', 'squint', 'shake', 'breeze', 'surprised']
    const faces = moods.map((mood) => face(mood))
    faces.forEach((markup, index) => {
      expect(markup).toContain(`class="studio-capy mood-${moods[index]}"`)
      expect(markup).not.toContain('eyes-open')
    })
    expect(new Set([calm, ...faces]).size).toBe(moods.length + 1)
    expect(face('giggle')).toContain('mouth-giggle')
    expect(face('surprised')).toContain('mouth-surprised')
    expect(face('squint')).not.toContain('shake-drops')
    expect(face('shake')).toContain('shake-drops')
    for (const mood of ['happy', 'giggle', 'breeze'] as const) expect(face(mood)).toContain('joy-sparkles')
    for (const side of ['ear-left', 'ear-right']) expect(calm).toContain(side)
  })
  it('flinches, sneezes, jiggles and giggles when poked or tickled, saying so in a speech bubble', () => {
    const look = createLook('mochi')
    const face = (mood: Mood, beat?: number) => renderToStaticMarkup(<Capybara look={look} mood={mood} beat={beat} className="studio-capy" />)
    const words: Record<Reaction, string> = { 'poked-left': 'Hey!', 'poked-right': 'Hey!', sneeze: 'Achoo!', boop: 'Boing!', ticklish: 'Hee hee!' }
    const faces = REACTION_KINDS.map((reaction) => face(reaction))
    faces.forEach((markup, index) => {
      const reaction = REACTION_KINDS[index]
      expect(markup).toContain(`class="studio-capy mood-${reaction} beat-0"`)
      expect(markup).toContain(`data-reaction="${reaction}"`)
      expect(markup).toContain(`>${words[reaction]}</text>`)
      expect(markup).not.toContain('eyes-open')
    })
    expect(new Set(faces).size).toBe(REACTION_KINDS.length)
    expect(face('sneeze')).toContain('sneeze-puffs')
    expect(face('poked-right')).toContain('poke-stars')
    // Poking again switches to the other copy of the animation so it starts over.
    expect(face('boop', 3)).toContain('class="studio-capy mood-boop beat-1"')
    expect(face('happy', 3)).toContain('class="studio-capy mood-happy"')
    expect(face('happy')).not.toContain('data-reaction')
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

  // 84 full drawings of the capybara take most of the default 5 seconds, so a busy machine needs longer.
  it('draws every outfit differently on every friend, with the same hair and head over the top', { timeout: 20_000 }, () => {
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
  it('floats the halo just above the hair, or above the hat, without leaving the picture', () => {
    const haloAt = (hat: Look['hat'], length: number) => {
      const look = { ...createLook('cocoa'), headband: 'halo' as const, hat }
      look.hair = look.hair.map((strand) => ({ ...strand, length }))
      return Number(renderToStaticMarkup(<Capybara look={look} />).match(/data-headband="halo"[^>]*><g transform="translate\(0 (-?[\d.]+)\)"/)?.[1])
    }
    expect(haloAt('none', MIN_LENGTH)).toBe(0)
    expect(haloAt('none', 1)).toBeLessThan(haloAt('none', MIN_LENGTH))
    expect(haloAt('party', MIN_LENGTH)).toBeLessThan(haloAt('tiara', MIN_LENGTH))
    expect(haloAt('tiara', MIN_LENGTH)).toBeLessThan(haloAt('none', MIN_LENGTH))
    expect(haloAt('chef', 1)).toBe(26 - 142)
  })

  it('lists every clip, hat, pair of glasses, headband and outfit by name with its own picture, marking only what is being worn', () => {
    const look = { ...createLook('mochi'), outfit: 'wizard' as const, hat: 'party' as const, headband: 'bunny' as const }
    const html = renderToStaticMarkup(<DressUpPanel look={look} name="Mochi" clip="daisy" onClip={() => {}} onWear={() => {}} dispatch={() => {}} />)
    const tiles = [...html.matchAll(/aria-pressed="(true|false)"[^>]*>[\s\S]*?<span class="tool-label">([^<]+)<\/span>/g)].map(([, pressed, label]) => [label, pressed === 'true'] as const)
    const wearables = [...HATS, ...GLASSES, ...HEADBANDS].filter((item) => item !== 'none')
    expect(tiles.map(([label]) => label)).toEqual([
      ...CLIP_KINDS.map((kind) => CLIP_LABELS[kind]),
      ...HATS.slice(1).map((hat) => HAT_LABELS[hat]), ...GLASSES.slice(1).map((glasses) => GLASSES_LABELS[glasses]), ...HEADBANDS.slice(1).map((headband) => HEADBAND_LABELS[headband]),
      ...OUTFITS.map((outfit) => OUTFIT_LABELS[outfit]),
    ])
    expect(new Set(tiles.map(([label]) => label)).size).toBe(CLIP_KINDS.length + wearables.length + OUTFITS.length)
    expect(tiles.filter(([, worn]) => worn).map(([label]) => label)).toEqual(['Daisy', 'Party hat', 'Bunny ears', 'Wizard robe'])
    const icons = [...CLIP_KINDS.map((kind) => renderToStaticMarkup(<WearableIcon slot="clip" item={kind} />)),
      ...HATS.slice(1).map((hat) => renderToStaticMarkup(<WearableIcon slot="hat" item={hat} />)),
      ...GLASSES.slice(1).map((glasses) => renderToStaticMarkup(<WearableIcon slot="glasses" item={glasses} />)),
      ...HEADBANDS.slice(1).map((headband) => renderToStaticMarkup(<WearableIcon slot="headband" item={headband} />))]
    expect(new Set(icons).size).toBe(icons.length)
  })
  it('puts on whatever is tapped, takes off what is already worn, and adds a tapped clip on a free spot until there are too many', () => {
    const dispatch = vi.fn()
    const onClip = vi.fn()
    const onWear = vi.fn()
    const look = { ...createLook('mochi'), hat: 'crown' as const }
    const tiles = buttonsIn(DressUpPanel({ look, name: 'Mochi', clip: 'bow', onClip, onWear, dispatch }))
    tiles.forEach((tile) => tile.props.onClick())
    expect(onClip.mock.calls.map(([kind]) => kind)).toEqual([...CLIP_KINDS])
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      ...CLIP_KINDS.map((kind) => ({ type: 'clips', clips: [clipAt(look, kind, nextClipSpot(look))] })),
      ...HATS.slice(1).map((item) => ({ type: 'wear', slot: 'hat', item: item === 'crown' ? 'none' : item })),
      ...GLASSES.slice(1).map((item) => ({ type: 'wear', slot: 'glasses', item })),
      ...HEADBANDS.slice(1).map((item) => ({ type: 'wear', slot: 'headband', item })),
      ...OUTFITS.map((outfit) => ({ type: 'outfit', outfit })),
    ])
    expect(onWear).toHaveBeenCalledTimes(dispatch.mock.calls.length)
    const full = { ...look, clips: Array.from({ length: MAX_CLIPS }, (): Clip => ({ kind: 'star', x: 250, y: 400 })) }
    dispatch.mockClear()
    buttonsIn(DressUpPanel({ look: full, name: 'Mochi', clip: 'bow', onClip, onWear, dispatch }))[1].props.onClick()
    expect(onClip).toHaveBeenLastCalledWith('daisy')
    expect(dispatch).not.toHaveBeenCalled()
    expect(renderToStaticMarkup(<DressUpPanel look={full} name="Mochi" clip="bow" onClip={onClip} onWear={onWear} dispatch={dispatch} />)).toContain('Mochi has 12 clips! Drag one off to make room.')
  })
})

describe('photo booth', () => {
  const look = createLook('mochi')
  const shot = (scene: Partial<Scene> = {}) => renderToStaticMarkup(<PhotoScene look={look} scene={{ ...freshScene(), ...scene }} />)
  const idsIn = (html: string, attribute: RegExp) => [...html.matchAll(attribute)].map(([, id]) => id)
  const tilesIn = (html: string) => [...html.matchAll(/aria-pressed="(true|false)"[^>]*>[\s\S]*?<span class="tool-label">([^<]+)<\/span>/g)].map(([, pressed, label]) => [label, pressed === 'true'] as const)

  it('draws every background and frame differently, painting only with gradients it defines', () => {
    const backgrounds = BACKGROUNDS.map((background) => shot({ background }))
    const frames = FRAMES.map((frame) => shot({ frame }))
    expect(new Set(backgrounds).size).toBe(BACKGROUNDS.length)
    expect(new Set(frames).size).toBe(FRAMES.length)
    for (const html of [...backgrounds, ...frames]) {
      const defined = idsIn(html, / id="([^"]+)"/g)
      expect(new Set(defined).size).toBe(defined.length)
      expect(idsIn(html, /url\(#([^)]+)\)/g).filter((id) => !defined.includes(id))).toEqual([])
    }
  })
  it('poses the capybara with the chosen face, under the frame, with stickers on top in the order they were added', () => {
    expect(shot({ face: 'calm' })).not.toContain('mood-')
    for (const face of FACES.slice(1)) expect(shot({ face })).toContain(`mood-${face}`)
    const html = shot({ frame: 'gold', stickers: [{ kind: 'paw', x: 50, y: 60 }, { kind: 'heart', x: 300, y: 400 }] })
    expect(idsIn(html, /data-sticker="([^"]+)"/g)).toEqual(['paw', 'heart'])
    expect(html.indexOf('data-strand=')).toBeLessThan(html.indexOf('data-frame="gold"'))
    expect(html.indexOf('data-frame="gold"')).toBeLessThan(html.indexOf('data-sticker='))
    expect(html).toContain('transform="translate(50 60)"')
  })
  it('shows a sticker being dragged off the picture faded at the edge', () => {
    const scene: Scene = { ...freshScene(), stickers: [{ kind: 'star', x: 100, y: 100 }, { kind: 'cloud', x: 200, y: 200 }] }
    const html = renderToStaticMarkup(<PhotoScene look={look} scene={scene} lifted={{ index: 1, x: -50, y: 120, away: true }} />)
    expect(html).toContain('class="sticker" transform="translate(100 100)"')
    expect(html).toContain('class="sticker lifted away" transform="translate(0 120)"')
  })
  it('lists every background, frame, face and sticker by name, marking only what is chosen', () => {
    const scene: Scene = { background: 'beach', frame: 'gold', face: 'giggle', stickers: [] }
    const html = renderToStaticMarkup(<BoothControls look={look} scene={scene} sticker="paw" onScene={() => {}} onSticker={() => {}} onSound={() => {}} />)
    const tiles = tilesIn(html)
    expect(tiles.map(([label]) => label)).toEqual([
      ...BACKGROUNDS.map((item) => BACKGROUND_LABELS[item]), ...FRAMES.map((item) => FRAME_LABELS[item]),
      ...FACES.map((item) => FACE_LABELS[item]), ...STICKER_KINDS.map((item) => STICKER_LABELS[item]),
    ])
    expect(tiles.filter(([, chosen]) => chosen).map(([label]) => label)).toEqual(['Beach day', 'Fancy gold', 'Giggle', 'Paw print'])
    expect(html).toMatch(/<button class="text-button" disabled="">.*Clear stickers<\/button>/)
  })
  it('changes the scene with a chime for each tap, sticks a tapped sticker on a free spot until the picture is full, and clears stickers', () => {
    const onScene = vi.fn()
    const onSticker = vi.fn()
    const onSound = vi.fn()
    const scene: Scene = { ...freshScene(), stickers: [{ kind: 'heart', x: 62, y: 62 }] }
    buttonsIn(BoothControls({ look, scene, sticker: 'heart', onScene, onSticker, onSound })).forEach((button) => button.props.onClick())
    expect(onScene.mock.calls.map(([next]) => next)).toEqual([
      ...BACKGROUNDS.map((background) => ({ ...scene, background })), ...FRAMES.map((frame) => ({ ...scene, frame })), ...FACES.map((face) => ({ ...scene, face })),
      ...STICKER_KINDS.map((kind) => placeSticker(scene, kind, nextStickerSpot(scene.stickers))), { ...scene, stickers: [] },
    ])
    expect(onScene.mock.calls[BACKGROUNDS.length + FRAMES.length + FACES.length][0].stickers[1]).toEqual({ kind: 'heart', x: 338, y: 62 })
    expect(onSticker.mock.calls.map(([kind]) => kind)).toEqual([...STICKER_KINDS])
    expect(onSound.mock.calls.map(([sound]) => sound)).toEqual([
      ...Array<string>(BACKGROUNDS.length + FRAMES.length + FACES.length).fill('chime'), ...Array<string>(STICKER_KINDS.length).fill('pop'), 'chime',
    ])
    const full: Scene = { ...scene, stickers: Array.from({ length: MAX_STICKERS }, (): Sticker => ({ kind: 'star', x: 200, y: 200 })) }
    onScene.mockClear()
    onSound.mockClear()
    buttonsIn(BoothControls({ look, scene: full, sticker: 'heart', onScene, onSticker, onSound }))[BACKGROUNDS.length + FRAMES.length + FACES.length + 2].props.onClick()
    expect(onSticker).toHaveBeenLastCalledWith('sparkle')
    expect(onScene).not.toHaveBeenCalled()
    expect(onSound).not.toHaveBeenCalled()
  })
  it('shows each saved picture in the scene it was taken in, and older pictures plainly', () => {
    const scene: Scene = { background: 'party', frame: 'hearts', face: 'surprised', stickers: [{ kind: 'balloon', x: 40, y: 40 }] }
    const photos = addPhoto(addPhoto([], createLook('cocoa'), 'old', '2026-01-01T12:00:00Z'), look, 'booth', '2026-01-02T12:00:00Z', scene)
    const [booth, old] = renderToStaticMarkup(<Gallery photos={photos} onRemove={() => {}} onClose={() => {}} />).split('<article').slice(1)
    expect(booth).toContain('aria-label="Saved picture of Mochi"')
    expect(booth).toMatch(/data-background="party"[\s\S]*mood-surprised[\s\S]*data-frame="hearts"[\s\S]*data-sticker="balloon"/)
    expect(old).toContain('aria-label="Saved picture of Cocoa"')
    expect(old).toContain('data-background="studio"')
    expect(old).not.toMatch(/data-frame=|data-sticker=|mood-/)
  })
})
