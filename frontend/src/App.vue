<template>
  <FrappeUIProvider>
    <router-view v-slot="{ Component, route }">
      <!-- Keyed by full path for routes whose data loading depends on a
      route param (e.g. a report/:name page) - otherwise Vue Router reuses
      the same component instance across param changes and the page's
      setup-time data fetch never re-runs. -->
      <component
        :is="Component"
        :key="route.meta.remountOnParamChange ? route.fullPath : route.name"
      />
    </router-view>
  </FrappeUIProvider>
</template>

<script setup>
import { FrappeUIProvider } from 'frappe-ui'
import '@/data/session'
import '@/data/theme'
import '@/data/branding'
</script>
