<template>
  <Dialog v-model="isOpen" :options="{ size: '4xl', title: 'Partners with 85%+ Disbursement Utilization' }">
    <template #body-content>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
        <div class="flex items-center gap-2 text-sm">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
            <LucideIcon name="award" class="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </span>
          <span class="font-semibold text-green-600 dark:text-green-400">{{ filteredRows.length }} qualifying partners</span>
        </div>
        <Button variant="outline" size="sm" icon-left="lucide-download" :loading="exporting" aria-label="Export Excel" @click="handleExport('xlsx')">
          <span class="max-sm:hidden">Export Excel</span>
        </Button>
      </div>

      <ErrorMessage class="mt-3" :message="exportError" />

      <div class="mt-3 max-w-xs">
        <TextInput v-model="searchQuery" type="text" placeholder="Search partners...">
          <template #prefix>
            <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
          </template>
        </TextInput>
      </div>

      <div class="mt-3 max-h-[65vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-max text-left text-sm">
          <thead class="sticky top-0 z-10 bg-green-50 text-xs uppercase text-gray-500 dark:bg-green-900/30 dark:text-gray-400">
            <tr>
              <th class="px-3 py-2 font-medium">Partner</th>
              <th class="px-3 py-2 text-right font-medium text-cyan-600 dark:text-cyan-400">Disbursement</th>
              <th class="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">Utilisation</th>
              <th class="px-3 py-2 text-right font-medium">Util %</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="!filteredRows.length">
              <td colspan="4" class="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                {{ searchQuery ? `No results for '${searchQuery}'` : 'No partners meet this threshold.' }}
              </td>
            </tr>
            <tr v-for="p in filteredRows" :key="p.partner_id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{{ p.partner_name }}</td>
              <td class="px-3 py-2 text-right font-medium text-cyan-700 dark:text-cyan-400">{{ formatInr(p.total_disbursement) }}</td>
              <td class="px-3 py-2 text-right font-medium text-green-700 dark:text-green-400">{{ formatInr(p.total_utilisation) }}</td>
              <td class="px-3 py-2 text-right">
                <span class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <LucideIcon name="check" class="h-3 w-3" />{{ formatPct(p.pct) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import { Dialog, Button, ErrorMessage, TextInput } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { formatInr, formatPct } from '@/composables/useDashboardFormat'
import { useTableExport } from '@/composables/useTableExport'
import { useTableSearch } from '@/composables/useTableSearch'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  partners: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const rows = computed(() =>
  props.partners
    .filter((p) => p.total_disbursement > 0 && p.total_utilisation / p.total_disbursement >= 0.85)
    .map((p) => ({ ...p, pct: (p.total_utilisation / p.total_disbursement) * 100 }))
    .sort((a, b) => b.pct - a.pct),
)

const { searchQuery, filteredRows } = useTableSearch(rows, ['partner_name'])
watch(isOpen, (open) => {
  if (open) searchQuery.value = ''
})

const { exporting, error: exportError, exportTable } = useTableExport()

function handleExport(format) {
  const columns = [
    { label: 'Partner', key: 'partner_name', align: 'left' },
    { label: 'Disbursement', key: 'total_disbursement', align: 'right' },
    { label: 'Utilisation', key: 'total_utilisation', align: 'right' },
    { label: 'Util %', key: 'pct', align: 'right' },
  ]
  const data = filteredRows.value.map((p) => ({
    partner_name: p.partner_name,
    total_disbursement: p.total_disbursement,
    total_utilisation: p.total_utilisation,
    pct: p.pct.toFixed(1),
  }))
  exportTable('Partners with 85%+ Disbursement Utilization', columns, data, format)
}
</script>
