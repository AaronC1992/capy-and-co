import type { Dispatch } from 'react'
import { BLUSHES, CLIP_KINDS, EYESHADOWS, GLASSES, HATS, HEADBANDS, LASHES, LIPSTICKS, MAX_CLIPS, OUTFITS } from '../game/model'
import type { ClipKind, Look, MakeupSlot, SalonAction, WearSlot } from '../game/model'
import { clipAt, nextClipSpot } from '../game/accessories'
import { CLIP_LABELS, GLASSES_LABELS, HAT_LABELS, HEADBAND_LABELS, WearableIcon } from './Accessories'
import { BLUSH_LABELS, EYESHADOW_LABELS, LASH_LABELS, LIPSTICK_LABELS, MakeupIcon } from './Makeup'
import { OUTFIT_LABELS, OutfitIcon } from './Outfit'

interface Section<Slot> { slot: Slot; title: string; items: readonly string[]; labels: Record<string, string> }

const WEAR_SECTIONS: Section<WearSlot>[] = [
  { slot: 'hat', title: 'Hats', items: HATS, labels: HAT_LABELS },
  { slot: 'glasses', title: 'Glasses', items: GLASSES, labels: GLASSES_LABELS },
  { slot: 'headband', title: 'Headbands', items: HEADBANDS, labels: HEADBAND_LABELS },
]
const LASH_SECTION: Section<MakeupSlot> = { slot: 'lashes', title: 'Fake eyelashes', items: LASHES, labels: LASH_LABELS }
const MAKEUP_SECTIONS: Section<MakeupSlot>[] = [
  { slot: 'eyeshadow', title: 'Eyeshadow', items: EYESHADOWS, labels: EYESHADOW_LABELS },
  { slot: 'blush', title: 'Blush', items: BLUSHES, labels: BLUSH_LABELS },
  { slot: 'lipstick', title: 'Lipstick', items: LIPSTICKS, labels: LIPSTICK_LABELS },
]

interface Props {
  look: Look
  name: string
  clip: ClipKind
  onClip: (clip: ClipKind) => void
  onWear: () => void
  dispatch: Dispatch<SalonAction>
}

export function DressUpPanel({ look, name, clip, onClip, onWear, dispatch }: Props) {
  const full = look.clips.length >= MAX_CLIPS
  // Picking a clip puts one on a free spot right away, and taps on the capybara add more of it.
  function addClip(kind: ClipKind) {
    onClip(kind)
    if (full) return
    dispatch({ type: 'clips', clips: [...look.clips, clipAt(look, kind, nextClipSpot(look))] })
    onWear()
  }
  function wear(slot: WearSlot | MakeupSlot, item: string) {
    dispatch({ type: 'wear', slot, item: look[slot] === item ? 'none' : item })
    onWear()
  }
  // One of each kind at a time: tapping what's already on takes it off again.
  function tiles(slot: WearSlot | MakeupSlot, items: readonly string[], labels: Record<string, string>) {
    return <div className="wear-grid">{items.filter((item) => item !== 'none').map((item) => {
      const worn = look[slot] === item
      return <button key={item} className={`tool-button ${worn ? 'selected' : ''}`} aria-pressed={worn} title={worn ? 'Tap again to take it off' : undefined} onClick={() => wear(slot, item)}>
        {slot === 'hat' || slot === 'glasses' || slot === 'headband' ? <WearableIcon slot={slot} item={item} /> : <MakeupIcon slot={slot} item={item} />}
        <span className="tool-label">{labels[item]}</span>
      </button>
    })}</div>
  }
  return <div className="accessory-panel">
    <h3>Clips and cuties</h3>
    <p>{full ? `${name} has ${MAX_CLIPS} clips! Drag one to the trash can to make room.` : `Pick one, then tap anywhere on ${name}. Drag clips, hats, glasses and headbands to move them, or drop them in the trash can to take them off.`}</p>
    <div className="wear-grid" role="group" aria-label="Clips">{CLIP_KINDS.map((kind) =>
      <button key={kind} className={`tool-button ${clip === kind ? 'selected' : ''}`} aria-pressed={clip === kind} onClick={() => addClip(kind)}>
        <WearableIcon slot="clip" item={kind} /><span className="tool-label">{CLIP_LABELS[kind]}</span>
      </button>,
    )}</div>
    {[...WEAR_SECTIONS, LASH_SECTION].map(({ slot, title, items, labels }) => <section key={slot} aria-label={title}>
      <h3 className="accessory-heading">{title}</h3>
      {tiles(slot, items, labels)}
    </section>)}
    <h3 className="accessory-heading">Makeup</h3>
    {MAKEUP_SECTIONS.map(({ slot, title, items, labels }) => <section key={slot} aria-label={title}>
      <h4>{title}</h4>
      {tiles(slot, items, labels)}
    </section>)}
    <h3 className="accessory-heading">Outfits</h3>
    <div className="outfit-grid">{OUTFITS.map((item) =>
      <button key={item} className={`tool-button ${look.outfit === item ? 'selected' : ''}`} aria-pressed={look.outfit === item} onClick={() => { dispatch({ type: 'outfit', outfit: item }); onWear() }}>
        <OutfitIcon outfit={item} /><span className="tool-label">{OUTFIT_LABELS[item]}</span>
      </button>,
    )}</div>
  </div>
}
