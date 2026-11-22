import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'WordCatch',
  version: '0.1.0',
  description: 'Alt+click any word while you read or watch. On-device AI files it; cloud AI helps you actually use it.',
  action: { default_title: 'Open WordCatch' },
  side_panel: { default_path: 'sidepanel.html' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [
    { matches: ['<all_urls>'], js: ['src/content/index.ts'], run_at: 'document_idle', all_frames: false },
  ],
  permissions: ['sidePanel', 'storage', 'identity'],
  commands: {
    _execute_action: { suggested_key: { default: 'Alt+W' }, description: 'Open WordCatch' },
  },
})
