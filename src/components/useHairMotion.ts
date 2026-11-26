import { useCallback, useEffect, useRef, useState } from 'react'
import { HairMotion } from '../game/hairMotion'
import type { HairOffsets } from '../game/hair'
import { FrameLoop } from '../game/performance'

export function useHairMotion(onFrame?: (now: number) => boolean, active = true, fps = 60) {
  // Built once: a HairMotion makes hundreds of spring tables, and this hook renders every animation frame.
  const [motion] = useState(() => ({ current: new HairMotion() }))
  const [offsets, setOffsets] = useState<HairOffsets>([])
  const reduced = useRef(false)
  const editFrame = useRef(onFrame)
  useEffect(() => { editFrame.current = onFrame }, [onFrame])
  const publish = useCallback(() => setOffsets(motion.current.offsets()), [])

  const [loop] = useState(() => new FrameLoop({
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
  }, (now, seconds) => {
    if (document.hidden) return false
    const editing = editFrame.current?.(now) ?? false
    const moving = motion.current.step(seconds, reduced.current)
    setOffsets(motion.current.offsets())
    return moving || editing
  }))

  const animate = useCallback(() => { if (!document.hidden) loop.start() }, [loop])

  const reset = useCallback(() => {
    loop.stop()
    motion.current = new HairMotion()
    setOffsets([])
  }, [loop])

  useEffect(() => { loop.configure(active, fps) }, [active, fps, loop])

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = preference.matches }
    update()
    preference.addEventListener('change', update)
    return () => {
      preference.removeEventListener('change', update)
      loop.stop()
    }
  }, [loop])

  return { motion, offsets, animate, reset, publish }
}
