import { watch } from 'vue'

// Makes a mobile overlay (the hamburger drawer, the AI assistant dialog, any
// full-screen sheet) dismissible via the device's own back button/gesture,
// the way a native app screen would behave, instead of the back button
// falling through to the browser's real history and leaving the app (or
// landing on a previous route while the overlay stays visually open on top
// of it).
//
// How: opening the overlay pushes one extra, harmless history entry (same
// URL, just a marker) - this is the browser's own "back stack," no Vue
// Router route change involved, so nothing else about navigation ever sees
// it. The device back button then fires `popstate` for that entry first;
// if the overlay is still open when that happens, this closes it instead of
// letting the event do anything else. Closing the overlay by any OTHER means
// (an in-app close button, selecting an item) consumes that same history
// entry via history.back() so the stack doesn't grow by one every time the
// overlay opens - without this, a user bouncing an overlay open/closed
// repeatedly would need to presses back that many extra times to actually
// leave the page afterward.
export function useBackButtonClose(isOpen) {
  let consumedByUs = false

  function onPopState() {
    if (isOpen.value) {
      consumedByUs = true
      isOpen.value = false
    }
  }

  watch(isOpen, (open, wasOpen) => {
    if (open && !wasOpen) {
      window.history.pushState({ overlay: true }, '')
      window.addEventListener('popstate', onPopState)
    } else if (!open && wasOpen) {
      window.removeEventListener('popstate', onPopState)
      if (!consumedByUs) window.history.back()
      consumedByUs = false
    }
  })
}
