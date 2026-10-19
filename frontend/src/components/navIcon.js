import { h } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'

/**
 * Sidebar/SidebarHeader render `icon` via <component :is="icon" class="..." />
 * with no other props passed through, so a plain icon *name* string can't be
 * used directly - SidebarItem treats a bare string as literal text, not an
 * icon lookup (see its own template). This returns a tiny component per
 * Lucide icon name, wrapping LucideIcon.vue (see that file's own docstring
 * for why icons render from raw SVG rather than frappe-ui's `lucide-<name>`
 * Tailwind classes - the short version: a name only known at runtime, like
 * every name this function is ever called with, never gets a compiled CSS
 * rule from Tailwind's build-time class scanner).
 */
export default function navIcon(name) {
  return {
    render() {
      // Sidebar passes its own sizing classes (h-4 w-4 etc.) via `class` on
      // the component - merged automatically by Vue since this is the
      // component's single root node.
      return h(LucideIcon, { name })
    },
  }
}
