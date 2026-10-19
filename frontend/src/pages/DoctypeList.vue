<template>
  <AppLayout>
    <PageHeader>
      <template #actions>
        <!-- Doctype-specific one-off: Creche Caregiver Salary and Benefits
        gets an "Export Excel" button that calls a dedicated server-side
        report export (scope all/submitted), not the generic list this page
        otherwise renders for any doctype. Kept as a conditional inside this
        generic component rather than a separate page, matching how this
        file is the one place doctype-specific list-level behavior belongs. -->
        <Button
          v-if="isCaregiverSalaryDoctype"
          variant="outline"
          :loading="exporting"
          @click="showExportDialog = true"
        >
          <template #prefix>
            <LucideIcon name="download" class="h-4 w-4" />
          </template>
          Export Excel
        </Button>
        <Button
          v-if="metaResource.data && !isSingle"
          variant="solid"
          @click="goToNew"
        >
          <template #prefix>
            <LucideIcon name="plus" class="h-4 w-4" />
          </template>
          New
        </Button>
      </template>
    </PageHeader>

    <Dialog v-model="showExportDialog" :options="{ title: `Export ${doctype}` }">
      <template #body-content>
        <FormControl
          type="select"
          label="Export"
          v-model="exportScope"
          :options="[
            { label: 'All Records', value: 'all' },
            { label: 'Submitted Only', value: 'submitted' },
          ]"
        />
        <ErrorMessage class="mt-3" :message="exportError" />
      </template>
      <template #actions>
        <div class="flex w-full justify-end gap-2">
          <Button @click="showExportDialog = false">Cancel</Button>
          <Button variant="solid" :loading="exporting" @click="exportExcel">Export</Button>
        </div>
      </template>
    </Dialog>

    <div v-if="metaResource.loading && !metaResource.data" class="space-y-2">
      <Skeleton v-for="i in 5" :key="i" height="2.5rem" />
    </div>
    <ErrorMessage v-else-if="metaResource.error" :message="metaResource.error" />

    <!-- A Single doctype has exactly one document named after the doctype
    itself - there's no list to show at all, just a straight redirect into
    its one form. -->
    <template v-else-if="isSingle" />

    <template v-else-if="metaResource.data">
      <!-- Toolbar: refresh, Filter/Sort/Columns, always above the list on
      both desktop and mobile - desktop opens FilterEditor/SortEditor/the
      column picker in an anchored Popover, mobile opens Filter/Sort in a
      bottom sheet Dialog instead. All three write to state shared across
      the toolbar and the quick-filter row below. -->
      <div class="mb-4 flex items-center justify-between gap-2">
        <div class="quick-filters flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
          <div class="min-w-0 flex-1 sm:min-w-64 sm:max-w-xs sm:flex-none">
            <TextInput v-model="searchQuery" type="text" placeholder="Search by ID">
              <template #prefix>
                <LucideIcon name="search" class="h-4 w-4 text-ink-gray-5" />
              </template>
            </TextInput>
          </div>
          <template v-if="!isMobile">
            <div v-for="field in quickFilterFields" :key="field.fieldname" class="min-w-36 flex-shrink-0">
              <FormControl
                v-if="field.fieldtype === 'Select'"
                type="select"
                class="[&_[data-slot=trigger]]:w-full"
                :options="[{ label: field.label, value: '' }, ...selectOptions(field)]"
                v-model="quickFilters[field.fieldname]"
              />
              <FormControl
                v-else-if="field.fieldtype === 'Check'"
                type="select"
                class="[&_[data-slot=trigger]]:w-full"
                :options="[{ label: field.label, value: '' }, { label: 'Yes', value: '1' }, { label: 'No', value: '0' }]"
                v-model="quickFilters[field.fieldname]"
              />
              <FormControl v-else type="text" :placeholder="field.label" v-model="quickFilters[field.fieldname]" />
            </div>
          </template>
        </div>

        <div v-if="!isMobile" class="h-5 flex-shrink-0 border-s border-outline-gray-2" />

        <div class="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" icon="lucide-refresh-cw" tooltip="Refresh" :loading="pageResource.loading" @click="refreshList" />

          <template v-if="!isMobile">
            <Popover v-model:show="showFilterPopover" placement="bottom-end" popover-class="doctype-list-popover" :hide-on-blur="false">
              <template #target="{ togglePopover }">
                <Button variant="outline" icon-left="lucide-filter" label="Filter" data-toolbar-popover-trigger @click="togglePopover">
                  <template v-if="activeFilterCount" #suffix>
                    <span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-gray-7 px-1 text-2xs text-ink-white">
                      {{ activeFilterCount }}
                    </span>
                  </template>
                </Button>
              </template>
              <template #body-main>
                <div class="w-[26rem] max-w-[90vw] p-3">
                  <FilterEditor :fields="allFields" v-model="advancedFilters" />
                </div>
              </template>
            </Popover>

            <SortControl v-model="sortValue" v-model:show="showSortPopover" :fields="allFields" />
          </template>

          <template v-else>
            <span class="relative inline-flex">
              <Button variant="outline" icon="lucide-filter" tooltip="Filter" @click="showFilterSheet = true" />
              <span
                v-if="activeFilterCount"
                class="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-gray-7 px-1 text-2xs text-ink-white"
              >
                {{ activeFilterCount }}
              </span>
            </span>
            <Button variant="outline" icon="lucide-sliders" tooltip="Sort" @click="showSortSheet = true" />
          </template>

          <ColumnPicker v-model:show="showColumnsPopover" :prefs="columnPrefs" locked-label="ID" :compact="isMobile" />
        </div>
      </div>

      <Dialog v-model="showFilterSheet" :options="{ size: 'sm', title: 'filter-sheet' }">
        <template #body>
          <div class="filter-sheet-panel flex flex-col">
            <div class="flex h-12 flex-shrink-0 items-center justify-between border-b px-4 dark:border-gray-800">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Filter</h3>
              <Button variant="ghost" size="sm" icon="lucide-x" tooltip="Close" @click="showFilterSheet = false" />
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <FilterEditor :fields="allFields" v-model="advancedFilters" @update:model-value="showFilterSheet = false" />
            </div>
            <div class="flex flex-shrink-0 justify-end border-t px-4 py-3 dark:border-gray-800">
              <Button icon-left="lucide-x" @click="showFilterSheet = false" size="sm">Close</Button>
            </div>
          </div>
        </template>
      </Dialog>

      <Dialog v-model="showSortSheet" :options="{ size: 'sm', title: 'sort-sheet' }">
        <template #body>
          <div class="filter-sheet-panel flex flex-col">
            <div class="flex h-12 flex-shrink-0 items-center justify-between border-b px-4 dark:border-gray-800">
              <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Sort</h3>
              <Button variant="ghost" size="sm" icon="lucide-x" tooltip="Close" @click="showSortSheet = false" />
            </div>
            <div class="px-4 py-4">
              <SortEditor :fields="allFields" v-model="sortValue" />
            </div>
            <div class="flex justify-end gap-2 border-t px-4 py-3 dark:border-gray-800">
              <Button icon-left="lucide-x" @click="showSortSheet = false" size="sm">Close</Button>
              <Button variant="solid" icon-left="lucide-check" @click="showSortSheet = false" size="sm">Done</Button>
            </div>
          </div>
        </template>
      </Dialog>

      <Dialog
        v-model="showBulkDeleteConfirm"
        :options="{
          title: `Delete ${selectedNames.length} record${selectedNames.length === 1 ? '' : 's'}?`,
          message: 'This cannot be undone.',
          icon: { name: 'alert-triangle', appearance: 'danger' },
          actions: [
            { label: 'Delete', variant: 'solid', theme: 'red', onClick: doBulkDelete },
            { label: 'Cancel' },
          ],
        }"
      />

      <div v-if="pageResource.loading && !pageResource.data" class="space-y-2">
        <Skeleton v-for="i in 5" :key="i" height="2.5rem" />
      </div>
      <ErrorMessage v-else-if="listError" :message="listError" />
      <!-- No separate hand-built empty state here on desktop - ListView's
      own emptyState option covers that. Mobile has no such built-in (it's
      a plain card list, not ListView), so it keeps its own empty-state
      block just below. -->
      <div
        v-else-if="isMobile && allRows.length === 0"
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <LucideIcon name="inbox" class="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </span>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ hasActiveFilters ? 'No records match your filters.' : 'No records yet.' }}
        </p>
        <Button v-if="hasActiveFilters" variant="ghost" @click="clearAllFilters">
          Clear filters
        </Button>
        <Button v-else-if="metaResource.data" variant="outline" @click="goToNew">
          <template #prefix>
            <LucideIcon name="plus" class="h-4 w-4" />
          </template>
          Create the first one
        </Button>
      </div>

      <!-- Mobile: a table forces horizontal scrolling to see anything past
      the first column or two, which is awkward on a phone - each row
      becomes its own card instead, with the record's title/ID as the
      card's title and every in_list_view column shown as a label/value
      line below it. -->
      <div v-if="showResults && isMobile" class="space-y-2">
        <div
          v-for="row in allRows"
          :key="row.name"
          class="cursor-pointer overflow-hidden rounded-xl border bg-white p-3.5 shadow-sm transition-shadow active:shadow-none dark:border-gray-800 dark:bg-gray-900"
          :style="cardAccentStyle(row)"
          @click="goToRow(row.name)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="max-w-[60%] truncate rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {{ row.name }}
            </span>
            <div class="flex items-center gap-1.5">
              <span
                v-if="cardStatusColumn && row[cardStatusColumn.fieldname]"
                class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusBadgeClasses(row[cardStatusColumn.fieldname])"
              >
                {{ row[cardStatusColumn.fieldname] }}
              </span>
              <LucideIcon name="chevron-right" class="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
          <div
            v-if="cardTitle(row) !== row.name"
            class="mt-2 truncate text-base font-semibold text-gray-900 dark:text-gray-100"
          >
            {{ cardTitle(row) }}
          </div>
          <dl v-if="cardBodyColumnsFor(row).length" class="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div v-for="col in cardBodyColumnsFor(row)" :key="col.fieldname" class="min-w-0">
              <dt class="truncate text-xs text-gray-400 dark:text-gray-500">{{ col.label }}</dt>
              <dd class="truncate text-base text-gray-800 dark:text-gray-200">
                {{ formatValue(row[col.fieldname], col) || '-' }}
              </dd>
            </div>
          </dl>
          <p v-if="row.modified" class="mt-2.5 text-xs text-ink-gray-5" :title="fullDatetime(row.modified)">
            Updated {{ timeAgo(row.modified) }}{{ timeAgo(row.modified) === 'now' ? '' : ' ago' }}
          </p>
        </div>
      </div>

      <!-- Desktop: frappe-ui's own ListView/ListFooter. -->
      <div v-if="!isMobile" class="doctype-list-scroll mt-1" @scroll.passive="onListScroll">
      <ListView
        :key="gridKey"
        :columns="listViewColumns"
        :rows="allRows"
        row-key="name"
        :options="listViewOptions"
        @update:selections="(sel) => (selectedNames = Array.from(sel))"
      >
        <template #cell="{ column, row, item }">
          <ListRowItem :column="column" :row="row" :item="formatValue(item, column.docField)" v-slot="{ label }">
            <span
              v-if="isStatusLikeField(column.docField) && item"
              class="inline-flex items-center gap-1.5"
            >
              <span class="h-2 w-2 flex-shrink-0 rounded-full" :style="{ backgroundColor: statusBorderColor(item) }" />
              <span class="truncate text-base">{{ item }}</span>
            </span>
            <span
              v-else-if="column.key === 'modified'"
              class="truncate text-base text-ink-gray-6"
              :title="fullDatetime(row.modified)"
            >
              {{ timeAgo(row.modified) }}
            </span>
            <div v-else class="truncate text-base">{{ label }}</div>
          </ListRowItem>
        </template>
        <template #default="{ showGroupedRows, selectable }">
          <ListHeader />
          <template v-if="allRows.length">
            <ListGroups v-if="showGroupedRows" />
            <ListRows v-else />
          </template>
          <ListEmptyState v-else />
          <SelectionBar v-if="selectable" @delete="confirmBulkDelete" />
        </template>
      </ListView>
      </div>

      <!-- Row count, Load More and the page-size choice. -->
      <ListFooter
        v-if="showResults"
        class="mt-3"
        :model-value="pageSize"
        :options="{ rowCount: allRows.length, totalCount: totalCountResource.data ?? 0, pageLengthOptions: PAGE_SIZE_OPTIONS }"
        @update:model-value="setPageSize"
      >
        <template #right>
          <div class="flex items-center">
            <Button v-if="canLoadMore" variant="outline" size="sm" :loading="moreResource.loading" @click="loadMore">Load More</Button>
            <div v-if="canLoadMore" class="mx-3 h-5 border-s border-outline-gray-2" />
            <div class="flex items-center gap-1 text-base text-ink-gray-5">
              <div>{{ allRows.length }}</div>
              <div>of</div>
              <div>{{ totalCountResource.data ?? 0 }}</div>
            </div>
          </div>
        </template>
      </ListFooter>
    </template>
  </AppLayout>
</template>

<style>
/* The desktop list is about 15 rows tall: more rows scroll inside this box, not the whole page, and the
column headings stay in view. (Header 2.5rem + 15 rows of 2.57rem.) */
.doctype-list-scroll {
  max-height: 41rem;
  overflow: auto;
  overscroll-behavior: contain;
}
/* The list's own inner wrappers scroll too, which would stop the heading from sticking to this box */
.doctype-list-scroll > .relative.overflow-x-auto,
.doctype-list-scroll .flex.w-max.min-w-full {
  overflow: visible !important;
}
.doctype-list-scroll .mb-2.grid.rounded.bg-surface-gray-2 {
  position: sticky;
  top: 0;
  z-index: 5;
}

/* Same data-dialog hook pattern as ChildTable.vue's row editor - Filter/Sort
sheets are mobile-only bottom sheets, pinned to the bottom edge. */
[data-dialog='filter-sheet'].dialog-overlay,
[data-dialog='sort-sheet'].dialog-overlay {
  z-index: 1050;
}
[data-dialog='filter-sheet'].dialog-overlay > div,
[data-dialog='sort-sheet'].dialog-overlay > div {
  justify-content: flex-end;
  padding: 0;
}
[data-dialog='filter-sheet'] .dialog-content,
[data-dialog='sort-sheet'] .dialog-content {
  margin: 0;
  max-width: none;
  width: 100vw;
  border-radius: 1rem 1rem 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  animation: list-sheet-up 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes list-sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-dialog='filter-sheet'] .dialog-content,
  [data-dialog='sort-sheet'] .dialog-content {
    animation: none;
  }
}

/* Desktop's Filter/Sort Popover gets a visibly stronger shadow so it reads
clearly as floating above nearby page content. */
.doctype-list-popover > div {
  box-shadow: 0 12px 32px -8px rgb(15 23 42 / 0.22), 0 0 0 1px rgb(15 23 42 / 0.04);
}
:global(.dark) .doctype-list-popover > div {
  box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(255 255 255 / 0.06);
}

.filter-sheet-panel {
  width: 100%;
  max-height: 75vh;
}
</style>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import {
  useCall,
  call,
  Button,
  TextInput,
  Dialog,
  ErrorMessage,
  FormControl,
  ListView,
  ListHeader,
  ListRows,
  ListRowItem,
  ListGroups,
  ListEmptyState,
  ListFooter,
  Popover,
} from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterEditor from '@/components/FilterEditor.vue'
import SortEditor from '@/components/SortEditor.vue'
import SelectionBar from '@/components/SelectionBar.vue'
import ColumnPicker from '@/components/ColumnPicker.vue'
import SortControl from '@/components/SortControl.vue'
import { useColumnPrefs } from '@/composables/useColumnPrefs'
import Skeleton from '@/components/Skeleton.vue'
import { useMeta, useListFields, useFormFields } from '@/data/useMeta'
import { linkTitle, isTitledLink, ensureTitlesForRows } from '@/data/linkTitles'
import { pageTitle as pageTitleRef } from '@/data/pageTitle'
import { timeAgo, fullDatetime } from '@/utils/time'
import { isStatusLikeField, statusBadgeClasses, statusBorderColor } from '@/utils/statusColors'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const props = defineProps({
  doctype: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()

const metaResource = useMeta(props.doctype)
const isSingle = computed(() => !!metaResource.data?.issingle)
const columns = useListFields(metaResource)
// Every real field on the doctype, not just in_standard_filter ones - the
// "+ Add a Filter" row and the Columns picker both let a user explicitly
// pick any field.
const allFields = useFormFields(metaResource)

// A Single doctype has no list at all - go straight to its one document.
watch(
  () => isSingle.value,
  (single) => {
    if (single) router.replace({ name: 'DoctypeForm', params: { doctypeRoute: route.params.doctypeRoute, name: props.doctype } })
  },
  { immediate: true },
)

// Which of `columns` are actually shown, in both the desktop table and the
// mobile card view - defaults to all of them, narrowed via the Columns
// popover. Kept separate from `columns` itself (which still drives what
// fields are fetched from the server) so toggling visibility is instant and
// doesn't require a refetch.
const columnPrefs = useColumnPrefs({
  storageKey: `creche-reports-list-columns-${props.doctype}`,
  allFields,
  defaultColumns: columns,
})
const visibleColumns = columnPrefs.visibleColumns

// Everything the list must fetch: the record ID, the default in_list_view
// fields (mobile cards always show those) and whatever extra columns the
// user picked.
const fetchFields = computed(() => {
  const names = new Set(['name', 'modified'])
  columns.value.forEach((c) => names.add(c.fieldname))
  visibleColumns.value.forEach((c) => names.add(c.fieldname))
  return [...names]
})

// Two independent filter sources feeding the same query:
// - quickFilters: the always-visible per-column boxes below the toolbar,
//   one plain value per column, always an exact/like match depending on
//   fieldtype - see quickFilterEntries.
// - advancedFilters: the Filter popover/sheet's FilterEditor state (any
//   field, any operator, already in frappe.get_list's [operator, value]
//   shape).
// advancedFilters wins on any field both happen to set, since it's the
// more deliberate, explicit action of the two.
const quickFilters = reactive({})
const advancedFilters = ref({})
// Opened from the Dashboard (or any link) with ?filters={...} in Frappe's filter shape.
function filtersFromRoute() {
  try {
    const parsed = route.query.filters ? JSON.parse(route.query.filters) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
advancedFilters.value = filtersFromRoute()
watch(() => route.query.filters, () => { advancedFilters.value = filtersFromRoute() })
const searchQuery = ref('')

function selectOptions(field) {
  return (field.options || '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => ({ label: v, value: v }))
}

// Fields offered as inline quick filters in the toolbar: the doctype's own
// "standard filter" fields (up to three), or - if it flags none - its first
// few list columns.
const QUICK_FILTER_FIELDTYPES = new Set(['Select', 'Check', 'Data', 'Link', 'Small Text', 'Phone', 'Int', 'Float'])
const quickFilterFields = computed(() => {
  const flagged = allFields.value.filter((f) => f.in_standard_filter && QUICK_FILTER_FIELDTYPES.has(f.fieldtype))
  const pool = flagged.length ? flagged : columns.value.filter((f) => QUICK_FILTER_FIELDTYPES.has(f.fieldtype))
  return pool.slice(0, 3)
})

const quickFilterEntries = computed(() => {
  const result = {}
  for (const field of quickFilterFields.value) {
    const value = quickFilters[field.fieldname]
    if (value == null || value === '') continue
    if (field.fieldtype === 'Check') {
      result[field.fieldname] = Number(value)
    } else if (field.fieldtype === 'Select') {
      result[field.fieldname] = value
    } else {
      result[field.fieldname] = ['like', `%${value}%`]
    }
  }
  return result
})

// searchQuery goes last and wins on `name` if advancedFilters also happens
// to target it. No server-side search endpoint exists in this app (unlike
// a full-text record search service) - this is a plain client-requested
// `like` on the record's own ID, same as every other quick filter here.
const searchFilter = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return {}
  return { name: ['like', `%${q}%`] }
})
const listFilters = computed(() => ({ ...quickFilterEntries.value, ...advancedFilters.value, ...searchFilter.value }))
const hasActiveFilters = computed(() => Object.keys(listFilters.value).length > 0)
const activeFilterCount = computed(() => Object.keys(advancedFilters.value).length)

function clearAllFilters() {
  for (const key of Object.keys(quickFilters)) delete quickFilters[key]
  advancedFilters.value = {}
  searchQuery.value = ''
}

// Starts at the doctype's own declared default (sort_field/sort_order)
// rather than a hardcoded "modified desc". Only actually applied once
// metaResource.data resolves.
const sortValue = ref({ field: 'modified', direction: 'desc' })
let sortDefaultInitialized = false
watch(
  () => metaResource.data,
  (meta) => {
    if (!meta || sortDefaultInitialized) return
    sortDefaultInitialized = true
    totalCountResource.fetch()
    sortValue.value = {
      field: meta.sort_field || 'modified',
      direction: (meta.sort_order || 'desc').toLowerCase(),
    }
  },
)

pageTitleRef.value = props.doctype

// The list shows `pageSize` rows to start with; Load More adds the next
// `pageSize`, and the list scrolls inside its own box. Choosing another
// page size starts the list again from the top with that many rows. A
// change of filters, sort or doctype also starts again.
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100]
const pageSize = ref(15)
const moreRows = ref([])
const noMoreRows = ref(false)
function listParams(start) {
  return {
    fields: JSON.stringify(fetchFields.value),
    filters: JSON.stringify(listFilters.value),
    order_by: `${sortValue.value.field} ${sortValue.value.direction}`,
    start,
    limit: pageSize.value,
  }
}
const pageResource = useCall({
  url: `/api/v2/document/${props.doctype}`,
  method: 'GET',
  params: () => listParams(0),
  immediate: false,
})
const moreResource = useCall({
  url: `/api/v2/document/${props.doctype}`,
  method: 'GET',
  params: () => listParams((pageResource.data?.length || 0) + moreRows.value.length),
  immediate: false,
})

let lastLoadKey = ''
// `force` (Refresh, after a delete) fetches even when nothing about the request changed
function loadPage(force = false) {
  if (!metaResource.data || !fetchFields.value.length || isSingle.value) return
  const key = JSON.stringify([fetchFields.value, listFilters.value, sortValue.value, pageSize.value, props.doctype])
  if (!force && key === lastLoadKey) return
  lastLoadKey = key
  moreRows.value = []
  noMoreRows.value = false
  pageResource.fetch()
}
watch(
  () => [JSON.stringify(fetchFields.value), JSON.stringify(listFilters.value), sortValue.value.field, sortValue.value.direction, pageSize.value, props.doctype, !!metaResource.data],
  () => loadPage(),
  { immediate: true },
)

const canLoadMore = computed(() => !noMoreRows.value && allRows.value.length < (totalCountResource.data ?? 0))
function onListScroll(event) {
  const box = event.target
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 80) loadMore()
}

async function loadMore() {
  if (moreResource.loading || pageResource.loading || !canLoadMore.value) return
  const key = lastLoadKey
  const next = (await moreResource.fetch()) || []
  if (key !== lastLoadKey) return // the list was started again (filters, sort, page size) while this was loading
  const have = new Set(allRows.value.map((r) => r.name))
  moreRows.value = [...moreRows.value, ...next.filter((r) => !have.has(r.name))]
  if (next.length < pageSize.value || allRows.value.length >= (totalCountResource.data ?? Infinity)) noMoreRows.value = true
}
function setPageSize(size) {
  pageSize.value = size
}

const allRows = computed(() => [...(pageResource.data || []), ...moreRows.value])
// An aborted request (a newer one replaced it) is not an error worth showing
const listError = computed(() => {
  const error = pageResource.error
  return error && !/abort/i.test(String(error?.message || error)) ? error : null
})

const showResults = computed(() => !pageResource.loading && !listError.value && allRows.value.length > 0)

// ListView's own column shape ({key, label, ...}) doesn't carry Frappe
// field metadata (fieldtype, options, ...) - docField keeps the original
// field object attached per column so isStatusLikeField/formatValue (which
// expect that shape) still work from inside ListRows' cell slot.
const ID_COLUMN = { fieldname: 'name', label: 'ID', fieldtype: 'Data' }
const MODIFIED_COLUMN = { fieldname: 'modified', label: 'Last Modified', fieldtype: 'Datetime' }
function columnWidth(col) {
  if (col.fieldname === 'modified') return '6.5rem'
  let longest = String(col.label || '').length + 2
  for (const row of allRows.value) {
    const text = col.fieldname === 'modified' ? '10mo' : String(formatValue(row[col.fieldname], col) ?? '')
    if (text.length > longest) longest = text.length
  }
  const rem = Math.min(Math.max(longest * 0.5 + 1.5, 5), 15).toFixed(1)
  return `minmax(${rem}rem, ${rem}fr)`
}
const listViewColumns = computed(() =>
  [ID_COLUMN, ...visibleColumns.value.filter((c) => c.fieldname !== 'name' && c.fieldname !== 'modified'), MODIFIED_COLUMN].map((col) => ({
    key: col.fieldname,
    label: col.label,
    width: columnWidth(col),
    docField: col,
  })),
)

const listViewOptions = computed(() => ({
  selectable: true,
  showTooltip: false,
  getRowRoute: (row) => getRowRouteFor(row.name),
  emptyState: {
    title: hasActiveFilters.value ? 'No records match your filters' : 'No records yet',
    description: hasActiveFilters.value
      ? 'Try adjusting or clearing your filters.'
      : undefined,
    button: hasActiveFilters.value
      ? { label: 'Clear filters', variant: 'ghost', onClick: clearAllFilters }
      : { label: 'Create the first one', variant: 'outline', iconLeft: 'plus', onClick: goToNew },
  },
}))

const showFilterPopover = ref(false)
const showSortPopover = ref(false)
const showColumnsPopover = ref(false)
function closeToolbarPopoversOnOutsideClick(event) {
  if (!showFilterPopover.value && !showSortPopover.value && !showColumnsPopover.value) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (
    target.closest(
      '.doctype-list-popover, [data-reka-popper-content-wrapper], [data-slot="content"], [data-toolbar-popover-trigger]',
    )
  )
    return
  showFilterPopover.value = false
  showSortPopover.value = false
  showColumnsPopover.value = false
}
watch(showFilterPopover, (open) => { if (open) { showSortPopover.value = false; showColumnsPopover.value = false } })
watch(showSortPopover, (open) => { if (open) { showFilterPopover.value = false; showColumnsPopover.value = false } })
watch(showColumnsPopover, (open) => { if (open) { showFilterPopover.value = false; showSortPopover.value = false } })
onMounted(() => document.addEventListener('pointerdown', closeToolbarPopoversOnOutsideClick, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeToolbarPopoversOnOutsideClick, true))

const showFilterSheet = ref(false)
const showSortSheet = ref(false)

// Row selection (desktop ListView only) - ListView owns the actual
// selection Set internally and emits update:selections, which this just
// mirrors as a plain name array for doBulkDelete to read.
const selectedNames = ref([])

// A filter/sort change replacing what's on screen makes the old selection
// meaningless. Load More deliberately isn't included here (it only appends
// to allRows) - growing the list shouldn't wipe out a selection.
const gridKey = ref(0)
watch([listFilters, sortValue, pageSize], () => {
  selectedNames.value = []
  gridKey.value++
})

const showBulkDeleteConfirm = ref(false)
function confirmBulkDelete() {
  showBulkDeleteConfirm.value = true
}

async function doBulkDelete(close) {
  const names = selectedNames.value
  for (const name of names) {
    await call('frappe.client.delete', { doctype: props.doctype, name })
  }
  selectedNames.value = []
  gridKey.value++
  close()
  loadPage(true)
  totalCountResource.fetch()
}

function formatValue(value, field) {
  if (value == null || value === '') return '-'
  if (field.fieldtype === 'Check') return value ? 'Yes' : 'No'
  // A linked record shows by its title (name), not its ID.
  if (isTitledLink(field)) return linkTitle(field.options, value)
  return value
}

// Fetch the titles for every Link column on the rows currently loaded.
watch(
  () => [allRows.value, columns.value, visibleColumns.value],
  () => ensureTitlesForRows(allRows.value, [...columns.value, ...visibleColumns.value]),
  { immediate: true },
)

// Mobile card title - meta.title_field when the doctype declares one, else
// the record's own name/ID.
const titleFieldname = computed(() => metaResource.data?.title_field || null)
function cardTitle(row) {
  if (titleFieldname.value && row[titleFieldname.value]) return row[titleFieldname.value]
  return row.name
}

// Every in_list_view column except whichever one is already shown as the
// card's own title. The first status-like column is shown as a badge in
// the card header instead, so it's left out of the body grid.
const cardStatusColumn = computed(() => columns.value.find((c) => isStatusLikeField(c)) || null)
function cardBodyColumnsFor(row) {
  const title = cardTitle(row)
  return visibleColumns.value.filter(
    (c) =>
      c.fieldname !== titleFieldname.value &&
      c.fieldname !== cardStatusColumn.value?.fieldname &&
      row[c.fieldname] !== title,
  )
}

// A subtle left-border accent on the whole mobile card, colored by
// whichever status-like column happens to be showing on this list.
function cardAccentStyle(row) {
  const statusCol = visibleColumns.value.find((col) => isStatusLikeField(col))
  if (!statusCol || !row[statusCol.fieldname]) return {}
  return { borderLeft: `3px solid ${statusBorderColor(row[statusCol.fieldname])}` }
}

// Refresh re-runs the first page and drops anything loaded past it via
// Load More.
function refreshList() {
  loadPage(true)
  totalCountResource.fetch()
}

// Lightweight count-only query - frappe.get_list's paged response has no
// total count without a dedicated call.
const totalCountResource = useCall({
  url: '/api/v2/method/frappe.client.get_count',
  method: 'GET',
  params: () => ({ doctype: props.doctype, filters: JSON.stringify(listFilters.value) }),
  immediate: false,
})
watch(listFilters, () => totalCountResource.fetch(), { immediate: false })

function goToNew() {
  router.push({ name: 'DoctypeNew', params: { doctypeRoute: route.params.doctypeRoute } })
}

function goToRow(name) {
  router.push(getRowRouteFor(name))
}

// Same route goToRow above pushes, but as a route OBJECT rather than an
// imperative push - ListView's getRowRoute option renders each row as a
// router-link :to, so it needs the destination itself, not a function
// that navigates.
function getRowRouteFor(name) {
  return { name: 'DoctypeForm', params: { doctypeRoute: route.params.doctypeRoute, name } }
}

// --- Caregiver Salary Excel export (doctype-specific) -------------------
const isCaregiverSalaryDoctype = computed(() => props.doctype === 'Creche Caregiver Salary and Benefits')
const showExportDialog = ref(false)
const exportScope = ref('all')
const exporting = ref(false)
const exportError = ref(null)

async function exportExcel() {
  exporting.value = true
  exportError.value = null
  try {
    const res = await fetch('/api/method/creche_reports.api.export_reports.export_creche_caregiver_salary_excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token || '',
      },
      body: JSON.stringify({ scope: exportScope.value }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      // A stale window.csrf_token (set once at page load) mismatches the
      // server's current session token after a server restart or a very
      // long-lived tab - a full reload picks up a fresh token instead of
      // leaving the user stuck re-clicking a button that can never succeed
      // as-is. See useImportTemplate.js's download() for the same handling.
      if (err?.exc_type === 'CSRFTokenError') {
        window.location.reload()
        throw new Error('Your session needs a refresh - reloading…')
      }
      throw new Error(err?.exception || 'Server error while generating Excel.')
    }
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/)
    const filename = match ? match[2] : 'Creche_Caregiver_Salary_and_Benefits.xlsx'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 1000)
    showExportDialog.value = false
  } catch (e) {
    exportError.value = e
  } finally {
    exporting.value = false
  }
}
</script>
