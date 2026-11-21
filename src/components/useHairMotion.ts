import { useCallback, useEffect, useRef, useState } from 'react'
import { HairMotion } from '../game/hairMotion'
import type { HairOffsets } from '../game/hair'

export function useHairMotion(onFrame?: (now: number) => boolean) {
  // Built once: a HairMotion makes hundreds of spring tables, and this hook renders every animation frame.
  const [motion] = useState(() => ({ current: new HairMotion() }))
  const [offsets, setOffsets] = useState<HairOffsets>([])
  const frame = useRef<number | null>(null)
  const reduced = useRef(false)
  const editFrame = useRef(onFrame)
  useEffect(() => { editFrame.current = onFrame }, [onFrame])
  const publish = useCallback(() => setOffsets(motion.current.offsets()), [])

  const animate = useCallback(() => {
    if (frame.current !== null) return
    let previous = performance.now()
    function tick(now: number) {
      const editing = editFrame.current?.(now) ?? false
      const moving = motion.current.step((now - previous) / 1000, reduced.current)
      previous = now
      setOffsets(motion.current.offsets())
      frame.current = moving || editing ? requestAnimationFrame(tick) : null
    }
    frame.current = requestAnimationFrame(tick)
  }, [])

  const reset = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    motion.current = new HairMotion()
    setOffsets([])
  }, [])

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = preference.matches }
    update()
    preference.addEventListener('change', update)
    return () => {
      preference.removeEventListener('change', update)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [])

  return { motion, offsets, animate, reset, publish }
}
