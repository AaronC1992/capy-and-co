import type { Dispatch } from 'react'
import { ACCESSORIES, OUTFITS } from '../game/model'
import type { Accessory, Outfit, SalonAction } from '../game/model'
import { Icon } from './Icon'
import { OUTFIT_LABELS, OutfitIcon } from './Outfit'

const ACCESSORY_LABELS: Record<Accessory, string> = { none: 'No accessory', bow: 'Little bow', flower: 'Daisy day', crown: 'Royal capy', cherries: 'Cherry cute', star: 'Superstar' }

interface Props {
  outfit: Outfit
  accessory: Accessory
  dispatch: Dispatch<SalonAction>
}

export function DressUpPanel({ outfit, accessory, dispatch }: Props) {
  return <div className="accessory-panel">
    <h3>Pick an outfit</h3>
    <p>Tap some clothes to wear.</p>
    <div className="outfit-grid">{OUTFITS.map((item) =>
      <button key={item} className={`tool-button ${outfit === item ? 'selected' : ''}`} aria-pressed={outfit === item} onClick={() => dispatch({ type: 'outfit', outfit: item })}>
        <OutfitIcon outfit={item} /><span className="tool-label">{OUTFIT_LABELS[item]}</span>
      </button>,
    )}</div>
    <h3 className="accessory-heading">The cherry on top</h3>
    <p>Tap a little something to try it on.</p>
    <div className="tool-grid accessory-grid">{ACCESSORIES.map((item) =>
      <button key={item} className={`tool-button ${accessory === item ? 'selected' : ''}`} aria-pressed={accessory === item} onClick={() => dispatch({ type: 'accessory', accessory: item })}>
        <Icon name={item} size={34} /><span className="tool-label">{ACCESSORY_LABELS[item]}</span>
      </button>,
    )}</div>
  </div>
}
