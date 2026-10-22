import { ref } from 'vue'
import { useCall } from 'frappe-ui'
import { refreshCsrfToken } from '@/composables/useCsrfToken'

// Shared by every drill-down modal's Export button. One instance per modal
// (not module-level singleton) so concurrent exports from different modals
// never race on the same `exporting`/`error` state.
export function useTableExport() {
  const exporting = ref(false)
  const error = ref(null)

  const exportCall = useCall({
    url: '/api/v2/method/creche_reports.api.creche_dashboard.export_table',
    method: 'POST',
    immediate: false,
  })

  const exportGridCall = useCall({
    url: '/api/v2/method/creche_reports.api.creche_dashboard.export_pending_utilisation_grid',
    method: 'POST',
    immediate: false,
  })

  async function exportTable(title, columns, rows, format = 'xlsx') {
    exporting.value = true
    error.value = null
    try {
      await refreshCsrfToken()
      const data = await exportCall.submit({ title, columns, rows, format })
      if (data?.file_url) window.open(data.file_url, '_blank')
    } catch (e) {
      error.value = e
    } finally {
      exporting.value = false
    }
  }

  async function exportGrid(title, columns, grid, merges = []) {
    exporting.value = true
    error.value = null
    try {
      await refreshCsrfToken()
      const data = await exportGridCall.submit({ title, columns, grid, merges })
      if (data?.file_url) window.open(data.file_url, '_blank')
    } catch (e) {
      error.value = e
    } finally {
      exporting.value = false
    }
  }

  return { exporting, error, exportTable, exportGrid }
}
