export class SalonAudio {
  private context: AudioContext | null = null
  private lastNote = 0

  async play(): Promise<void> {
    if (typeof AudioContext === 'undefined') throw new Error('This browser does not support Web Audio.')
    this.context ??= new AudioContext()
    const context = this.context
    if (context.state === 'suspended') await context.resume()
    if (context.currentTime - this.lastNote < 0.09) return
    this.lastNote = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(520, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(780, context.currentTime + 0.09)
    gain.gain.setValueAtTime(0, context.currentTime)
    gain.gain.linearRampToValueAtTime(0.055, context.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.18)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  }

  async dispose(): Promise<void> {
    const context = this.context
    this.context = null
    if (context && context.state !== 'closed') await context.close()
  }
}
