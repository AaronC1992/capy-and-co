import { useEffect, useReducer, useRef, useState } from 'react'
import { CHARACTERS, salonReducer } from './game/model'
import type { Tool } from './game/model'
import { addPhoto, loadGame, saveGame } from './game/storage'
import type { StoragePort } from './game/storage'
import { SalonAudio } from './game/audio'
import { Capybara } from './components/Capybara'
import { Icon } from './components/Icon'
import { Studio } from './components/Studio'
import { Toolbox } from './components/Toolbox'
import { Modal } from './components/Modal'
import { Gallery } from './components/Gallery'

const browserStorage: StoragePort = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}

export default function App() {
  const [initial] = useState(() => loadGame(browserStorage))
  const [state, dispatch] = useReducer(salonReducer, { active: initial.data.active, looks: initial.data.looks, history: [] })
  const [photos, setPhotos] = useState(initial.data.photos)
  const [sound, setSound] = useState(initial.data.sound)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState<string>('#b5a0d8')
  const [modal, setModal] = useState<'gallery' | 'help' | null>(null)
  const [storageError, setStorageError] = useState(initial.error)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [audio] = useState(() => new SalonAudio())
  const look = state.looks[state.active]
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = useRef({ version: 2 as const, active: state.active, looks: state.looks, photos, sound })

  useEffect(() => {
    save.current = { version: 2, active: state.active, looks: state.looks, photos, sound }
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

  function playSound() {
    if (sound) void audio.play().catch(soundFailure)
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
    setPhotos((previous) => addPhoto(previous, look, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, new Date().toISOString()))
    playSound()
    setModal('gallery')
    notify('Picture added to your gallery!')
  }

  return <>
    <header className="site-header">
      <a className="brand" href="./" aria-label="Capy and Co home"><span className="brand-mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M9 20C1 7 15 5 17 15m14 0C35 4 47 9 40 21" fill="#c6a77c" stroke="#56644c" strokeWidth="2" /><rect x="8" y="14" width="33" height="28" rx="12" fill="#dbbc93" stroke="#56644c" strokeWidth="2" /><path d="M16 29h17v8H16Z" fill="#ecd4ad" /><path d="M17 25h.1m15 0h.1m-12 7h.1m7 0h.1m-4 4h3" stroke="#56644c" strokeWidth="3" strokeLinecap="round" /><path d="M19 15c-5-8 4-11 5-4 1-9 10-7 6 2" fill="#99af8a" stroke="#56644c" strokeWidth="2" /></svg></span><span>capy <span className="brand-amp">&</span> co<span className="brand-period">.</span><small>THE HAPPY LITTLE HAIR STUDIO</small></span></a>
      <nav aria-label="Studio navigation">
        <button className="nav-button sound-button" onClick={toggleSound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}><Icon name={sound ? 'sound' : 'muted'} size={20} /><span>Sound {sound ? 'on' : 'off'}</span></button>
        <span className="nav-divider" />
        <button className="nav-button" onClick={() => setModal('gallery')}><Icon name="gallery" size={20} /><span>My gallery</span>{photos.length > 0 && <span className="gallery-count">{photos.length}</span>}</button>
        <button className="help-button" onClick={() => setModal('help')} aria-label="How to play"><Icon name="help" size={23} /></button>
      </nav>
    </header>
    <main className="main-shell">
      <section className="welcome">
        <div><div className="welcome-kicker"><span className="tiny-flower">✳</span> A COZY CHAIR. A LITTLE CREATIVITY.</div><h1>Good hair. <span>Happy capy.</span><svg viewBox="0 0 36 43" aria-hidden="true"><path d="m9 2-1 13M29 12l-12 7m10 17-13-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></h1><p>Snip, style & let your imagination run a little wild.</p></div>
        <div className="free-play-note"><Icon name="heart" size={19} /><span>Just play.<br /><strong>There’s no wrong way.</strong></span></div>
      </section>
      {(storageError || audioError) && <div className="error-banner" role="alert"><span>{storageError || audioError}</span><button className="round-button" aria-label="Dismiss message" onClick={() => { setStorageError(null); setAudioError(null) }}><Icon name="close" size={18} /></button></div>}
      <div className="salon-layout">
        <div className="play-column">
          <div className="friend-picker" role="group" aria-label="Choose your capybara">
            {CHARACTERS.map((friend) => <button key={friend.id} className={`friend-card ${state.active === friend.id ? 'active' : ''}`} aria-pressed={state.active === friend.id} aria-label={`Style ${friend.name}`} onClick={() => { dispatch({ type: 'select', character: friend.id }); playSound() }}>
              <span className="friend-avatar" style={{ background: friend.backdrop }}><Capybara look={state.looks[friend.id]} portrait aria-hidden="true" /></span>
              <span className="friend-copy"><strong>{friend.name}</strong><small>{friend.personality}</small></span>
              <span className="friend-check">{state.active === friend.id && <Icon name="check" size={12} />}</span>
            </button>)}
          </div>
          <Studio look={look} tool={tool} color={color} dispatch={dispatch} onStyle={playSound} canUndo={state.history.length > 0} />
          <div className="studio-caption"><span><span className="small-dot" /> Your very own little salon</span><span>Big ideas welcome. Perfect hair optional.</span></div>
        </div>
        <Toolbox tool={tool} onTool={setTool} color={color} onColor={setColor} accessory={look.accessory} dispatch={dispatch} onPhoto={takePhoto} />
      </div>
      <footer className="site-footer"><span>Made for little hands & big imaginations <Icon name="heart" size={13} /></span><button className="mobile-help" onClick={() => setModal('help')}>How to play <Icon name="help" size={15} /></button><span>No scores. No rush. Just happy capys.</span></footer>
    </main>
    {notice && <div className="toast" role="status"><Icon name="check" size={18} />{notice}</div>}
    {modal && <Modal title={modal === 'gallery' ? 'A gallery of good hair days.' : 'Small paws. Endless possibilities.'} onClose={() => setModal(null)}>
      {modal === 'gallery' ? <Gallery photos={photos} onRemove={(id) => setPhotos((previous) => previous.filter((photo) => photo.id !== id))} onClose={() => setModal(null)} />
        : <div className="help-content">
          <div className="help-step"><span>1</span><div><h3>Meet your new bestie.</h3><p>Choose Mochi, Biscuit, or Cocoa. Each friend keeps their own look.</p></div></div>
          <div className="help-step"><span>2</span><div><h3>A little snip. A little magic.</h3><p>Pick a tool, then use a finger, mouse, or pen. Keep dragging with Brush: hair stays where you leave it. Drag Snip to cut that spot, or hold Grow to make an area longer. “Do all the hair” styles it all at once.</p></div></div>
          <div className="help-step"><span>3</span><div><h3>Make it their own.</h3><p>Soap adds bubbles that stay until you Wash them off. Wash also restores the original color and leaves the hair damp. Hold Blow-dry near the hair to dry it and blow it into a new shape that stays! Try Color and Dress up, or Undo a change.</p></div></div>
          <div className="help-step"><span>4</span><div><h3>Say capy!</h3><p>“Picture perfect!” adds a snapshot to My gallery. Download it as a picture to keep or print.</p></div></div>
          <div className="parent-note"><h3>A note for grown-ups</h3><p>No ads, accounts, purchases, or tracking. Looks stay on this device and browser, not in the cloud. Clearing browser data clears the gallery. Download favorites first. Sound is optional.</p><p>Keyboard: Tab to controls, Enter or Space to use them. On the capybara, Enter styles all hair. Arrow keys switch tool tabs. Escape closes this window.</p></div>
          <button className="primary-button" onClick={() => setModal(null)}>Let's play <Icon name="arrow" size={19} /></button>
        </div>}
    </Modal>}
  </>
}
