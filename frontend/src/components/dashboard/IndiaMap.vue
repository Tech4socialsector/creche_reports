<template>
  <div>
    <div v-if="loading" class="flex h-72 items-center justify-center">
      <Skeleton height="16rem" />
    </div>
    <div v-else-if="!svgMarkup" class="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      Map unavailable — showing data table below instead.
    </div>
    <div v-else class="relative">
      <div class="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <span class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: ACTIVE_COLOR }" />
          Working state ({{ activeCount }})
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: INACTIVE_COLOR }" />
          No activity
        </span>
      </div>
      <div
        ref="mapContainer"
        class="india-map mx-auto max-w-2xl"
        v-html="svgMarkup"
        @mouseover="onMouseOver"
        @mouseleave="onMouseLeave"
        @mousemove="onMouseMove"
      />
      <div
        v-if="hoveredState"
        class="pointer-events-none absolute z-10 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <p class="font-medium">{{ hoveredState }}</p>
        <p v-if="stateInfo(hoveredState)" class="text-teal-300">
          {{ stateInfo(hoveredState).partners }} partner(s), {{ stateInfo(hoveredState).budgets }} budget(s)
        </p>
        <p v-else class="text-gray-400">No activity in this state</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Skeleton from '@/components/Skeleton.vue'
// Vendored (not fetched live from a CDN at runtime) - this gets rendered via
// v-html below, so a compromised/MITM'd CDN response would have been stored
// XSS for every dashboard viewer. Bundling it at build time means its
// content is whatever this repo actually ships, not whatever a third party
// serves on a given day.
import indiaMapSvg from '@/assets/india-map.svg?raw'

const props = defineProps({
  stateData: { type: Object, default: () => ({}) }, // { "Karnataka": { partners: 2, budgets: 5 }, ... }
})

const loading = ref(true)
const svgMarkup = ref('')
const mapContainer = ref(null)
const hoveredState = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })

const ACTIVE_COLOR = '#0d9488'
const INACTIVE_COLOR = '#e5e7eb'
const activeCount = computed(() => Object.keys(props.stateData).length)

async function loadMap() {
  loading.value = true
  svgMarkup.value = indiaMapSvg
  // loading must flip to false (mounting the v-else branch that holds
  // mapContainer) and Vue must flush that DOM update before applyColors
  // can find any <path> to color - a raw setTimeout(0) here raced the
  // v-if/v-else swap and silently colored nothing, every time.
  loading.value = false
  await nextTick()
  applyColors()
}

// Short forms for states/UTs whose full name would overflow their own
// shape on a map this size - falls back to the full aria-label otherwise.
const SHORT_LABELS = {
  'Andaman and Nicobar Islands': 'A&N Islands',
  'Arunachal Pradesh': 'Arunachal Pr.',
  Chhattisgarh: 'Chhattisgarh',
  'Dadra and Nagar Haveli': 'D&N Haveli',
  'Daman and Diu': 'Daman & Diu',
  'Himachal Pradesh': 'H.P.',
  'Jammu and Kashmir': 'J&K',
  'Madhya Pradesh': 'M.P.',
  Maharashtra: 'Maharashtra',
  'NCT of Delhi': 'Delhi',
  'Uttar Pradesh': 'U.P.',
  'West Bengal': 'W. Bengal',
}

function applyColors() {
  const container = mapContainer.value
  if (!container) return
  const svg = container.querySelector('svg')
  const paths = container.querySelectorAll('path[aria-label]')

  // Remove any labels from a previous render (e.g. stateData changing)
  // before drawing fresh ones.
  container.querySelectorAll('.india-map-label').forEach((el) => el.remove())

  paths.forEach((path) => {
    const label = path.getAttribute('aria-label')
    const active = !!props.stateData[label]
    path.style.fill = active ? ACTIVE_COLOR : INACTIVE_COLOR
    path.style.stroke = '#fff'
    path.style.strokeWidth = '0.5'
    path.style.cursor = active ? 'pointer' : 'default'
    path.style.transition = 'opacity 0.15s'

    if (!svg) return
    let box
    try {
      box = path.getBBox()
    } catch (e) {
      return // a path with no renderable geometry yet (e.g. display:none) throws
    }
    // A shape too small on this viewBox can't fit readable text without
    // overlapping its neighbors - skip the label rather than draw noise.
    if (box.width * box.height < 20) return

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('class', 'india-map-label')
    text.setAttribute('x', box.x + box.width / 2)
    text.setAttribute('y', box.y + box.height / 2)
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'middle')
    text.setAttribute('font-size', Math.max(3, Math.min(7, Math.sqrt(box.width * box.height) / 6)))
    text.setAttribute('fill', active ? '#ffffff' : '#6b7280')
    text.setAttribute('stroke', active ? 'rgba(0,0,0,0.25)' : 'none')
    text.setAttribute('stroke-width', '0.3')
    text.setAttribute('paint-order', 'stroke')
    text.style.pointerEvents = 'none'
    text.style.fontWeight = active ? '600' : '400'
    text.textContent = SHORT_LABELS[label] || label
    svg.appendChild(text)
  })
}

function stateInfo(label) {
  return props.stateData[label]
}

function onMouseLeave() {
  hoveredState.value = null
  const container = mapContainer.value
  if (!container) return
  container.querySelectorAll('path[aria-label]').forEach((path) => {
    path.style.opacity = '1'
  })
}

function onMouseOver(e) {
  const label = e.target?.getAttribute?.('aria-label')
  hoveredState.value = label || null
  const container = mapContainer.value
  if (!container) return
  container.querySelectorAll('path[aria-label]').forEach((path) => {
    const isHovered = path.getAttribute('aria-label') === label
    const isActive = !!props.stateData[path.getAttribute('aria-label')]
    path.style.opacity = !label || isHovered ? '1' : isActive ? '0.55' : '1'
  })
}

function onMouseMove(e) {
  const rect = mapContainer.value.getBoundingClientRect()
  tooltipPos.value = { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 }
}

watch(() => props.stateData, applyColors, { deep: true })

onMounted(loadMap)
</script>

<style scoped>
.india-map :deep(svg) {
  width: 100%;
  height: auto;
}
</style>
