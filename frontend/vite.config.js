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
    // it's actually served from, so this one cannot control or cache the
    // app's real pages (that would need a backend route serving the SW
    // file from under /creche-reports/ with a Service-Worker-Allowed
    // header - out of scope for now). This setup is "installable PWA"
    // only: a home-screen icon, standalone window, and auto-updating
    // manifest/icons - not offline page caching. registerType: 'autoUpdate'
    // means a new deployed build replaces the cached one on next load
    // without the user needing to manually clear anything.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',
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
