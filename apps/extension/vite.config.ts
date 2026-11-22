import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // Shared .env lives at the repo root's apps/extension/.env.local
  build: { outDir: 'dist', emptyOutDir: true },
  server: { cors: { origin: [/chrome-extension:\/\//] } },
})
