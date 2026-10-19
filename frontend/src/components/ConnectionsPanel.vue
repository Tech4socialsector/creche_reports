<template>
  <div v-if="connections.length" class="mt-6 border-t pt-4 dark:border-gray-800">
    <h3 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Connections</h3>
    <div class="space-y-2">
      <div
        v-for="conn in connections"
        :key="conn.key"
        class="rounded-lg border dark:border-gray-800"
      >
        <!-- A <button> can't nest inside another <button> (invalid HTML) -
        this row is a plain div; the label portion and "Add" are two
        separate sibling buttons instead of one button containing another. -->
        <div class="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
          <button
            type="button"
            class="flex flex-1 items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300"
            @click="toggleExpanded(conn)"
          >
            <LucideIcon
              name="chevron-right"
              class="h-3.5 w-3.5 flex-shrink-0 transition-transform"
              :class="{ 'rotate-90': expanded[conn.key] }"
            />
            {{ conn.label }}
            <span
              v-if="conn.countResource.data != null"
              class="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ conn.countResource.data }}
            </span>
          </button>
          <Button v-if="conn.canCreate" variant="ghost" size="sm" @click="addNew(conn)">
            <template #prefix>
              <LucideIcon name="plus" class="h-3.5 w-3.5" />
            </template>
            Add
          </Button>
        </div>

        <div v-if="expanded[conn.key]" class="border-t px-3 py-2 dark:border-gray-800">
          <div v-if="conn.rowsResource.loading" class="py-2 text-sm text-gray-400">Loading...</div>
          <div v-else-if="!conn.rowsResource.data?.length" class="py-2 text-sm text-gray-400">
            No {{ conn.label }} yet.
          </div>
          <div v-else class="space-y-1">
            <button
              v-for="row in conn.rowsResource.data"
              :key="row.name"
              type="button"
              class="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="openRecord(conn, row.name)"
            >
              {{ linkTitle(conn.linkDoctype, row.name) }}
              <span class="ml-1 text-xs text-gray-400">{{ row.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, useCall } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { routeSlugForDoctype } from '@/data/doctypeRoutes'
import { ensureTitlesForRows, linkTitle } from '@/data/linkTitles'

// Frappe desk's own "Connections" tab, driven the same way it is in real
// Desk: a doctype's own `links` metadata (DocType Link child rows) names
// every other doctype that links back to it, and the field on that side
// that holds the connection. Nothing here is hardcoded per-doctype; any
// doctype whose meta declares `links` gets a panel automatically.
//
// `links` is read once at setup time (not wrapped in a computed) because
// each connection owns its own pair of useCall resources - creating those
// dynamically inside a computed's mapper would recreate them on every
// re-evaluation instead of once per connection. This is fine in practice:
// `links` comes from the parent's already-loaded doctype meta and doesn't
// change after this component mounts.
const props = defineProps({
  doctype: { type: String, required: true },
  name: { type: String, required: true },
  links: { type: Array, default: () => [] },
})

const router = useRouter()
const expanded = reactive({})

const connections = props.links
  .filter((l) => !l.hidden)
  .map((l) => {
    const key = `${l.link_doctype}:${l.link_fieldname}`
    const slug = routeSlugForDoctype(l.link_doctype)
    const countResource = useCall({
      url: '/api/v2/method/frappe.client.get_count',
      method: 'GET',
      params: () => ({ doctype: l.link_doctype, filters: JSON.stringify({ [l.link_fieldname]: props.name }) }),
      immediate: false,
      // Open a connection that has records the first time its count
      // arrives, so related records are listed (and one click away) without
      // expanding anything. A connection the user closed stays closed.
      onSuccess: (count) => {
        if (count > 0 && expanded[key] === undefined) {
          expanded[key] = true
          rowsResource.fetch()
        }
      },
    })
    const rowsResource = useCall({
      url: `/api/v2/document/${l.link_doctype}`,
      method: 'GET',
      params: () => ({
        fields: JSON.stringify(['name']),
        filters: JSON.stringify({ [l.link_fieldname]: props.name }),
        limit: 100,
      }),
      immediate: false,
      // Show records by their title, not just the record ID.
      onSuccess: (rows) => ensureTitlesForRows(rows, [{ fieldname: 'name', fieldtype: 'Link', options: l.link_doctype }]),
    })
    return {
      key,
      linkDoctype: l.link_doctype,
      linkFieldname: l.link_fieldname,
      label: l.link_doctype,
      route: slug,
      canCreate: !!slug,
      countResource,
      rowsResource,
    }
  })

function toggleExpanded(conn) {
  expanded[conn.key] = !expanded[conn.key]
  if (expanded[conn.key] && !conn.rowsResource.data) conn.rowsResource.fetch()
}

// Re-fetch every connection's count whenever the record itself changes.
watch(
  () => props.name,
  () => {
    for (const conn of connections) {
      conn.countResource.fetch()
      if (expanded[conn.key]) conn.rowsResource.fetch()
    }
  },
  { immediate: true },
)

function openRecord(conn, recordName) {
  if (!conn.route) return
  router.push({ name: 'DoctypeForm', params: { doctypeRoute: conn.route, name: recordName } })
}

function addNew(conn) {
  if (!conn.route) return
  router.push({
    name: 'DoctypeNew',
    params: { doctypeRoute: conn.route },
    query: { [conn.linkFieldname]: props.name },
  })
}
</script>
