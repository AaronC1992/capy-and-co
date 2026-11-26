import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { detectGraphics, GRAPHICS_KEY, loadGraphics } from '../game/performance'
import type { GraphicsSettings } from '../game/performance'
import type { StoragePort } from '../game/storage'

export function useGraphics(storage: StoragePort) {
  const [initial] = useState(() => loadGraphics(storage))
  const [settings, setSettings] = useState(initial.settings)
  const [error, setError] = useState(initial.error)
  const [detected] = useState(() => {
    if (typeof navigator === 'undefined') return detectGraphics({})
    const device: Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } } = navigator
    return detectGraphics({ cores: device.hardwareConcurrency, memory: device.deviceMemory, saveData: device.connection?.saveData })
  })
  const quality = settings.quality === 'auto' ? detected : settings.quality
  const fps = quality === 'low' || settings.limitFps ? 30 : 60

  function update(next: GraphicsSettings) {
    setSettings(next)
    try {
      storage.setItem(GRAPHICS_KEY, JSON.stringify(next))
      setError(null)
    } catch (failure) {
      console.warn('Could not save graphics settings:', failure)
      setError('Graphics settings work for this visit, but could not be saved in this browser.')
    }
  }
  return { settings, quality, detected, fps, update, error }
}

export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    const update = () => {
      const hidden = document.hidden
      document.documentElement.dataset.gameHidden = String(hidden)
      setVisible(!hidden)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      delete document.documentElement.dataset.gameHidden
    }
  }, [])
  return visible
}

export function useInView(ref: RefObject<Element | null>, margin = '0px') {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: margin })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, margin])
  return visible
}
