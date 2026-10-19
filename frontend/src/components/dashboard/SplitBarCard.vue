<template>
  <button
    type="button"
    class="flex w-full flex-col rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    @click="$emit('click')"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ title }}</p>
      <span class="text-base font-semibold" :style="{ color }">{{ pctLabel }}</span>
    </div>

    <div class="mt-2 flex h-6 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
      <div
        class="flex h-full items-center justify-center overflow-hidden text-[11px] font-medium text-white transition-all"
        :style="{ width: `${usedSegment}%`, backgroundColor: color }"
      >
        <span v-if="usedSegment > 18" class="truncate px-1.5">{{ formatInr(used) }}</span>
      </div>
      <div
        v-if="!overflow"
        class="flex h-full items-center justify-center overflow-hidden text-[11px] font-medium text-gray-500 dark:text-gray-400"
        :style="{ width: `${100 - usedSegment}%` }"
      >
        <span v-if="100 - usedSegment > 18" class="truncate px-1.5">{{ formatInr(remaining) }}</span>
      </div>
    </div>

    <!-- flex-wrap (not a fixed one-row justify-between) - at narrow widths
    with a larger formatted amount (e.g. "₹4.6 K"), forcing both "Used: X"
    and "Remaining: Y" onto one row left no room for either, so the second
    one wrapped mid-phrase instead of the two labels stacking cleanly. Each
    span also gets min-w-0 so its own text can truncate/wrap inside itself
    rather than forcing the row wider than its container. -->
    <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
      <span class="flex min-w-0 items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <span class="h-2 w-2 flex-shrink-0 rounded-full" :style="{ backgroundColor: color }" />
        <span class="truncate">Used: <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatInr(used) }}</span></span>
      </span>
      <span class="flex min-w-0 items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <span class="h-2 w-2 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span class="truncate">{{ overflow ? 'Over' : 'Remaining' }}: <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatInr(Math.abs(remaining)) }}</span></span>
      </span>
    </div>

    <p v-if="overflow" class="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
      ⚠ Exceeds {{ baseLabel.toLowerCase() }} by {{ formatInr(used - base) }}
    </p>
    <p v-else class="mt-2 text-xs text-gray-400 dark:text-gray-500">of {{ baseLabel }} ({{ formatInr(base) }})</p>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { formatInr } from '@/composables/useDashboardFormat'

const props = defineProps({
  title: { type: String, required: true },
  base: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  baseLabel: { type: String, required: true },
  color: { type: String, default: '#16a34a' },
})
defineEmits(['click'])

const pct = computed(() => (props.base ? (props.used / props.base) * 100 : 0))
const pctLabel = computed(() => `${pct.value.toFixed(1)}%`)
const overflow = computed(() => pct.value > 100)
const usedSegment = computed(() => Math.min(Math.max(pct.value, 0), 100))
const remaining = computed(() => props.base - props.used)
</script>
