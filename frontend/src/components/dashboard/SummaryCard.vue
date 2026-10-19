<template>
  <Tooltip :text="formatInrFull(value)">
    <button
      type="button"
      class="flex w-full flex-col rounded-xl border border-gray-200 bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      @click="$emit('click')"
    >
      <!-- items-start (not items-center) - a long label (e.g. "Partners with
      85%+ Disbursement Utilization") wraps to 2-3 lines on a narrow card,
      and center-aligning against that tall wrapped block left the icon
      floating awkwardly mid-block instead of sitting with the label's own
      first line, which is what items-start gives it. -->
      <span class="flex items-start gap-2">
        <span v-if="resolvedIcon" class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" :class="iconBgClass">
          <LucideIcon :name="resolvedIcon" class="h-5 w-5" :class="valueClass" />
        </span>
        <p class="pt-1 text-xs font-medium uppercase leading-snug tracking-wide text-gray-500 dark:text-gray-400">{{ label }}</p>
      </span>
      <p class="mt-0.5 text-xl font-semibold" :class="valueClass">{{ formatInr(value) }}</p>
      <p class="mt-0.5 text-[11px]" :class="subtitleClass">{{ subtitle }}</p>
    </button>
  </Tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { Tooltip } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { formatInr, formatInrFull, METRIC_THEME } from '@/composables/useDashboardFormat'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  subtitle: { type: String, default: '' },
  tone: { type: String, default: 'neutral' }, // neutral | good | warn | bad
  metric: { type: String, default: '' }, // optional METRIC_THEME key for the card's own identity color
  icon: { type: String, default: '' }, // overrides the metric's own icon, for cards with no currency metric
})
defineEmits(['click'])

// A card's own metric identity (budget/disbursement/utilisation/bank) wins
// for its headline number when given and the card is otherwise neutral -
// tone still overrides it (bad/warn/good always means something went off
// the rails, which matters more than brand color).
const valueClass = computed(() => {
  if (props.tone !== 'neutral') return accentTextClass.value
  return props.metric ? METRIC_THEME[props.metric]?.text || 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'
})

const iconBgClass = computed(() => {
  if (props.tone !== 'neutral') return accentBgClass.value
  return props.metric ? METRIC_THEME[props.metric]?.bg || 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800'
})

const resolvedIcon = computed(() => props.icon || (props.metric ? METRIC_THEME[props.metric]?.icon : ''))

const accentTextClass = computed(() => {
  return {
    good: 'text-green-700 dark:text-green-400',
    warn: 'text-amber-700 dark:text-amber-400',
    bad: 'text-red-700 dark:text-red-400',
  }[props.tone]
})
const accentBgClass = computed(() => {
  return {
    good: 'bg-green-100 dark:bg-green-900/40',
    warn: 'bg-amber-100 dark:bg-amber-900/40',
    bad: 'bg-red-100 dark:bg-red-900/40',
  }[props.tone]
})

const subtitleClass = computed(() => {
  return {
    good: 'text-green-600 dark:text-green-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }[props.tone]
})
</script>
