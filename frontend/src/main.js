import './index.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// A browser can restore this page from bfcache on Back/Forward instead of
// re-running the app - that would show whatever was in memory (including a
// logged-in view) without re-checking the server session at all. Forcing a
// real reload on a bfcache restore makes the router guard re-run against
// the server's actual (possibly now logged-out) session.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload()
  }
})

// After a new deploy the hashed JS/CSS chunks of the previous build are gone
// from the server, but an already-open tab still points at them - the next
// lazy route import then fails and the page renders blank or half-drawn.
// Reload once to pick up the current build; the sessionStorage flag stops
// this from ever looping if the failure is something other than a stale
// build.
function reloadOnceForStaleBuild() {
  try {
    if (sessionStorage.getItem('stale-build-reload')) return
    sessionStorage.setItem('stale-build-reload', '1')
  } catch {
    return
  }
  window.location.reload()
}
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForStaleBuild()
})
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem('stale-build-reload')
    } catch {
      /* ignore */
    }
  }, 5000)
})

let app = createApp(App)

router.onError((error, to) => {
  const message = String(error?.message || error)
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)) {
    reloadOnceForStaleBuild()
  } else {
    console.error('Navigation error', to?.fullPath, error)
  }
})
app.config.errorHandler = (error, instance, info) => {
  console.error('Render error', info, error)
}
app.use(router)
app.mount('#app')
