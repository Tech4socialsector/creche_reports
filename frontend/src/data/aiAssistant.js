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
const POLL_TIMEOUT_MS = 90_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// A tiny reactive flag so the UI can show a "thinking" state across the
// whole send-then-poll round trip, since sendMessageCall.loading alone only
// covers the (near-instant) enqueue call.
export const sending = reactive({ loading: false })

export async function sendAssistantMessage(message) {
  sending.loading = true
  try {
    const { job_id } = await sendMessageCall.submit({
      messages: history.value,
      message,
    })

    const startedAt = Date.now()
    let interval = POLL_INTERVAL_START_MS
    let result
    while (true) {
      result = await jobResultCall.submit({ job_id })
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
