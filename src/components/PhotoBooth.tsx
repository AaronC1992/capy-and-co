import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { CHARACTERS } from '../game/model'
import type { Look } from '../game/model'
import type { Sound } from '../game/audio'
import type { Point } from '../game/hair'
import { BACKGROUNDS, dropSticker, FACES, FRAMES, isOnPicture, MAX_STICKERS, nextStickerSpot, placeSticker, STICKER_KINDS, stickerAt } from '../game/photoBooth'
import type { Scene, StickerKind } from '../game/photoBooth'
import { Capybara } from './Capybara'
import { Icon } from './Icon'
import { BACKGROUND_LABELS, BackgroundIcon, FACE_LABELS, FRAME_LABELS, FrameIcon, PhotoScene, STICKER_LABELS, StickerIcon } from './PhotoScene'
import type { LiftedSticker } from './PhotoScene'

// How long the camera flash shows before the picture goes to the gallery.
const FLASH_MS = 450

function tiles<T extends string>(items: readonly T[], chosen: (item: T) => boolean, label: Record<T, string>, icon: (item: T) => ReactNode, pick: (item: T) => void) {
  return items.map((item) => <button key={item} className={`tool-button ${chosen(item) ? 'selected' : ''}`} aria-pressed={chosen(item)} onClick={() => pick(item)}>
    {icon(item)}<span className="tool-label">{label[item]}</span>
  </button>)
}

interface ControlsProps {
  look: Look
  scene: Scene
  sticker: StickerKind
  onScene: (scene: Scene) => void
  onSticker: (kind: StickerKind) => void
  onSound: (sound: Sound) => void
}

export function BoothControls({ look, scene, sticker, onScene, onSticker, onSound }: ControlsProps) {
  const tint = CHARACTERS.find((c) => c.id === look.character)!.backdrop
  function choose(next: Partial<Scene>) {
    onScene({ ...scene, ...next })
    onSound('chime')
  }
  // Picking a sticker sticks one on a free spot right away, and taps on the picture add more of it.
  function addSticker(kind: StickerKind) {
    onSticker(kind)
    if (scene.stickers.length >= MAX_STICKERS) return
    onScene(placeSticker(scene, kind, nextStickerSpot(scene.stickers)))
    onSound('pop')
  }
  return <div className="booth-controls">
    <section aria-label="Backgrounds"><h3>Background</h3><div className="booth-grid">
      {tiles(BACKGROUNDS, (item) => scene.background === item, BACKGROUND_LABELS, (item) => <BackgroundIcon kind={item} tint={tint} />, (background) => choose({ background }))}
    </div></section>
    <section aria-label="Frames"><h3>Frame</h3><div className="booth-grid">
      {tiles(FRAMES, (item) => scene.frame === item, FRAME_LABELS, (item) => <FrameIcon kind={item} />, (frame) => choose({ frame }))}
    </div></section>
    <section aria-label="Faces"><h3>Face</h3><div className="booth-grid">
      {tiles(FACES, (item) => scene.face === item, FACE_LABELS, (item) => <span className="face-icon" style={{ background: tint }}><Capybara look={look} mood={item} viewBox="160 215 180 130" aria-hidden="true" /></span>, (face) => choose({ face }))}
    </div></section>
    <section aria-label="Stickers"><h3>Stickers</h3><div className="booth-grid">
      {tiles(STICKER_KINDS, (item) => sticker === item, STICKER_LABELS, (item) => <StickerIcon kind={item} />, addSticker)}
    </div>
    <button className="text-button" disabled={scene.stickers.length === 0} onClick={() => choose({ stickers: [] })}><Icon name="trash" size={17} /> Clear stickers</button></section>
  </div>
}

interface BoothProps {
  look: Look
  name: string
  scene: Scene
  onScene: (scene: Scene) => void
  onSound: (sound: Sound) => void
  onSnap: () => void
}

interface Grab extends LiftedSticker { pointer: number; dx: number; dy: number }

export function PhotoBooth({ look, name, scene, onScene, onSound, onSnap }: BoothProps) {
  const [sticker, setSticker] = useState<StickerKind>('heart')
  const [grab, setGrab] = useState<Grab | null>(null)
  const [snapping, setSnapping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const full = scene.stickers.length >= MAX_STICKERS

  function pointIn(event: PointerEvent<SVGSVGElement>): Point | null {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return null
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: point.x, y: point.y }
  }
  function press(event: PointerEvent<SVGSVGElement>) {
    if (grab || snapping || !event.isPrimary) return
    const point = pointIn(event)
    if (!point) return
    const index = stickerAt(scene.stickers, point)
    if (index >= 0) {
      const { x, y } = scene.stickers[index]
      event.currentTarget.setPointerCapture(event.pointerId)
      setGrab({ index, x, y, away: false, pointer: event.pointerId, dx: point.x - x, dy: point.y - y })
    } else if (!full) {
      onScene(placeSticker(scene, sticker, point))
      onSound('pop')
    }
  }
  function drag(event: PointerEvent<SVGSVGElement>) {
    if (!grab || event.pointerId !== grab.pointer) return
    const point = pointIn(event)
    if (!point) return
    const at = { x: point.x - grab.dx, y: point.y - grab.dy }
    setGrab({ ...grab, ...at, away: !isOnPicture(at) })
  }
  function release(event: PointerEvent<SVGSVGElement>) {
    if (!grab || event.pointerId !== grab.pointer) return
    const point = pointIn(event)
    const at = point ? { x: point.x - grab.dx, y: point.y - grab.dy } : grab
    onScene(dropSticker(scene, grab.index, at))
    if (!isOnPicture(at)) onSound('pop')
    setGrab(null)
  }
  function snap() {
    if (snapping) return
    setSnapping(true)
    onSound('shutter')
    timer.current = setTimeout(onSnap, FLASH_MS)
  }
  return <div className="photo-booth">
    <div className="booth-stage">
      <div className="booth-picture">
        <PhotoScene look={look} scene={scene} lifted={grab ?? undefined} role="img" aria-label={`${name} in the photo booth`}
          onPointerDown={press} onPointerMove={drag} onPointerUp={release} onPointerCancel={() => setGrab(null)} />
        {snapping && <div className="booth-flash" aria-hidden="true" />}
      </div>
      <button className="primary-button snap-button" disabled={snapping} onClick={snap}><Icon name="camera" size={21} /> Snap! <Icon name="arrow" size={19} /></button>
      <p className="booth-hint">{full ? `That's ${MAX_STICKERS} stickers! Drag one off the picture to make room.` : 'Tap the picture to add a sticker. Drag stickers to move them, or off the picture to peel them off.'}</p>
    </div>
    <BoothControls look={look} scene={scene} sticker={sticker} onScene={onScene} onSticker={setSticker} onSound={onSound} />
  </div>
}
