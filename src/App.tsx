import { lazy, memo, Suspense, useDeferredValue, useEffect, useReducer, useRef, useState } from 'react'
import { CHARACTERS, salonReducer } from './game/model'
import type { ClipKind, DyeMode, Look, Tool } from './game/model'
import { addPhoto, loadGame, saveGame } from './game/storage'
import type { StoragePort } from './game/storage'
import { SalonAudio } from './game/audio'
import type { Sound } from './game/audio'
import { freshScene } from './game/photoBooth'
import { Capybara } from './components/Capybara'
import { Icon } from './components/Icon'
import { Studio } from './components/Studio'
import { Toolbox } from './components/Toolbox'
import type { Tab } from './components/Toolbox'
import { Modal } from './components/Modal'
import { Settings } from './components/Settings'
import { useGraphics, usePageVisible } from './components/usePerformance'
import { usePwa } from './components/usePwa'

const Gallery = lazy(() => import('./components/Gallery').then((module) => ({ default: module.Gallery })))
const PhotoBooth = lazy(() => import('./components/PhotoBooth').then((module) => ({ default: module.PhotoBooth })))
const MODAL_TITLES = { gallery: 'A gallery of good hair days.', help: 'Small paws. Endless possibilities.', booth: 'Say capy!', settings: 'Make yourself comfortable.' }

const browserStorage: StoragePort = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}

const FriendPortrait = memo(function FriendPortrait({ look }: { look: Look }) {
  const preview = useDeferredValue(look)
  return <Capybara look={preview} portrait graphics="low" aria-hidden="true" />
})

export default function App() {
  const graphics = useGraphics(browserStorage)
  const visible = usePageVisible()
  const pwa = usePwa()
  const [initial] = useState(() => loadGame(browserStorage))
  const [state, dispatch] = useReducer(salonReducer, { active: initial.data.active, looks: initial.data.looks, history: [] })
  const [photos, setPhotos] = useState(initial.data.photos)
  const [sound, setSound] = useState(initial.data.sound)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState<string>('#b5a0d8')
  const [dye, setDye] = useState<DyeMode>('whole')
  const [tab, setTab] = useState<Tab>('Style')
  const [clip, setClip] = useState<ClipKind>('bow')
  const [modal, setModal] = useState<keyof typeof MODAL_TITLES | null>(null)
  // The booth remembers its background, frame and stickers for the next picture.
  const [scene, setScene] = useState(freshScene)
  const [storageError, setStorageError] = useState(initial.error)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [audio] = useState(() => new SalonAudio())
  const look = state.looks[state.active]
  const friend = CHARACTERS.find((item) => item.id === state.active)!
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = useRef({ version: 3 as const, active: state.active, looks: state.looks, photos, sound })

  useEffect(() => {
    save.current = { version: 3, active: state.active, looks: state.looks, photos, sound }
    const timer = setTimeout(() => {
      const error = saveGame(browserStorage, save.current)
      if (error) setStorageError(error)
    }, 250)
    return () => clearTimeout(timer)
  }, [state.active, state.looks, photos, sound])

  useEffect(() => {
    const flush = () => {
      const error = saveGame(browserStorage, save.current)
      if (error) setStorageError(error)
    }
    const hidden = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', hidden)
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
      void audio.dispose().catch((error: unknown) => console.warn('Could not close salon audio:', error))
    }
  }, [audio])

  function soundFailure(error: unknown) {
    console.warn('Salon sound is unavailable:', error)
    setSound(false)
    setAudioError('Sound could not start in this browser. The salon still works without it.')
  }

  function playSound(effect: Sound = 'chime') {
    if (sound) void audio.play(effect).catch(soundFailure)
  }

  function toggleSound() {
    setAudioError(null)
    if (!sound) void audio.play().catch(soundFailure)
    setSound(!sound)
  }

  function notify(message: string) {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3500)
  }

  function takePhoto() {
    setPhotos((previous) => addPhoto(previous, look, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, new Date().toISOString(), scene))
    setModal('gallery')
    notify('Picture added to your gallery!')
  }

  return <div className="game" data-graphics={graphics.quality} data-low-power={graphics.fps === 30}>
    <header className="site-header">
      <a className="brand" href="./" aria-label="Capy and Co home"><span className="brand-mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M9 20C1 7 15 5 17 15m14 0C35 4 47 9 40 21" fill="#c6a77c" stroke="#56644c" strokeWidth="2" /><rect x="8" y="14" width="33" height="28" rx="12" fill="#dbbc93" stroke="#56644c" strokeWidth="2" /><path d="M16 29h17v8H16Z" fill="#ecd4ad" /><path d="M17 25h.1m15 0h.1m-12 7h.1m7 0h.1m-4 4h3" stroke="#56644c" strokeWidth="3" strokeLinecap="round" /><path d="M19 15c-5-8 4-11 5-4 1-9 10-7 6 2" fill="#99af8a" stroke="#56644c" strokeWidth="2" /></svg></span><span>capy <span className="brand-amp">&</span> co<span className="brand-period">.</span><small>THE HAPPY LITTLE HAIR STUDIO</small></span></a>
      <nav aria-label="Studio navigation">
        <button className="nav-button sound-button" onClick={toggleSound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}><Icon name={sound ? 'sound' : 'muted'} size={20} /><span>Sound {sound ? 'on' : 'off'}</span></button>
        <span className="nav-divider" />
        <button className="nav-button gallery-button" aria-label="My gallery" onClick={() => setModal('gallery')}><Icon name="gallery" size={20} /><span>My gallery</span>{photos.length > 0 && <span className="gallery-count">{photos.length}</span>}</button>
        <button className="nav-button settings-button" onClick={() => setModal('settings')} aria-label="Settings and install"><Icon name="settings" size={20} /><span>Settings</span></button>
        <button className="help-button" onClick={() => setModal('help')} aria-label="How to play"><Icon name="help" size={23} /></button>
      </nav>
    </header>
    <main className="main-shell">
      {(storageError || audioError) && <div className="error-banner" role="alert"><span>{storageError || audioError}</span><button className="round-button" aria-label="Dismiss message" onClick={() => { setStorageError(null); setAudioError(null) }}><Icon name="close" size={18} /></button></div>}
      <div className="salon-layout">
        <div className="play-column">
          <div className="friend-picker" role="group" aria-label="Choose your capybara">
            {CHARACTERS.map((friend) => <button key={friend.id} className={`friend-card ${state.active === friend.id ? 'active' : ''}`} aria-pressed={state.active === friend.id} aria-label={`Style ${friend.name}`} onClick={() => { dispatch({ type: 'select', character: friend.id }); playSound() }}>
              <span className="friend-avatar" style={{ background: friend.backdrop }}><FriendPortrait look={state.looks[friend.id]} /></span>
              <span className="friend-copy"><strong>{friend.name}</strong><small>{friend.personality}</small></span>
              <span className="friend-check">{state.active === friend.id && <Icon name="check" size={12} />}</span>
            </button>)}
          </div>
          <Studio look={look} tool={tool} color={color} dye={dye} decorating={tab === 'Dress up'} clip={clip} dispatch={dispatch} onStyle={playSound} canUndo={state.history.length > 0} graphics={graphics.quality} fps={graphics.fps} active={visible && modal === null} />
        </div>
        <Toolbox tab={tab} onTab={setTab} tool={tool} onTool={setTool} color={color} onColor={setColor} dye={dye} onDye={setDye} look={look} name={friend.name} clip={clip} onClip={setClip} onWear={() => playSound('pop')} dispatch={dispatch} onPhoto={() => setModal('booth')} />
      </div>
    </main>
    {notice && <div className="toast" role="status"><Icon name="check" size={18} />{notice}</div>}
    {modal && <Modal title={MODAL_TITLES[modal]} onClose={() => setModal(null)}><Suspense fallback={<p className="gallery-note" role="status">Opening your salon...</p>}>
      {modal === 'gallery' ? <Gallery photos={photos} onRemove={(id) => setPhotos((previous) => previous.filter((photo) => photo.id !== id))} onClose={() => setModal(null)} />
        : modal === 'booth' ? <PhotoBooth look={look} name={friend.name} scene={scene} onScene={setScene} onSound={playSound} onSnap={takePhoto} />
        : modal === 'settings' ? <Settings graphics={graphics} pwa={pwa} />
        : <div className="help-content">
          <div className="help-step"><span>1</span><div><h3>Meet your new bestie.</h3><p>Choose Mochi, Biscuit, or Cocoa. Each friend keeps their own look.</p></div></div>
          <div className="help-step"><span>2</span><div><h3>A little snip. A little magic.</h3><p>Pick a tool, then use a finger, mouse, or pen. Keep dragging with Brush: hair stays where you leave it. Trace a line with the gel Comb and the hair lies along it. Drag Snip to cut that spot, all the way down to a bald patch if you like, or hold Grow to make an area longer or bring bare scalp back. Keep holding Grow and the hair grows all the way down to the floor! Hold Curl on the hair: the longer you hold, the curlier it gets. “Do all the hair” styles it all at once.</p></div></div>
          <div className="help-step"><span>3</span><div><h3>Make it their own.</h3><p>Soap adds bubbles that stay until you Wash them off. Wash is a water sprayer: hold it on the hair and watch it get soaked, rinse clean and hang straight down. Hold and swipe with Blow-dry to whoosh the hair around. It flaps the way the air blows, dries the hair, and stays blown into a new shape! Paint with Color: whole locks, dipped tips or a fade, or go rainbow or glitter. In Dress up, choose an outfit, a hat, glasses and a headband, then tap anywhere on your friend to add clips. Drag a clip, hat, glasses or headband to move it, or drop it in the trash can to take it off. Use <strong>Take it all off</strong> to start fresh. Add fake eyelashes, eyeshadow, blush and lipstick for a glam look. Poke an eye, boop the nose or the belly, or tickle an armpit to see what happens! Undo a change any time.</p></div></div>
          <div className="help-step"><span>4</span><div><h3>Say capy!</h3><p>“Picture perfect!” opens the photo booth. Pick a background, a frame and a face, tap the picture to add stickers, then Snap! Your picture goes to My gallery, where you can download it to keep or print.</p></div></div>
          <div className="parent-note"><h3>A note for grown-ups</h3><p>No ads, accounts, purchases, or tracking. Looks stay on this device and browser, not in the cloud. Clearing browser data clears the gallery. Download favorites first. Sound is optional.</p><p>Keyboard: Tab to controls, Enter or Space to use them. On the capybara, Enter styles all hair. Arrow keys switch tool tabs. Escape closes this window.</p></div>
          <button className="primary-button" onClick={() => setModal(null)}>Let's play <Icon name="arrow" size={19} /></button>
        </div>}
    </Suspense></Modal>}
  </div>
}
