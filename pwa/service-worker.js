/* Build replaces these placeholders with the exact shell and chunk list for this release. */
const VERSION = __VERSION__
const FILES = __FILES__
const ROOT = self.registration.scope
const PREFIX = `capy-and-co:${new URL(ROOT).pathname}:`
const CACHE = PREFIX + VERSION
const URLS = FILES.map((file) => new URL(file, ROOT).href)

self.addEventListener('install', (event) => {
  // A failed/partial download must not replace the working offline release.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(URLS.map((url) => new Request(url, { cache: 'reload' })))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== new URL(ROOT).origin || !url.href.startsWith(ROOT)) return
  const shell = request.mode === 'navigate' && (url.pathname === new URL(ROOT).pathname || url.pathname === new URL('index.html', ROOT).pathname)
  const key = shell ? new URL('index.html', ROOT).href : url.href
  if (!URLS.includes(key)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(key)
    if (cached) return cached
    // Normally everything was precached. Repair an evicted entry only with a successful response.
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') await cache.put(key, response.clone())
    return response
  })())
})
