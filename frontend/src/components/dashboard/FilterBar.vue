<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Partner</label>
      <MultiSelect
        v-model="filters.partner_id"
        :options="partnerOptions"
        :loading="loadingPartnerOptions"
        placeholder="All partners"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Budget Reference</label>
      <MultiSelect
        v-model="filters.budget_ref"
        :options="budgetRefOptions"
        :loading="dependentOptionsLoading"
        placeholder="All budgets"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Grant ID</label>
      <MultiSelect
        v-model="filters.grant_id"
        :options="grantIdOptions"
        :loading="dependentOptionsLoading"
        placeholder="All grants"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Budget Status</label>
      <MultiSelect
        v-model="filters.budget_status"
        :options="budgetStatusOptions"
        placeholder="All statuses"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
      <MultiSelect
        v-model="filters.state"
        :options="stateOptions"
        :loading="dependentOptionsLoading"
        placeholder="All states"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">District</label>
      <MultiSelect
        v-model="filters.district"
        :options="districtOptions"
        :loading="dependentOptionsLoading"
        placeholder="All districts"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Block</label>
      <MultiSelect
        v-model="filters.block"
        :options="blockOptions"
        :loading="dependentOptionsLoading"
        placeholder="All blocks"
        class="w-full"
      />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Start Date</label>
      <DatePicker v-model="filters.start_date" placeholder="Select date" class="w-full" />
    </div>
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">End Date</label>
      <DatePicker v-model="filters.end_date" placeholder="Select date" class="w-full" />
    </div>
  </div>
</template>

<script setup>
import { DatePicker, MultiSelect } from 'frappe-ui'

defineProps({
  filters: { type: Object, required: true },
  partnerOptions: { type: Array, default: () => [] },
  loadingPartnerOptions: { type: Boolean, default: false },
  budgetRefOptions: { type: Array, default: () => [] },
  grantIdOptions: { type: Array, default: () => [] },
  budgetStatusOptions: { type: Array, default: () => [] },
  stateOptions: { type: Array, default: () => [] },
  districtOptions: { type: Array, default: () => [] },
  blockOptions: { type: Array, default: () => [] },
  dependentOptionsLoading: { type: Boolean, default: false },
})
</script>
