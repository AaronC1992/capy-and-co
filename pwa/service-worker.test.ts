import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const scope = 'https://example.test/capy-and-co/'
const source = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')
const files = ['index.html', 'assets/main.js', 'assets/gallery.js', 'icon-192.png']

function worker() {
  const listeners = new Map<string, (event: object) => void>()
  const cache = { addAll: vi.fn(async (_requests: Request[]) => {}), match: vi.fn(async (_key: string) => new Response('cached release')), put: vi.fn(async () => {}) }
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['capy-and-co:/capy-and-co/:old', 'capy-and-co:/capy-and-co/:test', 'capy-and-co:/another-game/:old', 'unrelated-cache']),
    delete: vi.fn(async (_key: string) => true),
  }
  const fetch = vi.fn(async () => new Response('network'))
  const claim = vi.fn(async () => {})
  runInNewContext(source.replace('__VERSION__', '"test"').replace('__FILES__', JSON.stringify(files)), {
    self: { registration: { scope }, clients: { claim }, addEventListener: (type: string, handler: (event: object) => void) => listeners.set(type, handler) },
    caches, fetch, URL, Request, Response,
  })
  function lifecycle(type: string) {
    let waiting: Promise<unknown> | undefined
    listeners.get(type)!({ waitUntil: (promise: Promise<unknown>) => { waiting = promise } })
    return waiting
  }
  function request(url: string, mode = 'cors', method = 'GET') {
    let response: Promise<Response> | undefined
    listeners.get('fetch')!({ request: { url, mode, method }, respondWith: (promise: Promise<Response>) => { response = promise } })
    return response
  }
  return { cache, caches, fetch, claim, lifecycle, request }
}

describe('offline release caching', () => {
  it('provides real PNGs matching the installation manifest and an Apple touch icon', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
    for (const icon of [...manifest.icons, { src: 'apple-touch-icon.png', sizes: '180x180' }]) {
      const png = readFileSync(new URL(`../public/${icon.src}`, import.meta.url))
      expect(png.subarray(1, 4).toString()).toBe('PNG')
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes)
    }
  })
  it('precaches the full release, including unopened lazy screens, and rejects incomplete installs', async () => {
    const sw = worker()
    await sw.lifecycle('install')
    const requests = sw.cache.addAll.mock.calls[0][0]
    expect(requests.map((request) => request.url)).toEqual(files.map((file) => scope + file))
    expect(requests.every((request) => request.cache === 'reload')).toBe(true)
    sw.cache.addAll.mockRejectedValueOnce(new Error('Offline'))
    await expect(sw.lifecycle('install')).rejects.toThrow('Offline')
  })

  it('only cleans old caches belonging to this installation scope', async () => {
    const sw = worker()
    await sw.lifecycle('activate')
    expect(sw.caches.delete.mock.calls).toEqual([['capy-and-co:/capy-and-co/:old']])
    expect(sw.claim).toHaveBeenCalledOnce()
  })

  it('uses a consistent cached shell for root, index and query launches without catching other apps or unknown routes', async () => {
    const sw = worker()
    for (const url of [scope, scope + 'index.html', scope + '?installed=1']) {
      expect(await (await sw.request(url, 'navigate'))?.text()).toBe('cached release')
      expect(sw.cache.match).toHaveBeenLastCalledWith(scope + 'index.html')
    }
    expect(await (await sw.request(scope + 'assets/gallery.js'))?.text()).toBe('cached release')
    expect(sw.fetch).not.toHaveBeenCalled()
    for (const url of ['https://other.test/asset.png', 'https://example.test/another-game/', scope + 'missing-page']) {
      expect(sw.request(url, 'navigate')).toBeUndefined()
    }
    expect(sw.request(scope, 'navigate', 'POST')).toBeUndefined()
  })
})
