import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

const PUBLIC_FILES = ['favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']

export function offlineGame(): Plugin {
  return {
    name: 'capy-offline-game',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const hash = createHash('sha256')
      const files = Object.keys(bundle).filter((name) => !name.endsWith('.map')).sort()
      for (const file of files) {
        const entry = bundle[file]
        hash.update(file).update(entry.type === 'chunk' ? entry.code : entry.source)
      }
      for (const file of PUBLIC_FILES) {
        hash.update(file).update(readFileSync(new URL(`../public/${file}`, import.meta.url)))
      }
      const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')
      hash.update(template)
      const source = template
        .replace('__VERSION__', JSON.stringify(hash.digest('hex').slice(0, 20)))
        .replace('__FILES__', JSON.stringify([...files, ...PUBLIC_FILES]))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
