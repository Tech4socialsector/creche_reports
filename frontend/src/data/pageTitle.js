import { ref } from 'vue'

// A page sets this (e.g. in onMounted or a watcher on its loaded record) so
// Breadcrumbs/TopNavbar can show something more specific than the route's
// static name - e.g. a report's title once it's loaded.
export const pageTitle = ref('')
