import { reactive, ref } from 'vue'
import { useCall } from 'frappe-ui'

export const assistantState = reactive({
  visible: false,
})

export function toggleAssistant() {
  assistantState.visible = !assistantState.visible
}

// Cheap, safe-for-every-user check: is the assistant on, and what's it
// called. Never includes the base URL, model, or key - see
// creche_reports.ai.assistant.get_assistant_config.
export const assistantConfigResource = useCall({
  url: '/api/v2/method/creche_reports.ai.assistant.get_assistant_config',
  method: 'GET',
  cacheKey: 'creche-reports-ai-assistant-config',
})

// Conversation lives here (not local to the panel component) so closing and
// reopening the panel within a session doesn't lose context.
export const conversation = ref([])
// What is sent back to the server each turn: the same conversation, but with placeholders where the
// assistant mentioned a protected value. The model never sees those values; the real ones are put into
// `conversation` (what is shown) by the server.
const history = ref([])

export function clearAssistantConversation() {
  conversation.value = []
  history.value = []
}

// The backend never answers send_message synchronously - the actual LLM call
// runs as a background job on Frappe's "long" queue, behind a site-wide
// concurrency cap, so this request (and the shared worker process every
// other site on this server also depends on) is never blocked waiting on an
// external API for up to ~30-60s. send_message only returns a job_id; the
// result is fetched by polling get_job_result until it reports "done".
const sendMessageCall = useCall({
  url: '/api/v2/method/creche_reports.ai.assistant.send_message',
  method: 'POST',
  immediate: false,
})

const jobResultCall = useCall({
  url: '/api/v2/method/creche_reports.ai.assistant.get_job_result',
  method: 'GET',
  immediate: false,
})

// A flat 1.5s poll looked fine for a quick reply but meant ~30 requests for
// a slow one (the tool-calling loop can take several sequential LLM round
// trips, 30-50s total is normal) - most of those requests just confirm
// "still pending" again. Backing off (1s -> ... -> 5s, capped) keeps the
// quick-answer case feeling just as responsive while cutting the request
// count roughly in half or more for a slow one.
const POLL_INTERVAL_START_MS = 1000
const POLL_INTERVAL_MAX_MS = 5000
const POLL_BACKOFF_FACTOR = 1.4
// Must stay above the backend's own real worst case
// (creche_reports.ai.assistant's REQUEST_TIMEOUT_SECONDS *
// (MAX_TOOL_ITERATIONS + 1), ~330s at current values) - a multi-doctype
// question (e.g. a partner-wise budget/disbursement/utilisation report)
// can legitimately need several sequential tool round trips, and giving up
// here before the job could ever actually finish abandons a request that
// was still correctly working server-side.
const POLL_TIMEOUT_MS = 360_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// A tiny reactive flag so the UI can show a "thinking" state across the
// whole send-then-poll round trip, since sendMessageCall.loading alone only
// covers the (near-instant) enqueue call.
export const sending = reactive({ loading: false })

// window.csrf_token is stamped once at initial page load and never
// refreshed on its own - logging in elsewhere, a server restart, or the
// session simply expiring can all reissue the session with a new CSRF
// token server-side, so a POST made from a tab that has been open since
// before that keeps sending the old one and gets rejected with
// CSRFTokenError. Rather than wait for that 400 and react to it (which
// depends on the error's shape round-tripping through useCall exactly as
// expected, and still sends one guaranteed-to-fail request first), this
// fetches the session's *current* token (api/common.py's get_csrf_token - a
// GET, so it's exempt from CSRF validation itself) right before every send
// and overwrites window.csrf_token with it - useFrappeFetch's beforeFetch
// hook (see node_modules/frappe-ui/src/data-fetching/useFrappeFetch.ts's
// setHeaders) reads window.csrf_token fresh on every request useCall makes,
// so this guarantees the POST that follows always carries a token that
// matches the live session, with no dependency on reload timing, on a
// previous request having failed first, or on the server's error shape.
async function refreshCsrfToken() {
  try {
    const res = await fetch('/api/v2/method/creche_reports.api.common.get_csrf_token', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const body = await res.json()
    const token = body?.data ?? body?.message
    if (token) window.csrf_token = token
    return token || null
  } catch {
    return null
  }
}

export async function sendAssistantMessage(message) {
  sending.loading = true
  try {
    await refreshCsrfToken()
    const sendResult = await sendMessageCall.submit({
      messages: history.value,
      message,
    })
    // useCall's own submit()/execute() resolves to null on ANY request
    // failure (network error, a non-2xx response, a dead/stale session) -
    // it never throws, it just means "no data came back" - see useCall.ts's
    // own `data.value?.data ?? null`. Destructuring job_id straight off
    // that without checking crashed with a cryptic "Cannot destructure
    // property 'job_id' of null" instead of a real, readable error message.
    if (!sendResult?.job_id) {
      throw sendMessageCall.error.value || new Error('Could not reach the assistant. Please try again.')
    }
    const { job_id } = sendResult

    const startedAt = Date.now()
    let interval = POLL_INTERVAL_START_MS
    let result
    while (true) {
      result = await jobResultCall.submit({ job_id })
      if (!result) {
        throw jobResultCall.error.value || new Error('Could not reach the assistant. Please try again.')
      }
      if (result.status === 'done') break
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        throw new Error('The assistant is taking longer than expected. Please try again.')
      }
      await sleep(interval)
      interval = Math.min(interval * POLL_BACKOFF_FACTOR, POLL_INTERVAL_MAX_MS)
    }

    history.value = result.messages
    conversation.value = [
      ...conversation.value,
      { role: 'user', content: message },
      { role: 'assistant', content: result.reply, blocks: result.blocks || [] },
    ]
    return result
  } finally {
    sending.loading = false
  }
}
