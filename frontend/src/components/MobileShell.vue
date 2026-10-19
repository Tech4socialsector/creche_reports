<template>
  <div class="fixed inset-0 flex flex-col bg-gray-50 pt-[env(safe-area-inset-top)] dark:bg-gray-900">
    <div class="flex flex-shrink-0 items-center gap-2 border-b bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
      <!-- The top-left hamburger used to duplicate MobileNav's own "Menu"
      bottom-tab (same drawer, same openMobileMenu trigger) - removed as
      redundant now that Menu is one tap away in the bottom bar. -->
      <Button v-if="canGoBack" variant="ghost" size="sm" icon="lucide-arrow-left" aria-label="Back" class="-ml-1 flex-shrink-0" @click="goBack" />
      <router-link v-if="!canGoBack" :to="{ name: 'Dashboard' }" class="-ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center" aria-label="Dashboard">
        <LucideIcon name="house" class="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </router-link>
      <h1 class="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
        {{ pageTitle || routeLabel }}
      </h1>
      <Button
        variant="ghost"
        :icon="theme === 'dark' ? 'lucide-moon' : 'lucide-sun'"
        aria-label="Switch theme"
        @click="theme = theme === 'dark' ? 'light' : 'dark'"
      />
    </div>

    <main class="flex-1 overflow-y-auto px-4 py-4 pb-20">
      <slot />
    </main>

    <MobileNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import MobileNav from '@/components/MobileNav.vue'
import { pageTitle } from '@/data/pageTitle'
import { currentTheme } from '@/data/theme'

const route = useRoute()
const router = useRouter()
const canGoBack = computed(() => route.name !== 'Dashboard')

// One step back through the app's own history; if this page was opened
// directly (a bookmark, a link), there is none, so go to the Dashboard
// (the app's only landing page) instead of leaving the app.
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'Dashboard' })
}

const theme = computed({
  get: () => currentTheme.value,
  set: (v) => (currentTheme.value = v),
})

// DoctypeList/DoctypeForm/DoctypeNew always set pageTitle themselves, so
// this fallback only ever needs the fixed, non-doctype routes - see
// router.js's beforeEach for where pageTitle gets reset between pages.
const ROUTE_LABELS = { Dashboard: 'Dashboard' }
const routeLabel = computed(() => ROUTE_LABELS[route.name] || route.name || '')
</script>
