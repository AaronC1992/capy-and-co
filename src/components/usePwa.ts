import { useEffect, useState } from 'react'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isInstallPrompt(event: Event): event is InstallPrompt {
  return 'prompt' in event && typeof event.prompt === 'function' && 'userChoice' in event
}

export function usePwa() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(false)
  const [status, setStatus] = useState('Offline support is being prepared.')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)')
    const updateInstalled = () => {
      const device: Navigator & { standalone?: boolean } = navigator
      setInstalled(standalone.matches || device.standalone === true)
    }
    const offer = (event: Event) => {
      if (!isInstallPrompt(event)) return
      event.preventDefault()
      setPrompt(event)
    }
    const done = () => { setInstalled(true); setPrompt(null) }
    updateInstalled()
    standalone.addEventListener('change', updateInstalled)
    window.addEventListener('beforeinstallprompt', offer)
    window.addEventListener('appinstalled', done)
    return () => {
      standalone.removeEventListener('change', updateInstalled)
      window.removeEventListener('beforeinstallprompt', offer)
      window.removeEventListener('appinstalled', done)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) {
      setStatus('Offline installation is available in the production build, not the development server.')
      return
    }
    if (!window.isSecureContext || !('serviceWorker' in navigator)) {
      setStatus('Offline support needs HTTPS (or localhost) and a browser with service workers.')
      return
    }
    let disposed = false
    const cleanups: (() => void)[] = []
    void navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: './', updateViaCache: 'none' })
      .then((registration) => {
        if (disposed) return
        const update = () => {
          if (disposed) return
          if (registration.waiting) setStatus('Update ready. Close all Capy & Co. tabs and reopen to use it. Your looks are kept.')
          else if (registration.active?.state === 'activated') setStatus('Ready to play offline. Looks and pictures stay on this device.')
        }
        const watch = () => {
          const worker = registration.installing
          if (!worker) { update(); return }
          const changed = () => {
            update()
            if (worker.state === 'redundant' && !disposed) {
              console.warn('Offline game installation did not complete.')
              setError('The offline download did not finish. Reopen the game online to retry; existing saves are safe.')
            }
          }
          worker.addEventListener('statechange', changed)
          cleanups.push(() => worker.removeEventListener('statechange', changed))
        }
        registration.addEventListener('updatefound', watch)
        cleanups.push(() => registration.removeEventListener('updatefound', watch))
        watch()
        update()
      }).catch((failure: unknown) => {
        console.warn('Offline game registration failed:', failure)
        if (!disposed) setError('Offline support could not start. Reopen the game online to retry.')
      })
    return () => { disposed = true; cleanups.forEach((cleanup) => cleanup()) }
  }, [])

  async function install() {
    if (!prompt) return
    try {
      await prompt.prompt()
      await prompt.userChoice
      setPrompt(null)
    } catch (failure) {
      console.warn('Game installation failed:', failure)
      setError('Installation could not open. Try the browser menu instead.')
      setPrompt(null)
    }
  }

  return { canInstall: prompt !== null && !installed, installed, status, error, install }
}
