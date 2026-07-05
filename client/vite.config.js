import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// CAPACITOR_BUILD=1 skips service worker generation — SW caching/update
// semantics don't apply reliably inside Capacitor's wrapped WebView.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1';

export default defineConfig({
  plugins: [
    react(),
    !isCapacitorBuild && VitePWA({
      registerType: 'autoUpdate',
      // Use manifest.json (not .webmanifest) for widest iOS Safari compatibility
      manifestFilename: 'manifest.json',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Prudence: AI for Productivity',
        short_name: 'Prudence',
        description: 'Prudence: AI for Productivity — your personal goal coach',
        theme_color: '#EC8B43',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
