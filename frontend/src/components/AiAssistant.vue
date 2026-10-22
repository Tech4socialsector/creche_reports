<template>
  <!-- Trigger button lives in AppSidebar.vue's footer (above the user
  details, labeled so it's clear what it opens). -->
  <Dialog v-model="show" :options="{ size: '7xl', title: 'ai-assistant' }">
    <template #body>
      <div class="ai-assistant-panel flex flex-col">
        <div class="flex flex-shrink-0 items-center justify-between gap-3 border-b px-4 py-3 dark:border-gray-800 sm:px-5">
          <div class="flex items-center gap-2.5">
            <span class="ai-assistant-avatar-badge flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" :style="avatarTint">
              <SparklesIcon class="h-4 w-4" />
            </span>
            <div class="min-w-0">
              <h2 class="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">{{ botName }}</h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ appName }} · AI Assistant</p>
            </div>
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

        <div ref="messagesRef" class="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div
            v-if="conversation.length === 0 && !sending.loading"
            class="flex h-full flex-col items-center justify-center gap-6 px-4 text-center"
          >
            <span class="ai-assistant-avatar-badge flex h-14 w-14 items-center justify-center rounded-full" :style="avatarTint">
              <SparklesIcon class="h-7 w-7" />
            </span>
            <div class="ai-assistant-fade-in space-y-1.5">
              <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">Hi, I'm {{ botName }}</p>
              <p class="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
                Ask me about partner budgets, disbursements, utilisation reports or caregiver salary data.
              </p>
            </div>
            <div class="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                v-for="(prompt, i) in starterPrompts"
                :key="prompt.text"
                type="button"
                class="ai-assistant-starter ai-assistant-fade-in flex items-start gap-3 rounded-xl px-4 py-3 text-left"
                :style="{ animationDelay: `${120 + i * 60}ms` }"
                @click="useStarterPrompt(prompt.text)"
              >
                <span class="ai-assistant-starter-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                  <LucideIcon :name="prompt.icon" class="h-4 w-4" />
                </span>
                <span class="text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">{{ prompt.text }}</span>
              </button>
            </div>
          </div>

          <TransitionGroup name="ai-assistant-msg" tag="div" class="contents">
          <div
            v-for="(m, idx) in conversation"
            :key="idx"
            class="flex items-end gap-2"
            :class="m.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
          >
            <span
              v-if="m.role !== 'user'"
              class="ai-assistant-avatar-badge flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
              :style="avatarTint"
            >
              <SparklesIcon class="h-3.5 w-3.5" />
            </span>
            <span
              v-else
              class="ai-assistant-avatar-user flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            >
              {{ userInitial }}
            </span>
            <div :class="m.blocks?.length ? 'w-full max-w-[calc(100%-2.25rem)]' : 'max-w-[75%]'">
              <div
                v-if="m.content"
                class="whitespace-pre-wrap text-sm leading-relaxed"
                :class="m.role === 'user' ? 'ai-assistant-bubble-user' : 'ai-assistant-bubble-bot'"
                v-html="renderBold(m.content)"
              />
              <AiBlocks v-if="m.blocks?.length" :blocks="m.blocks" />
            </div>
          </div>
          </TransitionGroup>

          <div v-if="sending.loading" class="flex items-end gap-2">
            <span class="ai-assistant-avatar-badge flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" :style="avatarTint">
              <SparklesIcon class="h-3.5 w-3.5" />
            </span>
            <div class="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
              <span class="flex items-center gap-1">
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              </span>
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ thinkingText }}</span>
            </div>
          </div>
        </div>

        <ErrorMessage class="mx-4 mb-2 sm:mx-5" :message="sendError" />

        <div class="border-t border-gray-100 p-3 dark:border-gray-800 sm:p-4">
          <div class="flex items-end gap-2">
            <textarea
              ref="textareaRef"
              v-model="draft"
              rows="1"
              placeholder="Ask about budgets, disbursements, utilisation..."
              class="max-h-32 flex-1 resize-none rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              @input="autoGrow"
              @keydown.enter.exact.prevent="submit"
            />
            <Button variant="solid" :loading="sending.loading" :disabled="!draft.trim()" @click="submit">
              <template #icon>
                <LucideIcon name="send" class="h-4 w-4" />
              </template>
            </Button>
          </div>
          <p class="mt-1.5 text-center text-[11px] font-medium text-gray-600 dark:text-gray-300">{{ botName }} can make mistakes. Verify important figures.</p>
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
  /* frappe-ui's DialogOverlay hardcodes overflow-y-auto on this outer
  fixed full-screen wrapper (see node_modules/frappe-ui's Dialog.vue) -
  .ai-assistant-panel below already caps its own height and .messagesRef
  (below) is the one inner area meant to scroll, so the overlay's own
  overflow should never need to engage. When it does (the panel's actual
  content briefly exceeds its max-height, a reflow before the inner
  overflow-y-auto fully clips), the overlay - not the messages list -
  becomes the active scroll surface, and since it's the full-screen
  backdrop, that reads as "the whole popup scrolled top to bottom" instead
  of just the conversation. Same fix as the dashboard drill-down modals'
  own .dialog-overlay override (DrillModal.vue etc). */
  overflow: hidden;
}

/* frappe-ui's DialogContent wraps this panel with `my-8` (2rem top + 2rem
bottom) inside an overlay that is itself `overflow-y-auto` and centers its
content vertically via `justify-center` - but only when the content is
short enough to actually leave room to center *within*. A near-viewport-
height panel left no slack for that, so it just sat pinned under the top
margin instead of centered, and on shorter windows its height plus the
4rem margin together exceeded the viewport entirely, making the *overlay*
scroll (it fills the whole screen, so that reads as "the whole page
scrolled" even though it's only this dialog's own wrapper). A fixed height
below the viewport leaves room on typical screens for justify-center to
actually center the dialog, and max-height still caps it (reserving the
4rem margin) so it degrades gracefully on short windows instead of ever
forcing the overlay to scroll. */
.ai-assistant-panel {
  width: 100%;
  height: 52rem;
  max-height: calc(100vh - 4rem);
  overflow: hidden;
}
/* frappe-ui's own max-w-7xl preset (80rem) is its widest step - frappe-ui's
own preset is actually narrower than this, so max-w-7xl never applies on
its own; this rule overrides it down further still. 65rem (1040px) is a
comfortably compact chat width (most of the panel's own content - a single
message column, not a wide table - never needed the extra room anyway),
and still leaves slack before Windows' own 125%/150% display scaling (the
common laptop default, reporting a smaller effective window width in CSS
pixels even on a physically large screen) would make it feel cramped. The
intermediate step below keeps the panel comfortably within a scaled
laptop's real viewport instead of jumping straight from the base width
down to the 639px mobile full-screen breakpoint further down. */
[data-dialog='ai-assistant'] .dialog-content.max-w-7xl {
  max-width: 65rem;
}
@media (max-width: 1600px) {
  [data-dialog='ai-assistant'] .dialog-content.max-w-7xl {
    max-width: 52rem;
  }
}
/* Belt-and-braces alongside .dialog-overlay's overflow:hidden above:
.dialog-content is this dialog's own direct wrapper around
.ai-assistant-panel, so capping its height here too means neither layer can
grow past the viewport and become a second scrollable surface of its own. */
[data-dialog='ai-assistant'] .dialog-content {
  max-height: calc(100vh - 4rem);
  overflow: hidden;
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

/* The browser default <mark> (solid yellow bg, black text) ignores dark mode
and clashes with this app's own accent palette - amber here matches the
"needs attention" tone the system prompt uses it for (overdue reports,
mismatches), same hue family as the dashboard's own warn-state badges. */
.ai-assistant-panel mark {
  border-radius: 0.25rem;
  background-color: rgb(252 211 77 / 0.35);
  padding: 0 0.15rem;
  color: inherit;
}
:root.dark .ai-assistant-panel mark {
  background-color: rgb(217 119 6 / 0.35);
}

/* Clean, flat chrome matching the rest of the app's own dialogs (see e.g.
PendingUtilisationModal.vue's small tinted icon badge + plain white body) -
a soft single-tint badge in this app's own accent color, not a gradient or
colored banner, and flat gray bubbles rather than a colored wash, so this
reads as a native part of the app rather than a generic AI-chatbot skin
bolted on. */
.ai-assistant-avatar-badge {
  color: #fff;
}

.ai-assistant-bubble-bot {
  display: inline-block;
  border-radius: 1rem 1rem 1rem 0.25rem;
  padding: 0.6rem 0.95rem;
  background-color: rgb(243 244 246);
  color: rgb(17 24 39);
}
:root.dark .ai-assistant-bubble-bot {
  background-color: rgb(31 41 55);
  color: rgb(243 244 246);
}
.ai-assistant-bubble-user {
  border-radius: 1rem 1rem 0.25rem 1rem;
  padding: 0.6rem 0.95rem;
  background-color: var(--app-accent, #111827);
  color: #fff;
}
:root.dark .ai-assistant-bubble-user {
  background-color: rgb(243 244 246);
  color: rgb(17 24 39);
}

/* Starter prompt chips (the empty-state suggestions) - a plain bordered card,
filled in on hover so they read as clickable without needing a heavier
treatment or motion that would feel out of place in this app's own plain,
functional style. */
.ai-assistant-starter {
  border: 1px solid rgb(0 0 0 / 0.08);
  background-color: rgb(249 250 251);
  transition: background-color 120ms ease, border-color 120ms ease;
}
.ai-assistant-starter:hover {
  border-color: rgb(0 0 0 / 0.14);
  background-color: rgb(243 244 246);
}
:root.dark .ai-assistant-starter {
  border-color: rgb(255 255 255 / 0.08);
  background-color: rgb(31 41 55);
}
:root.dark .ai-assistant-starter:hover {
  border-color: rgb(255 255 255 / 0.16);
  background-color: rgb(55 65 81);
}
.ai-assistant-starter-icon {
  background-color: rgb(0 0 0 / 0.05);
  color: rgb(75 85 99);
}
:root.dark .ai-assistant-starter-icon {
  background-color: rgb(255 255 255 / 0.08);
  color: rgb(209 213 219);
}

/* Plain neutral circle for the signed-in user's own messages - distinct from
the bot's own accent-tinted badge so the two sides of the conversation stay
visually distinct at a glance even once both bubbles are the same shape. */
.ai-assistant-avatar-user {
  background-color: rgb(229 231 235);
  color: rgb(55 65 81);
}
:root.dark .ai-assistant-avatar-user {
  background-color: rgb(55 65 81);
  color: rgb(229 231 235);
}

/* Each message animates in rather than just appearing - a short, understated
rise+fade (TransitionGroup in the template drives this via Vue's own enter/
leave class convention). Only -enter is used: nothing in this list is ever
removed except by clearConversation(), which empties the array wholesale
rather than animating each bubble out one at a time. */
.ai-assistant-msg-enter-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.ai-assistant-msg-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
@media (prefers-reduced-motion: reduce) {
  .ai-assistant-msg-enter-active {
    transition: none;
  }
}

/* Empty-state entrance: the greeting text and each starter card fade/rise in
with a short staggered delay (set inline per-card in the template) so
opening the panel for the first time feels like it's settling into place
rather than every element just appearing at once. */
.ai-assistant-fade-in {
  animation: ai-assistant-fade-in 320ms ease both;
}
@keyframes ai-assistant-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .ai-assistant-fade-in {
    animation: none;
  }
}
</style>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
import { accentColor, appName } from '@/data/branding'
import { session } from '@/data/session'

const router = useRouter()
const messagesRef = ref(null)
const textareaRef = ref(null)
const draft = ref('')
const sendError = ref(null)

const botName = computed(() => assistantConfigResource.data?.bot_name || 'Assistant')

// A flat fill in this app's own configurable accent color (App Setting) -
// same color the sidebar's own assistant-card badge uses (AppSidebar.vue) -
// so the bot's avatar always matches the trigger button that opened it,
// instead of a fixed color unrelated to whatever brand color is picked.
const avatarTint = computed(() => ({ backgroundColor: accentColor.value }))

const userInitial = computed(() => (session.full_name || session.user || '?').charAt(0).toUpperCase())

// A handful of phrases rotated through while waiting on a reply, the same
// idea as Claude's own "Thinking…"/"Pondering…" - a single static label
// reads as stuck on a slow multi-tool-call turn (this assistant's own loop
// can take several seconds per tool round trip), where a phrase that keeps
// changing still reads as "working" even when nothing else on screen moves.
// Finance-flavored rather than generic chatbot filler, matching this app's
// own domain the same way the starter prompts above do.
const THINKING_PHRASES = ['Reviewing the ledger', 'Tallying the numbers', 'Cross-checking budgets', 'Auditing the figures', 'Almost reconciled']
const thinkingIndex = ref(0)
const thinkingText = computed(() => `${THINKING_PHRASES[thinkingIndex.value % THINKING_PHRASES.length]}...`)
let thinkingTimer = null
watch(
  () => sending.loading,
  (loading) => {
    clearInterval(thinkingTimer)
    thinkingTimer = null
    if (loading) {
      thinkingIndex.value = 0
      thinkingTimer = setInterval(() => {
        thinkingIndex.value += 1
      }, 1800)
    }
  },
)
onBeforeUnmount(() => clearInterval(thinkingTimer))

// A fixed handful of realistic starting questions, shown only on the empty
// conversation screen - this app's own domain (budgets/disbursement/
// utilisation/caregiver data), not generic chatbot filler, so a first-time
// user sees concretely what's worth asking instead of facing a blank input.
// Each gets its own icon so the four read as distinct cards rather than a
// plain list of text buttons.
const starterPrompts = [
  { text: 'What is the total approved budget?', icon: 'wallet' },
  { text: 'Which partners are pending utilisation submission?', icon: 'clock' },
  { text: 'Show disbursement vs utilisation by partner', icon: 'chart-column' },
  { text: 'List budgets closing this month', icon: 'calendar' },
]

function useStarterPrompt(prompt) {
  draft.value = prompt
  nextTick(() => {
    textareaRef.value?.focus()
    autoGrow()
  })
}

// Grows the composer with the message instead of staying a single fixed
// row and scrolling its own content out of view - capped by the textarea's
// own max-h-32 (see template), past which it scrolls internally as normal.
function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// The assistant's own system prompt tells it to bold a count/total with
// **this** markdown syntax and flag something that needs attention (an
// overdue report, a balance mismatch) with ==this== one - but this chat only
// ever rendered plain text, not a full markdown renderer (no new dependency,
// no markdown syntax beyond the two things the prompt actually asks for).
// Escape everything first so the message's own text can never inject HTML,
// then turn the (now HTML-safe) **pairs**/==pairs== into <strong>/<mark>,
// and collapse 3+ consecutive newlines down to one blank line - the model
// occasionally leaves a double blank line between two sentences (reads as a
// large, unexplained dead gap once whitespace-pre-wrap preserves it exactly)
// even though it was never asked to paragraph-break a short reply that way.
function renderBold(text) {
  const escaped = String(text ?? '')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n{3,}/g, '\n\n')
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
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

// Sticks to the bottom the way ChatGPT/Claude's own chat does: not just once
// when a full message is appended (conversation.value.length changing), but
// continuously as the content inside keeps growing - the "thinking" dots
// appearing, a reply's text streaming in from the bubble's own height
// change, and especially a show_table/show_chart block (AiBlocks) finishing
// its own render well after the message object itself was already added. A
// ResizeObserver on the scroll container's actual content catches every one
// of those, where a watch on conversation.value.length alone would miss all
// but the first. Only auto-follows while the user is already at (or very
// near) the bottom - once they scroll up to reread something earlier, new
// content arriving must never yank the view back down and lose their place.
let stickToBottom = true
function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 48
}
function scrollToBottom() {
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}
watch(messagesRef, (el, _old, onCleanup) => {
  if (!el) return
  const handleScroll = () => {
    stickToBottom = isNearBottom(el)
  }
  el.addEventListener('scroll', handleScroll, { passive: true })
  const observer = new ResizeObserver(() => {
    if (stickToBottom) scrollToBottom()
  })
  observer.observe(el)
  for (const child of el.children) observer.observe(child)
  onCleanup(() => {
    el.removeEventListener('scroll', handleScroll)
    observer.disconnect()
  })
})
// A brand new user message (or re-opening the panel) should always jump to
// the bottom regardless of where the user had scrolled to previously - only
// content arriving *after* that point respects their own scroll position.
watch(
  () => conversation.value.length,
  () => {
    stickToBottom = true
    nextTick(scrollToBottom)
  },
)
watch(
  () => sending.loading,
  (loading) => {
    if (loading) {
      stickToBottom = true
      nextTick(scrollToBottom)
    }
  },
)

function clearConversation() {
  clearAssistantConversation()
  sendError.value = null
}

async function submit() {
  const message = draft.value.trim()
  if (!message || sending.loading) return
  draft.value = ''
  nextTick(autoGrow)
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
