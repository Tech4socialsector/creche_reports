<template>
  <div
    class="animate-pulse bg-gray-200 dark:bg-gray-800"
    :class="round ? 'rounded-full' : 'rounded'"
    :style="{ width, height }"
  />
</template>

<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '1rem' },
  round: { type: Boolean, default: false },
})
</script>
