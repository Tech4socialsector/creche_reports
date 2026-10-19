<template>
  <!-- Trigger button lives in AppSidebar.vue's footer (above the user
  details, labeled so it's clear what it opens). -->
  <Dialog v-model="show" :options="{ size: '6xl', title: 'ai-assistant' }">
    <template #body>
      <div class="ai-assistant-panel flex flex-col">
        <div
          class="flex items-center justify-between border-b px-4 py-3 dark:border-gray-800 sm:px-5"
        >
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <SparklesIcon class="h-4 w-4" />
            </span>
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ botName }}</h2>
          </div>
          <div class="flex items-center gap-1">
            <Tooltip v-if="conversation.length" text="Clear conversation">
              <Button variant="ghost" size="sm" icon="lucide-trash-2" @click="clearConversation" />
            </Tooltip>
            <Tooltip text="Close">
              <Button variant="ghost" size="sm" icon="lucide-x" @click="show = false" />
            </Tooltip>
          </div>
        </div>

        <div ref="messagesRef" class="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          <div
            v-if="conversation.length === 0"
            class="flex flex-col items-center gap-2 py-16 text-center text-gray-500 dark:text-gray-400"
          >
            <SparklesIcon class="h-7 w-7" />
            <span class="text-sm">
              Hi, I'm {{ botName }}. Ask me about partner budgets, disbursements, utilisation reports or caregiver salary data.
            </span>
          </div>

          <div
            v-for="(m, idx) in conversation"
            :key="idx"
            class="flex"
            :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div :class="m.blocks?.length ? 'w-full max-w-full' : 'max-w-[75%]'">
              <div
                v-if="m.content"
                class="whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm"
                :class="m.role === 'user'
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'inline-block bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'"
                v-html="renderBold(m.content)"
              />
              <AiBlocks v-if="m.blocks?.length" :blocks="m.blocks" />
            </div>
          </div>

          <div v-if="sending.loading" class="flex justify-start">
            <div class="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          </div>
        </div>

        <ErrorMessage class="mx-4 mb-2 sm:mx-5" :message="sendError" />

        <div class="border-t p-3 dark:border-gray-800 sm:p-4">
          <div class="flex items-end gap-2">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Type a message..."
              class="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              @keydown.enter.exact.prevent="submit"
            />
            <Button variant="solid" :loading="sending.loading" :disabled="!draft.trim()" @click="submit">
              <template #icon>
                <LucideIcon name="send" class="h-4 w-4" />
              </template>
            </Button>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style>
/* frappe-ui's Dialog has no size prop granular enough for "full-screen on
mobile, centered card on larger screens" - its outer overlay wrapper
(px-4 py-4) and DialogContent (my-8, rounded-xl, max-w-*) apply
unconditionally, leaving this dialog with unusable cramped margins on
phone-sized viewports. data-dialog is the one hook the component exposes
for exactly this: it's set from options.title, so title: 'ai-assistant'
above lets these overrides target only this dialog instance. */
/* 1050, to clear the sidebar's own z-index (see index.css) and any other
fixed chrome, not just the default stacking order. */
[data-dialog='ai-assistant'].dialog-overlay {
  z-index: 1050;
}

/* frappe-ui's DialogContent wraps this panel with `my-8` (2rem top + 2rem
bottom) inside an overlay that is itself `overflow-y-auto` and centers its
content vertically via `justify-center` - but only when the content is
short enough to actually leave room to center *within*. A near-viewport-
height panel (58rem, previously) left no slack for that, so it just sat
pinned under the top margin instead of centered, and on shorter windows
its height plus the 4rem margin together exceeded the viewport entirely,
making the *overlay* scroll (it fills the whole screen, so that reads as
"the whole page scrolled" even though it's only this dialog's own
wrapper). A smaller fixed height leaves room on typical screens for
justify-center to actually center the dialog, and max-height still caps
it (reserving the 4rem margin) so it degrades gracefully on short
windows instead of ever forcing the overlay to scroll. */
.ai-assistant-panel {
  width: 100%;
  height: 52rem;
  max-height: calc(100vh - 4rem);
}

/* Width-only breakpoints miss short/landscape phones (e.g. 844x390) - a
squat viewport needs the same full-screen treatment as a narrow one, since
the centered-card styling's fixed vertical margins leave no room to
breathe at that height either. */
@media (max-width: 639px), (max-height: 480px) {
  [data-dialog='ai-assistant'].dialog-overlay > div {
    padding: 0;
  }
  [data-dialog='ai-assistant'] .dialog-content {
    margin: 0;
    max-width: none;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
  }
  .ai-assistant-panel {
    height: 100dvh;
    max-height: none;
  }
}
</style>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Dialog, ErrorMessage, Tooltip } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import SparklesIcon from '@/components/SparklesIcon.vue'
import AiBlocks from '@/components/AiBlocks.vue'
import {
  assistantState,
  assistantConfigResource,
  conversation,
  clearAssistantConversation,
  sendAssistantMessage,
  sending,
} from '@/data/aiAssistant'
import { routeSlugForDoctype } from '@/data/doctypeRoutes'
import { useBackButtonClose } from '@/composables/useBackButtonClose'

const router = useRouter()
const messagesRef = ref(null)
const draft = ref('')
const sendError = ref(null)

const botName = computed(() => assistantConfigResource.data?.bot_name || 'Assistant')

// The assistant's own guide now tells it to bold a count/total with
// **this** markdown syntax (see the "Response Formatting" AI Guide Section),
// but this chat only ever rendered plain text - not a full markdown
// renderer (no new dependency, no markdown syntax beyond the one thing the
// guide actually asks for), just **bold** support: escape everything first
// so the message's own text can never inject HTML, then turn the (now
// HTML-safe) **pairs** into <strong> tags.
function renderBold(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

const show = computed({
  get: () => assistantState.visible,
  set: (v) => (assistantState.visible = v),
})

// The device's back button/gesture closes this dialog first (like any
// other overlay in a native app) instead of navigating away from the page
// it was opened on top of.
useBackButtonClose(show)

watch(
  () => assistantState.visible,
  (visible) => {
    if (visible) assistantConfigResource.reload()
  },
)

watch(
  () => conversation.value.length,
  () => nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }),
)

function clearConversation() {
  clearAssistantConversation()
  sendError.value = null
}

async function submit() {
  const message = draft.value.trim()
  if (!message || sending.loading) return
  draft.value = ''
  sendError.value = null
  try {
    const result = await sendAssistantMessage(message)
    if (result.action?.type === 'navigate' && result.action.doctype) {
      const slug = routeSlugForDoctype(result.action.doctype)
      if (slug) {
        router.push({
          name: result.action.name ? 'DoctypeForm' : 'DoctypeList',
          params: { doctypeRoute: slug, name: result.action.name },
        })
        assistantState.visible = false
      }
    }
  } catch (e) {
    sendError.value = e
    draft.value = message
  }
}
</script>
