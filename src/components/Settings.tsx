import { isGraphicsChoice } from '../game/performance'
import type { useGraphics } from './usePerformance'
import type { usePwa } from './usePwa'

export function Settings({ graphics, pwa }: { graphics: ReturnType<typeof useGraphics>; pwa: ReturnType<typeof usePwa> }) {
  return <div className="settings-content">
    <section>
      <h3>Graphics &amp; battery</h3>
      <label htmlFor="graphics-quality">Graphics quality</label>
      <select id="graphics-quality" value={graphics.settings.quality} onChange={(event) => {
        if (isGraphicsChoice(event.target.value)) graphics.update({ ...graphics.settings, quality: event.target.value })
      }}>
        <option value="auto">Auto (recommended)</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <p role="status">Using {graphics.quality} graphics at up to {graphics.fps} FPS.</p>
      <p>Auto uses available processor, memory and data-saving hints. If play feels slow or your device gets warm, choose Low. All hairstyles and tools work at every quality.</p>
      <label className="check-setting"><input type="checkbox" checked={graphics.settings.limitFps || graphics.quality === 'low'} disabled={graphics.quality === 'low'} onChange={(event) => graphics.update({ ...graphics.settings, limitFps: event.target.checked })} />30 FPS mode (save power)</label>
      <p>Low reduces bubbles, glitter animation, reflections and shadows, and always uses 30 FPS. Medium keeps some effects; High has all the details. Rendering pauses when the studio is offscreen or covered by a dialog.</p>
      {graphics.error && <p className="inline-error" role="alert">{graphics.error}</p>}
    </section>
    <section>
      <h3>Install &amp; play offline</h3>
      <p role="status">{pwa.status}</p>
      {pwa.canInstall && <button className="primary-button" onClick={() => void pwa.install()}>Install game</button>}
      <p>{pwa.installed ? 'The game is installed.' : 'On iPhone or iPad, open in Safari, tap Share, then Add to Home Screen. On Android or desktop, use Install game or your browser menu when offered.'}</p>
      <p>Visit online once and wait for “Ready to play offline” before disconnecting. Clearing browser data removes the offline download and saved looks. Download favorite pictures to keep them.</p>
      {pwa.error && <p className="inline-error" role="alert">{pwa.error}</p>}
    </section>
  </div>
}
