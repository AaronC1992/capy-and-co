import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalonAudio, SOUND_GAPS } from './audio'
import type { Sound } from './audio'

class FakeParam {
  value = 0
  readonly steps: number[] = []
  setValueAtTime(value: number) { this.steps.push(Math.round(value)); return this }
  linearRampToValueAtTime() { return this }
  exponentialRampToValueAtTime(value: number) { this.steps.push(Math.round(value)); return this }
}

class FakeNode {
  connect<T>(node: T) { return node }
  disconnect() {}
}

// Writes down every sound source it starts, with what it sounds like, so a test can hear what was played.
class FakeAudioContext {
  static last: FakeAudioContext
  currentTime = 0
  state: AudioContextState = 'running'
  sampleRate = 100
  destination = new FakeNode()
  started: string[] = []
  constructor() { FakeAudioContext.last = this }
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }) }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: '', Q: new FakeParam(), frequency: new FakeParam() }) }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
  createOscillator() {
    const context = this
    return Object.assign(new FakeNode(), {
      type: '',
      frequency: new FakeParam(),
      onended: null,
      start(at: number) { context.started.push(`${this.type} tone ${this.frequency.steps.join('>')} at ${at.toFixed(3)}`) },
      stop() {},
    })
  }
  createBufferSource() {
    const context = this
    let band: { type: string; frequency: FakeParam } | null = null
    return Object.assign(new FakeNode(), {
      buffer: null,
      onended: null,
      connect<T>(node: T) { band = node as typeof band; return node },
      start(at: number) { context.started.push(`${band?.type} noise ${band?.frequency.steps.join('>')} at ${at.toFixed(3)}`) },
      stop() {},
    })
  }
  async resume() { this.state = 'running' }
  async close() { this.state = 'closed' }
}

const SOUNDS = Object.keys(SOUND_GAPS) as Sound[]

afterEach(() => vi.unstubAllGlobals())

describe('salon sounds', () => {
  it('gives every tool and every other moment a sound of its own', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const audio = new SalonAudio()
    const heard = new Map<Sound, string>()
    for (const sound of SOUNDS) {
      await audio.play(sound)
      const context = FakeAudioContext.last
      heard.set(sound, context.started.splice(0).join(' + '))
    }
    for (const sound of SOUNDS) expect(heard.get(sound), sound).not.toBe('')
    expect(new Set(heard.values()).size).toBe(SOUNDS.length)
    expect(heard.get('snip')).toContain('highpass noise')
    expect(heard.get('blower')).toContain('lowpass noise')
  })

  it('spaces out each sound so a held tool does not buzz, without holding up a different sound', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const audio = new SalonAudio()
    await audio.play('blower')
    const context = FakeAudioContext.last
    const whoosh = context.started.length
    expect(whoosh).toBeGreaterThan(0)
    context.currentTime = SOUND_GAPS.blower / 2
    await audio.play('blower')
    expect(context.started).toHaveLength(whoosh)
    await audio.play('pop')
    expect(context.started.length).toBeGreaterThan(whoosh)
    const played = context.started.length
    context.currentTime = SOUND_GAPS.blower
    await audio.play('blower')
    expect(context.started).toHaveLength(played + whoosh)
  })
})
