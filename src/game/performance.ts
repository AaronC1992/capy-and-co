import type { StoragePort } from './storage'

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type GraphicsChoice = 'auto' | GraphicsQuality
export interface GraphicsSettings { quality: GraphicsChoice; limitFps: boolean }
export const GRAPHICS_KEY = 'capy-and-co-graphics'

export function detectGraphics({ cores, memory, saveData }: { cores?: number; memory?: number; saveData?: boolean }): GraphicsQuality {
  if (saveData || (cores !== undefined && cores > 0 && cores <= 4) || (memory !== undefined && memory > 0 && memory <= 4)) return 'low'
  if (cores !== undefined && cores >= 8 && memory !== undefined && memory >= 8) return 'high'
  // Browsers that withhold hardware hints get a balanced default, not a guessed device model.
  return 'medium'
}

export function isGraphicsChoice(value: unknown): value is GraphicsChoice {
  return value === 'auto' || value === 'low' || value === 'medium' || value === 'high'
}

export function loadGraphics(storage: StoragePort): { settings: GraphicsSettings; error: string | null } {
  const fallback: GraphicsSettings = { quality: 'auto', limitFps: false }
  try {
    const raw = storage.getItem(GRAPHICS_KEY)
    if (raw === null) return { settings: fallback, error: null }
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || !('quality' in data) || !isGraphicsChoice(data.quality)
      || !('limitFps' in data) || typeof data.limitFps !== 'boolean') throw new Error('Invalid graphics settings')
    return { settings: { quality: data.quality, limitFps: data.limitFps }, error: null }
  } catch (error) {
    console.warn('Could not load graphics settings:', error)
    return { settings: fallback, error: 'Graphics settings could not load. Using Auto; your hairstyles are unchanged.' }
  }
}

interface FrameClock {
  now(): number
  request(callback: (now: number) => void): number
  cancel(id: number): void
}

// Time-based tools receive real elapsed time; skipped display frames never slow down growth or drying.
export class FrameLoop {
  private frame: number | null = null
  private running = false
  private executing = false
  private active = true
  private previous = 0
  private next = 0
  private fps = 60
  private readonly clock: FrameClock
  private readonly onFrame: (now: number, seconds: number) => boolean

  constructor(clock: FrameClock, onFrame: (now: number, seconds: number) => boolean) {
    this.clock = clock
    this.onFrame = onFrame
  }

  configure(active: boolean, fps: number) {
    if (this.active === active && this.fps === fps) return
    this.active = active
    this.fps = fps
    this.cancel()
    if (this.running && active) this.schedule()
  }

  start() {
    this.running = true
    if (this.active && this.frame === null && !this.executing) this.schedule()
  }

  stop() {
    this.running = false
    this.cancel()
  }

  private cancel() {
    if (this.frame !== null) this.clock.cancel(this.frame)
    this.frame = null
  }

  private schedule() {
    this.previous = this.clock.now()
    this.next = this.previous + 1000 / this.fps
    this.frame = this.clock.request(this.tick)
  }

  private tick = (now: number) => {
    this.frame = null
    if (!this.running || !this.active) return
    if (now + 0.1 >= this.next) {
      const seconds = (now - this.previous) / 1000
      this.previous = now
      const interval = 1000 / this.fps
      this.next += Math.max(1, Math.floor((now - this.next + 0.1) / interval) + 1) * interval
      this.executing = true
      try {
        this.running = this.onFrame(now, seconds)
      } finally {
        this.executing = false
      }
    }
    if (this.running && this.active) this.frame = this.clock.request(this.tick)
  }
}
