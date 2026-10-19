<template>
  <!-- dark:bg-gray-900, not -950 - this app's gray palette (frappe-ui's own
  Tailwind preset, see colorPalette.js/colors.json) only defines shades up
  to 900, with no 950 at all. Tailwind silently drops a class referencing a
  shade that doesn't exist in the active palette instead of erroring, so
  dark:bg-gray-950 was compiling to NO CSS rule whatsoever - the page just
  stayed on its light bg-white background while every dark:text-gray-*
  class on it (100/400/600, which DO exist) correctly switched to
  light-colored text, producing light text on a light background. -->
  <div class="flex min-h-screen flex-col bg-white dark:bg-gray-900 lg:flex-row">
    <!-- Left: brand panel with a mocked finance "preview card" instead of
    scattered icons - something that actually looks like what this app
    does, giving the panel real content instead of empty decorative space. -->
    <div
      class="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex lg:w-[46%] xl:w-2/5"
      :style="{ background: `linear-gradient(160deg, ${accentColor}, ${shade(accentColor, -30)})` }"
    >
      <div class="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" style="background-image: linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px); background-size: 2.75rem 2.75rem;" />

      <div class="login-in relative z-10 flex items-center gap-3" style="--login-delay: 0ms">
        <img v-if="appLogo" :src="appLogoOnDark" class="h-16 w-24 flex-shrink-0 rounded-lg bg-white object-contain p-1" alt="" />
        <span class="text-lg font-semibold leading-tight">{{ appName }}</span>
      </div>

      <div class="login-in relative z-10" style="--login-delay: 80ms">
        <h1 class="max-w-sm text-3xl font-semibold leading-tight">
          {{ brandingResource.data?.login_headline || 'Budgets, disbursements and utilisation, in one place.' }}
        </h1>
        <p class="mt-3 max-w-sm text-sm text-white/75">
          {{ brandingResource.data?.login_description || 'Track partner budgets, monitor utilisation, and keep reporting on schedule.' }}
        </p>

        <!-- A generic finance-themed illustration card, not a dashboard
        preview - showing specific numbers here would be fabricated data
        (this renders before login, with no access to anything real), so
        this stays purely decorative: icon tiles + a label, no stats. -->
        <div class="login-float mt-8 flex w-full max-w-xs items-center gap-3 rounded-2xl bg-white/10 p-4 shadow-xl backdrop-blur-sm">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <LucideIcon name="indian-rupee" class="h-5 w-5" />
          </span>
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <LucideIcon name="landmark" class="h-5 w-5" />
          </span>
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <LucideIcon name="trending-up" class="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1 truncate text-xs text-white/70">Budgets &amp; utilisation, tracked together</span>
        </div>
      </div>

      <p class="login-in relative z-10 text-xs text-white/50" style="--login-delay: 160ms">
        &copy; {{ new Date().getFullYear() }} {{ appName }}<span v-if="appVersion"> · {{ appVersion }}</span>
      </p>
    </div>

    <!-- Mobile-only branded header strip - the left panel above is hidden
    below `lg`, which used to leave mobile with no branding at all above a
    plain white form. Same accent-gradient background as the left panel,
    just condensed into a top strip with the logo + app name, matching the
    reference "logo and background on top" layout. -->
    <div
      class="login-in relative flex items-center gap-3 overflow-hidden p-6 text-white lg:hidden"
      :style="{ '--login-delay': '0ms', background: `linear-gradient(160deg, ${accentColor}, ${shade(accentColor, -30)})` }"
    >
      <div class="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" style="background-image: linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px); background-size: 2.75rem 2.75rem;" />
      <img v-if="appLogo" :src="appLogoOnDark" class="relative z-10 h-14 w-20 flex-shrink-0 rounded-lg bg-white object-contain p-1" alt="" />
      <span class="relative z-10 text-lg font-semibold leading-tight">{{ appName }}</span>
    </div>

    <!-- Right: the form - plain white/dark panel, no background pattern or
    color. The mesh-gradient background tried here was explicitly reverted
    (too much color/visual noise) - keeping this simple per that feedback. -->
    <div class="flex flex-1 items-center justify-center bg-white px-6 py-10 dark:bg-gray-900 sm:px-10">
      <div class="login-in w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900" style="--login-delay: 40ms">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Welcome back</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Log in to continue to your dashboard.</p>
        </div>

        <form class="mt-6 flex flex-col gap-5" @submit.prevent="submit">
          <FormControl type="text" label="Email" v-model="email" autocomplete="username" required />
          <div>
            <FormControl
              :type="showPassword ? 'text' : 'password'"
              label="Password"
              v-model="password"
              autocomplete="current-password"
              required
            >
              <template #suffix>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  tabindex="-1"
                  :icon="showPassword ? 'lucide-eye-off' : 'lucide-eye'"
                  :tooltip="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </FormControl>
            <Button variant="ghost" size="sm" class="mt-1 !px-0" type="button" @click="openForgotPassword">
              Forgot password?
            </Button>
          </div>
          <ErrorMessage :message="loginResource.error" />
          <!-- size="md" (not "lg") - a shorter, more standard button height,
          same size the rest of this form's own controls already use. -->
          <Button icon-left="lucide-log-in" variant="solid" :loading="loginResource.loading" type="submit" size="md">
            Log in
          </Button>
        </form>

        <!-- SSO: only shows once an admin actually configures a Social
        Login Key with a client secret - see api/common.py's
        get_social_login_providers, the same gate desk's own login page
        applies. Nothing renders here at all until one exists. -->
        <div v-if="ssoProviders.length" class="mt-6">
          <div class="flex items-center gap-3">
            <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            <span class="text-xs text-gray-400 dark:text-gray-600">or continue with</span>
            <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          </div>
          <div class="mt-4 flex flex-col gap-2">
            <a
              v-for="provider in ssoProviders"
              :key="provider.name"
              :href="provider.auth_url"
              class="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              <img v-if="provider.icon" :src="provider.icon" class="h-4 w-4" alt="" />
              Sign in with {{ provider.provider_name }}
            </a>
          </div>
        </div>

        <p class="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 lg:hidden">
          &copy; {{ new Date().getFullYear() }} {{ appName }}<span v-if="appVersion"> · {{ appVersion }}</span>
        </p>
      </div>
    </div>

    <Dialog v-model="showForgotPassword" :options="{ title: 'Reset Password' }">
      <template #body-content>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <FormControl type="text" label="Email" v-model="resetEmail" autocomplete="username" required />
        <ErrorMessage class="mt-3" :message="resetError" />
        <p v-if="resetSent" class="mt-3 text-sm text-green-600 dark:text-green-400">
          If that email is registered with us, a reset link is on its way. Please check your inbox.
        </p>
      </template>
      <template #actions>
        <div class="flex w-full justify-end gap-2">
          <Button icon-left="lucide-x" @click="showForgotPassword = false" size="sm">Close</Button>
          <Button icon-left="lucide-send" variant="solid" :loading="resetLoading" @click="submitForgotPassword" size="sm">
            Send reset link
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.login-in {
  animation: login-fade-in-up 0.5s ease-out both;
  animation-delay: var(--login-delay, 0ms);
}

@keyframes login-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* The preview card drifts very gently, just enough to read as "alive"
without distracting from the form on the other side of the screen. */
.login-float {
  animation: login-float 5s ease-in-out infinite;
}

@keyframes login-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-in,
  .login-float {
    animation: none;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { FormControl, Button, ErrorMessage, Dialog, call } from 'frappe-ui'
import LucideIcon from '@/components/LucideIcon.vue'
import { fetchV2 } from '@/composables/useApiV2'
import { loginResource } from '@/data/session'
import { appName, appLogo, appLogoOnDark, appVersion, accentColor, brandingResource } from '@/data/branding'

const email = ref('')
const password = ref('')
const showPassword = ref(false)

// Same darken-for-light/lighten-for-dark shading branding.js uses for the
// accent's own hover/active shades - reused here just to build a two-stop
// gradient for the brand panel out of the one configured accent color.
function shade(hex, percent) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent))
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent))
  return `rgb(${r}, ${g}, ${b})`
}

const ssoProviders = ref([])
onMounted(async () => {
  try {
    ssoProviders.value = await fetchV2('creche_reports.api.common.get_social_login_providers', {
      redirect_to: '/creche-reports/dashboard',
    })
  } catch (e) {
    ssoProviders.value = []
  }
})

// Trimmed only at submit time, not on every keystroke - a pasted credential
// often carries a stray leading/trailing space, which Frappe's login
// compares byte-for-byte and silently rejects as wrong.
function submit() {
  loginResource.submit({ email: email.value.trim(), password: password.value.trim() })
}

const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetError = ref(null)
const resetSent = ref(false)
const resetLoading = ref(false)

function openForgotPassword() {
  resetEmail.value = email.value
  resetError.value = null
  resetSent.value = false
  showForgotPassword.value = true
}

async function submitForgotPassword() {
  const user = resetEmail.value.trim()
  if (!user) return
  resetLoading.value = true
  resetError.value = null
  resetSent.value = false
  try {
    await call('frappe.core.doctype.user.user.reset_password', { user })
    resetSent.value = true
  } catch (e) {
    resetError.value = e
  } finally {
    resetLoading.value = false
  }
}
</script>
