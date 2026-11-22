import type { Dispatch } from 'react'
import { CLIP_KINDS, GLASSES, HATS, HEADBANDS, MAX_CLIPS, OUTFITS } from '../game/model'
import type { ClipKind, Look, SalonAction, WearSlot } from '../game/model'
import { clipAt, nextClipSpot } from '../game/accessories'
import { CLIP_LABELS, GLASSES_LABELS, HAT_LABELS, HEADBAND_LABELS, WearableIcon } from './Accessories'
import { OUTFIT_LABELS, OutfitIcon } from './Outfit'

const WEAR_SECTIONS: { slot: WearSlot; title: string; items: readonly string[]; labels: Record<string, string> }[] = [
  { slot: 'hat', title: 'Hats', items: HATS, labels: HAT_LABELS },
  { slot: 'glasses', title: 'Glasses', items: GLASSES, labels: GLASSES_LABELS },
  { slot: 'headband', title: 'Headbands', items: HEADBANDS, labels: HEADBAND_LABELS },
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
  function wear(slot: WearSlot, item: string) {
    dispatch({ type: 'wear', slot, item: look[slot] === item ? 'none' : item })
    onWear()
  }
  return <div className="accessory-panel">
    <h3>Clips and cuties</h3>
    <p>{full ? `${name} has ${MAX_CLIPS} clips! Drag one off to make room.` : `Pick one, then tap anywhere on ${name}. Drag clips to move them, or off to take them off.`}</p>
    <div className="wear-grid" role="group" aria-label="Clips">{CLIP_KINDS.map((kind) =>
      <button key={kind} className={`tool-button ${clip === kind ? 'selected' : ''}`} aria-pressed={clip === kind} onClick={() => addClip(kind)}>
        <WearableIcon slot="clip" item={kind} /><span className="tool-label">{CLIP_LABELS[kind]}</span>
      </button>,
    )}</div>
    {WEAR_SECTIONS.map(({ slot, title, items, labels }) => <section key={slot} aria-label={title}>
      <h3 className="accessory-heading">{title}</h3>
      <div className="wear-grid">{items.filter((item) => item !== 'none').map((item) => {
        const worn = look[slot] === item
        return <button key={item} className={`tool-button ${worn ? 'selected' : ''}`} aria-pressed={worn} title={worn ? 'Tap again to take it off' : undefined} onClick={() => wear(slot, item)}>
          <WearableIcon slot={slot} item={item} /><span className="tool-label">{labels[item]}</span>
        </button>
      })}</div>
    </section>)}
    <h3 className="accessory-heading">Outfits</h3>
    <div className="outfit-grid">{OUTFITS.map((item) =>
      <button key={item} className={`tool-button ${look.outfit === item ? 'selected' : ''}`} aria-pressed={look.outfit === item} onClick={() => { dispatch({ type: 'outfit', outfit: item }); onWear() }}>
        <OutfitIcon outfit={item} /><span className="tool-label">{OUTFIT_LABELS[item]}</span>
      </button>,
    )}</div>
  </div>
}
