import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offlineGame } from './pwa/plugin.ts'

export default defineConfig({
  // Relative asset URLs let the same build work at the site root or under a GitHub Pages /repo-name/ path.
  base: './',
  plugins: [react(), offlineGame()],
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' },
})
