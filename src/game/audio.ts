import type { Tool } from './model'

// Every tool has its own little sound; the rest are for dressing up, taking pictures, the capybara being poked
// or tickled, and everything else.
export type Sound = Tool | 'pop' | 'shutter' | 'chime' | 'poke' | 'sneeze' | 'boing' | 'giggle'

// The shortest gap between two of the same sound, in seconds, so a held or dragged tool hums along instead of buzzing.
export const SOUND_GAPS: Record<Sound, number> = {
  brush: 0.12,
  comb: 0.1,
  snip: 0.14,
  grow: 0.22,
  curl: 0.3,
  soap: 0.16,
  wash: 0.3,
  blower: 0.36,
  color: 0.22,
  pop: 0.06,
  shutter: 0.3,
  chime: 0.09,
  poke: 0.12,
  sneeze: 0.9,
  boing: 0.15,
  giggle: 0.3,
}

// Growing hair climbs up a happy little scale.
const TWINKLE = [784, 880, 1047, 1175, 1319, 1568]

// A tone. Its pitch glides through each value in turn.
interface Note {
  at?: number
  type?: OscillatorType
  pitch: readonly number[]
  length: number
  volume: number
}

// A puff of filtered noise: swishes, snips, sprays and whooshes.
interface Rush {
  at?: number
  filter: BiquadFilterType
  pitch: readonly number[]
  q?: number
  length: number
  volume: number
}

function glide(param: AudioParam, pitch: readonly number[], start: number, length: number) {
  param.setValueAtTime(pitch[0], start)
  pitch.slice(1).forEach((value, step) => param.exponentialRampToValueAtTime(value, start + length * 0.8 * (step + 1) / (pitch.length - 1)))
}

export class SalonAudio {
  private context: AudioContext | null = null
  private noise: AudioBuffer | null = null
  private heard = new Map<Sound, number>()
  private step = 0

  async play(sound: Sound = 'chime'): Promise<void> {
    if (typeof AudioContext === 'undefined') throw new Error('This browser does not support Web Audio.')
    this.context ??= new AudioContext()
    const context = this.context
    if (context.state === 'suspended') await context.resume()
    if (this.context !== context) return
    const now = context.currentTime
    const last = this.heard.get(sound)
    if (last !== undefined && now - last < SOUND_GAPS[sound]) return
    this.heard.set(sound, now)
    this.step += 1
    this.voice(context, sound, now)
  }

  async dispose(): Promise<void> {
    const context = this.context
    this.context = null
    this.noise = null
    this.heard.clear()
    if (context && context.state !== 'closed') await context.close()
  }

  private voice(context: AudioContext, sound: Sound, now: number) {
    const note = (tone: Note) => this.note(context, now, tone)
    const rush = (puff: Rush) => this.rush(context, now, puff)
    switch (sound) {
      case 'brush':
        rush({ filter: 'bandpass', pitch: [1300, 2900], q: 0.8, length: 0.16, volume: 0.08 })
        break
      case 'comb':
        [0, 0.035, 0.07].forEach((at, tooth) => note({ at, type: 'triangle', pitch: [2300 + tooth * 260], length: 0.03, volume: 0.025 }))
        break
      case 'snip':
        rush({ filter: 'highpass', pitch: [3600], length: 0.035, volume: 0.12 })
        rush({ at: 0.075, filter: 'highpass', pitch: [3000], length: 0.04, volume: 0.14 })
        note({ at: 0.075, type: 'square', pitch: [1700, 900], length: 0.04, volume: 0.012 })
        break
      case 'grow': {
        const pitch = TWINKLE[this.step % TWINKLE.length]
        note({ pitch: [pitch], length: 0.2, volume: 0.035 })
        note({ at: 0.07, pitch: [pitch * 1.5], length: 0.18, volume: 0.02 })
        break
      }
      case 'curl':
        note({ type: 'triangle', pitch: [230, 640, 380, 520], length: 0.26, volume: 0.06 })
        break
      case 'soap':
        [0, 0.055, 0.1].forEach((at, bubble) => note({ at, pitch: [300 + (this.step + bubble) % 3 * 90, 900 + bubble * 150], length: 0.05, volume: 0.05 }))
        break
      case 'wash':
        rush({ filter: 'highpass', pitch: [2600, 3200], q: 0.5, length: 0.34, volume: 0.05 })
        break
      case 'blower':
        rush({ filter: 'lowpass', pitch: [350, 1300, 600], q: 1.5, length: 0.42, volume: 0.1 })
        break
      case 'color':
        note({ pitch: [660], length: 0.32, volume: 0.03 })
        note({ at: 0.06, pitch: [990], length: 0.3, volume: 0.025 })
        note({ at: 0.12, pitch: [1320], length: 0.28, volume: 0.02 })
        break
      case 'pop':
        note({ pitch: [360, 980], length: 0.08, volume: 0.08 })
        break
      case 'shutter':
        rush({ filter: 'highpass', pitch: [2000], length: 0.03, volume: 0.16 })
        rush({ at: 0.09, filter: 'bandpass', pitch: [1500], length: 0.05, volume: 0.12 })
        note({ at: 0.16, pitch: [1047], length: 0.25, volume: 0.03 })
        note({ at: 0.21, pitch: [1568], length: 0.3, volume: 0.025 })
        break
      case 'chime':
        note({ pitch: [520, 780], length: 0.16, volume: 0.055 })
        break
      case 'poke':
        note({ type: 'triangle', pitch: [880, 440], length: 0.12, volume: 0.07 })
        note({ at: 0.1, pitch: [660, 990], length: 0.1, volume: 0.04 })
        break
      case 'sneeze':
        // Ah... ah... choo!
        note({ type: 'triangle', pitch: [420, 560], length: 0.22, volume: 0.04 })
        note({ at: 0.24, type: 'triangle', pitch: [470, 680], length: 0.2, volume: 0.045 })
        rush({ at: 0.46, filter: 'bandpass', pitch: [2600, 900], q: 0.7, length: 0.28, volume: 0.16 })
        note({ at: 0.46, type: 'triangle', pitch: [620, 300], length: 0.2, volume: 0.04 })
        break
      case 'boing':
        note({ pitch: [140, 420, 220, 360, 260, 320], length: 0.45, volume: 0.09 })
        break
      case 'giggle':
        [0, 0.11, 0.22].forEach((at, hee) => note({ at, type: 'triangle', pitch: [1050 - hee * 60, 1350 - hee * 60, 1000 - hee * 60], length: 0.09, volume: 0.045 }))
        break
    }
  }

  private note(context: AudioContext, now: number, { at = 0, type = 'sine', pitch, length, volume }: Note) {
    const start = now + at
    const oscillator = context.createOscillator()
    oscillator.type = type
    glide(oscillator.frequency, pitch, start, length)
    this.envelope(context, oscillator, oscillator, start, length, volume, Math.min(0.015, length / 3))
  }

  private rush(context: AudioContext, now: number, { at = 0, filter, pitch, q = 1, length, volume }: Rush) {
    const start = now + at
    const source = context.createBufferSource()
    source.buffer = this.noise ??= whiteNoise(context)
    const band = context.createBiquadFilter()
    band.type = filter
    band.Q.value = q
    glide(band.frequency, pitch, start, length)
    source.connect(band)
    this.envelope(context, source, band, start, length, volume, length / 4)
  }

  // Fades a sound in and out, then lets go of its nodes once it has played.
  private envelope(context: AudioContext, source: AudioScheduledSourceNode, output: AudioNode, start: number, length: number, volume: number, attack: number) {
    const gain = context.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, start + length)
    output.connect(gain).connect(context.destination)
    source.start(start)
    source.stop(start + length + 0.02)
    source.onended = () => {
      source.disconnect()
      output.disconnect()
      gain.disconnect()
    }
  }
}

function whiteNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1
  return buffer
}