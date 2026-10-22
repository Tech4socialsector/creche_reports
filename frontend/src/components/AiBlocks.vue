<template>
  <!-- Tables and charts the assistant put into a chat reply. Drawn here with plain SVG/HTML: nothing is
  loaded from outside, and it works offline. -->
  <div class="mt-2 space-y-3">
    <section
      v-for="(block, i) in blocks"
      :key="i"
      class="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-white"
    >
      <header class="flex items-center justify-between gap-2 border-b border-outline-gray-1 bg-surface-gray-1 px-3 py-2">
        <!-- No generic "Table"/"Chart" fallback label - that's not information,
        just noise, when the model didn't give it a real title. The action
        buttons alone (still right-aligned via justify-between/ml-auto on an
        empty title slot) are enough chrome for an untitled block. -->
        <h3 v-if="block.title" class="min-w-0 truncate text-sm font-semibold text-ink-gray-9">{{ block.title }}</h3>
        <span v-else />
        <div class="flex flex-shrink-0 items-center gap-1">
          <Tooltip text="Download as CSV">
            <Button variant="ghost" size="sm" icon="lucide-download" @click="downloadCsv(block)" />
          </Tooltip>
          <Tooltip v-if="block.type === 'chart'" :text="showData[i] ? 'Hide values' : 'Show values'">
            <Button variant="ghost" size="sm" :icon="showData[i] ? 'lucide-bar-chart-2' : 'lucide-table'" @click="showData[i] = !showData[i]" />
          </Tooltip>
        </div>
      </header>

      <!-- Table -->
      <div v-if="block.type === 'table'" class="max-h-96 overflow-auto">
        <table class="w-full min-w-max border-collapse text-left text-sm">
          <thead class="sticky top-0 bg-surface-gray-1 text-xs uppercase tracking-wide text-ink-gray-6">
            <tr>
              <th v-for="(column, c) in block.columns" :key="c" class="whitespace-nowrap px-3 py-2 font-medium">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in block.rows" :key="r" class="border-t border-outline-gray-1 odd:bg-surface-white even:bg-surface-gray-1/50">
              <td v-for="(cell, c) in row" :key="c" class="px-3 py-1.5 align-top text-ink-gray-8">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Chart -->
      <div v-else class="p-3">
        <div v-if="showData[i]" class="max-h-72 overflow-auto">
          <table class="w-full min-w-max border-collapse text-left text-sm">
            <thead class="text-xs uppercase tracking-wide text-ink-gray-6">
              <tr>
                <th class="px-2 py-1.5 font-medium">&nbsp;</th>
                <th v-for="s in block.series" :key="s.name" class="px-2 py-1.5 font-medium">{{ s.name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(label, l) in block.labels" :key="l" class="border-t border-outline-gray-1">
                <td class="px-2 py-1.5 text-ink-gray-8">{{ label }}</td>
                <td v-for="s in block.series" :key="s.name" class="px-2 py-1.5 tabular-nums text-ink-gray-8">{{ fmt(s.data[l]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bars: one row per label, one thin bar per series -->
        <div v-else-if="block.chart === 'bar'" class="space-y-2.5" role="img" :aria-label="block.title">
          <div v-for="(label, l) in block.labels" :key="l">
            <div class="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
              <span class="min-w-0 truncate text-ink-gray-7" :title="label">{{ label }}</span>
              <span v-if="block.series.length === 1" class="flex-shrink-0 font-medium tabular-nums text-ink-gray-9">{{ fmt(block.series[0].data[l]) }}<span v-if="block.unit" class="ml-1 font-normal text-ink-gray-5">{{ block.unit }}</span></span>
            </div>
            <div v-for="(s, k) in block.series" :key="s.name" class="mb-0.5 flex items-center gap-2">
              <div class="h-3 flex-1 overflow-hidden rounded bg-surface-gray-2">
                <div class="h-full rounded" :style="{ width: barWidth(block, s.data[l]), background: color(k) }" />
              </div>
              <span v-if="block.series.length > 1" class="w-12 flex-shrink-0 text-right text-xs tabular-nums text-ink-gray-7">{{ fmt(s.data[l]) }}</span>
            </div>
          </div>
        </div>

        <!-- Lines -->
        <svg v-else-if="block.chart === 'line'" viewBox="0 0 320 170" class="mx-auto w-full max-w-lg" role="img" :aria-label="block.title">
          <g v-for="t in 3" :key="t">
            <line x1="34" :y1="gridY(t - 1)" x2="312" :y2="gridY(t - 1)" class="stroke-outline-gray-2" stroke-width="1" />
            <text x="30" :y="gridY(t - 1) + 3" text-anchor="end" class="fill-ink-gray-5" font-size="9">{{ fmt(lineMax(block) * (1 - (t - 1) / 2)) }}</text>
          </g>
          <g v-for="(s, k) in block.series" :key="s.name">
            <polyline :points="linePoints(block, s)" fill="none" :stroke="color(k)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            <circle v-for="(v, l) in s.data" :key="l" :cx="lineX(block, l)" :cy="lineY(block, v)" r="3" :fill="color(k)">
              <title>{{ s.name }} - {{ block.labels[l] }}: {{ fmt(v) }}</title>
            </circle>
          </g>
          <text v-for="(label, l) in block.labels" v-show="labelShown(block, l)" :key="l" :x="lineX(block, l)" y="164" text-anchor="middle" class="fill-ink-gray-6" font-size="9">{{ shorten(label, 9) }}</text>
        </svg>

        <!-- Pie / donut -->
        <div v-else class="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center">
          <svg viewBox="0 0 42 42" class="h-40 w-40 flex-shrink-0 -rotate-90" role="img" :aria-label="block.title">
            <circle cx="21" cy="21" r="15.9155" fill="none" class="stroke-surface-gray-2" stroke-width="7" />
            <circle
              v-for="(slice, k) in slices(block)"
              :key="k"
              cx="21" cy="21" r="15.9155" fill="none"
              :stroke="color(k)"
              :stroke-width="block.chart === 'pie' ? 15.9 : 7"
              :stroke-dasharray="`${slice.pct} ${100 - slice.pct}`"
              :stroke-dashoffset="-slice.start"
            >
              <title>{{ slice.label }}: {{ fmt(slice.value) }} ({{ slice.pct.toFixed(0) }}%)</title>
            </circle>
          </svg>
          <ul class="min-w-0 space-y-1 text-sm">
            <li v-for="(slice, k) in slices(block)" :key="k" class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :style="{ background: color(k) }" />
              <span class="min-w-0 truncate text-ink-gray-8" :title="slice.label">{{ slice.label }}</span>
              <span class="ml-auto flex-shrink-0 pl-3 tabular-nums text-ink-gray-7">{{ fmt(slice.value) }} <span class="text-ink-gray-5">({{ slice.pct.toFixed(0) }}%)</span></span>
            </li>
          </ul>
        </div>

        <!-- Legend for several series -->
        <div v-if="!showData[i] && block.series.length > 1 && block.chart !== 'pie' && block.chart !== 'donut'" class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-gray-7">
          <span v-for="(s, k) in block.series" :key="s.name" class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full" :style="{ background: color(k) }" />{{ s.name }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { Button, Tooltip } from 'frappe-ui'

defineProps({ blocks: { type: Array, default: () => [] } })

const showData = reactive({})
const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6']
const color = (k) => PALETTE[k % PALETTE.length]
const fmt = (v) => (v == null ? '' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }))
const shorten = (text, n) => (String(text).length > n ? `${String(text).slice(0, n - 1)}…` : String(text))

// --- bars
const maxValue = (block) => Math.max(1, ...block.series.flatMap((s) => s.data.map((v) => Math.abs(v))))
const barWidth = (block, v) => `${Math.max(0, (Math.abs(v) / maxValue(block)) * 100)}%`

// --- lines (viewBox 320 x 170; plot area x 34..312, y 10..150)
const lineMax = (block) => Math.max(1, ...block.series.flatMap((s) => s.data))
const gridY = (i) => 10 + i * 70
const lineX = (block, l) => (block.labels.length === 1 ? 173 : 34 + (l * 278) / (block.labels.length - 1))
const lineY = (block, v) => 150 - (Math.max(0, v) / lineMax(block)) * 140
const linePoints = (block, s) => s.data.map((v, l) => `${lineX(block, l)},${lineY(block, v)}`).join(' ')
const labelShown = (block, l) => block.labels.length <= 8 || l % Math.ceil(block.labels.length / 8) === 0

// --- pie / donut: slices as percentages of the circumference (the circle has a circumference of 100)
function slices(block) {
  const data = block.series[0]?.data || []
  const total = data.reduce((a, b) => a + Math.max(0, b), 0) || 1
  let start = 0
  return data.map((value, l) => {
    const pct = (Math.max(0, value) / total) * 100
    const slice = { label: block.labels[l], value, pct, start }
    start += pct
    return slice
  })
}

// --- download
function csvCell(value) {
  const text = String(value ?? '')
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text // a spreadsheet must not run it as a formula
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
function downloadCsv(block) {
  const rows =
    block.type === 'table'
      ? [block.columns, ...block.rows]
      : [['', ...block.series.map((s) => s.name)], ...block.labels.map((label, l) => [label, ...block.series.map((s) => s.data[l])])]
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${(block.title || 'assistant').replace(/[^\w\-]+/g, '-')}.csv` })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
