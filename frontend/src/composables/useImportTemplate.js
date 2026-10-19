import { ref } from 'vue'
import { fetchV2 } from '@/composables/useApiV2'

// Downloads a pre-filled Excel workbook from one of the two existing
// whitelisted binary-export endpoints (download_budget_template /
// download_utilisation_template) - both POST a JSON `data` payload and
// return `frappe.response["filecontent"]` as a raw binary body, same
// pattern BudgetUtilisationReport.vue's own handleExport() uses for
// download_excel. Can't use fetchV2 (GET-only, expects the JSON `.data`
// envelope) or frappe-ui's call() (defaults to the legacy /api/method/
// path's `.message` envelope) - this hits /api/method/ directly on
// purpose: a binary (non application/json) response bypasses this app's
// response-encryption after_request hook regardless of path, so the
// legacy path is safe here and is what the endpoint already expects.
export function useImportTemplateDownload(method) {
  const downloading = ref(false)
  const downloadError = ref(null)

  async function download(data, fallbackFilename) {
    downloading.value = true
    downloadError.value = null
    try {
      const res = await fetch(`/api/method/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || '',
        },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        // A stale window.csrf_token (set once at page load) mismatches the
        // server's current session token after a server restart or a very
        // long-lived tab - frappe.auth.HTTPRequest.validate_csrf_token
        // rejects every unsafe-method request with this exact exception
        // name regardless of which endpoint was called. A full reload picks
        // up a fresh token from the next page load rather than leaving the
        // user stuck re-clicking a button that can never succeed as-is.
        if (body?.exc_type === 'CSRFTokenError') {
          window.location.reload()
          throw new Error('Your session needs a refresh - reloading…')
        }
        throw new Error(body?._error_message || body?.exception || 'Failed to generate template')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/)
      const filename = match ? match[2] : fallbackFilename

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      downloadError.value = e
      throw e
    } finally {
      downloading.value = false
    }
  }

  return { download, downloading, downloadError }
}

// The "Budget Main Head / Sub Head / Type of Expenses" preview table both
// desk pages show - creche_reports.api.import_template.get_all_budget_items
// already resolves the per-user Import Template Items override vs. the
// shared master list server-side, so this just calls it and exposes the
// rows + loading state.
export function useBudgetItemsPreview() {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      items.value = (await fetchV2('creche_reports.api.import_template.get_all_budget_items')) || []
    } catch (e) {
      error.value = e
      items.value = []
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load }
}
