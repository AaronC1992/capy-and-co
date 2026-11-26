import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectGraphics, FrameLoop, loadGraphics } from './performance'

afterEach(() => vi.restoreAllMocks())

describe('graphics capability hints and preferences', () => {
  it('uses conservative defaults and honors the weakest available hint', () => {
    expect(detectGraphics({})).toBe('medium')
    expect(detectGraphics({ cores: 0, memory: NaN })).toBe('medium')
    expect(detectGraphics({ cores: 8 })).toBe('medium')
    expect(detectGraphics({ cores: 8, memory: 8 })).toBe('high')
    expect(detectGraphics({ cores: 16, memory: 2 })).toBe('low')
    expect(detectGraphics({ cores: 4, memory: 16 })).toBe('low')
    expect(detectGraphics({ cores: 16, memory: 16, saveData: true })).toBe('low')
  })

  it('restores explicit overrides without accepting corrupt settings or changing game saves', () => {
    const storage = { getItem: vi.fn(() => '{"quality":"high","limitFps":true}'), setItem: vi.fn() }
    expect(loadGraphics(storage)).toEqual({ settings: { quality: 'high', limitFps: true }, error: null })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const raw of ['null', '{}', '{"quality":"ultra","limitFps":false}', '{"quality":"low","limitFps":1}', 'broken']) {
      storage.getItem.mockReturnValue(raw)
      expect(loadGraphics(storage)).toEqual({ settings: { quality: 'auto', limitFps: false }, error: expect.any(String) })
    }
    storage.getItem.mockImplementation(() => { throw new Error('Storage denied') })
    expect(loadGraphics(storage).error).toBeTruthy()
    expect(warning).toHaveBeenCalledTimes(6)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})

function clock() {
  let now = 0
  let id = 0
  const queued = new Map<number, (time: number) => void>()
  return {
    now: () => now,
    request: (callback: (time: number) => void) => { queued.set(++id, callback); return id },
    cancel: (key: number) => { queued.delete(key) },
    pending: () => queued.size,
    advance: (time: number) => {
      now = time
      const callbacks = [...queued.values()]
      queued.clear()
      callbacks.forEach((callback) => callback(time))
    },
  }
}

describe('demand-driven frame scheduling', () => {
  it.each([60, 90, 120, 144])('caps work at 30 FPS on a %i Hz screen without changing elapsed tool time', (hz) => {
    const time = clock()
    const frames: number[] = []
    let elapsed = 0
    const loop = new FrameLoop(time, (now, seconds) => { frames.push(now); elapsed += seconds; return true })
    loop.configure(true, 30)
    loop.start()
    for (let frame = 1; frame <= hz * 2; frame++) time.advance(frame * 1000 / hz)
    expect(frames).toHaveLength(60)
    expect(elapsed).toBeCloseTo(2, 5)
    expect(time.pending()).toBe(1)
    loop.stop()
    expect(time.pending()).toBe(0)
  })

  it('supports 60 FPS, pauses entirely, then resumes without hidden time or catch-up bursts', () => {
    const time = clock()
    const draw = vi.fn(() => true)
    const loop = new FrameLoop(time, draw)
    loop.start()
    for (let i = 1; i <= 120; i++) time.advance(i * 1000 / 120)
    expect(draw).toHaveBeenCalledTimes(60)
    loop.configure(false, 60)
    expect(time.pending()).toBe(0)
    time.advance(60000)
    loop.start()
    expect(time.pending()).toBe(0)
    loop.configure(true, 30)
    time.advance(60034)
    expect(draw).toHaveBeenLastCalledWith(60034, 0.034)
    expect(draw).toHaveBeenCalledTimes(61)
    time.advance(65000)
    expect(draw).toHaveBeenCalledTimes(62)
    expect(time.pending()).toBe(1)
  })

  it('stops at rest and does not schedule duplicate frames when input wakes motion inside a frame', () => {
    const time = clock()
    let count = 0
    const loop = new FrameLoop(time, () => { loop.start(); return ++count < 2 })
    loop.start()
    loop.start()
    time.advance(17)
    expect(time.pending()).toBe(1)
    time.advance(34)
    expect(count).toBe(2)
    expect(time.pending()).toBe(0)
  })
})
