import { useRef, useState } from 'react'
import { CHARACTERS } from '../game/model'
import type { Photo } from '../game/storage'
import { downloadPortrait } from '../game/exportPhoto'
import { Capybara } from './Capybara'
import { Icon } from './Icon'

function PhotoCard({ photo, onRemove }: { photo: Photo; onRemove: (id: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const friend = CHARACTERS.find((c) => c.id === photo.look.character)!
  async function download() {
    if (!svgRef.current) return
    setBusy(true)
    setError(null)
    try {
      await downloadPortrait(svgRef.current, friend.name)
    } catch (failure) {
      console.warn('Portrait export failed:', failure)
      setError('This picture could not download. Please try again in a full browser.')
    } finally {
      setBusy(false)
    }
  }
  return <article className="photo-card">
    <div className="photo-art" style={{ background: friend.backdrop }}><Capybara look={photo.look} svgRef={svgRef} portrait role="img" aria-label={`Saved hairstyle for ${friend.name}`} /></div>
    <div className="photo-info"><h3>{friend.name}'s good hair day</h3><span>{new Date(photo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
    <div className="photo-actions">
      <button className="text-button" disabled={busy} onClick={() => void download()}><Icon name="download" size={18} /> {busy ? 'Making picture…' : 'Download'}</button>
      <button className="round-button small" aria-label={`Delete ${friend.name} picture`} onClick={() => setConfirm(true)}><Icon name="trash" size={17} /></button>
    </div>
    {confirm && <div className="delete-confirm"><p>Remove this picture?</p><button onClick={() => onRemove(photo.id)}>Remove</button><button onClick={() => setConfirm(false)}>Keep it</button></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </article>
}

export function Gallery({ photos, onRemove, onClose }: { photos: Photo[]; onRemove: (id: string) => void; onClose: () => void }) {
  return <>
    <p className="gallery-note">Your 12 most recent looks, kept in this browser. Download favorites to keep them forever.</p>
    {photos.length === 0 ? <div className="empty-gallery"><Icon name="camera" size={56} /><h3>Your little wall of fame.</h3><p>Create a look, then tap “Picture perfect!” to save it here.</p><button className="primary-button" onClick={onClose}>Let's make a masterpiece <Icon name="arrow" size={18} /></button></div>
      : <div className="gallery-grid">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onRemove={onRemove} />)}</div>}
  </>
}
