import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import frappeui from 'frappe-ui/vite'
import Components from 'unplugin-vue-components/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    frappeui({
      frontendRoute: '/creche-reports',
      // no source maps in the shipped build
      buildConfig: { sourcemap: false },
    }),
    vue(),
    Components({
      dirs: ['src/components', 'src/pages'],
      dts: false,
    }),
    // frappeui's own buildConfig plugin (above) sets `base` to
    // /assets/creche_reports/frontend/ in production, but the app itself
    // only ever runs under /creche-reports/* - a different URL path
    // entirely. A service worker's scope can never exceed the directory
    // it's actually served from, so this one cannot control navigation to
    // the app's real pages (that would need a backend route serving the SW
    // file from under /creche-reports/ with a Service-Worker-Allowed
    // header - deliberately not worth the custom low-level plumbing for an
    // internal desk tool). What it CAN do, within its real
    // /assets/creche_reports/frontend/ scope: precache every build asset
    // (JS/CSS chunks, icons, manifest, and - per the workbox config below -
    // fonts) so a repeat visit's assets load from cache instead of the
    // network, and survive a brief connectivity blip. Combined with the web
    // app manifest, this still gives a home-screen icon and standalone
    // window too. registerType: 'autoUpdate' means a new deployed build
    // replaces the cached one on next load without the user needing to
    // manually clear anything.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',
      workbox: {
        // Default globPatterns misses font files, so the ~550KB Inter
        // variable-font pair (regular + italic) was refetched over the
        // network on every first visit per browser profile instead of
        // being precached like every other build asset already is.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        // A stale service worker left serving assets from a build that no
        // longer exists on disk (the previous deploy's JS/CSS chunk
        // filenames are content-hashed, so old ones are deleted on each
        // build) would otherwise keep accumulating in the Cache Storage
        // quota indefinitely across deploys.
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Creche Finance Reports',
        short_name: 'Creche Reports',
        description: 'Budgets, disbursement and utilisation reporting for Azim Premji Foundation creche partners.',
        start_url: '/creche-reports/dashboard',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-icons/icon-any-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icons/icon-any-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
