<template>
  <svg
    v-bind="$attrs"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <component :is="tag" v-for="(tag, i) in nodeTags" :key="i" v-bind="nodeAttrs[i]" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import iconNodes from 'lucide-static/icon-nodes.json'

// Drop-in replacement for frappe-ui's <FeatherIcon :name/> (this app's
// previous icon source), rendering Lucide icons by name from one bundled
// JSON module (icon-nodes.json: {name: [[tag, attrs], ...]} for every
// Lucide icon - ~450KB raw, but it's plain repetitive path-data JSON, so it
// compresses to a few tens of KB gzipped and is one single chunk, not
// thousands of tiny ones).
//
// This does NOT use frappe-ui's own `lucide-<name>` Tailwind utility
// classes (see node_modules/frappe-ui/tailwind/lucideIconsPlugin.js) even
// though those exist and work for *literal* class strings written directly
// in a template (e.g. class="lucide-download") - Tailwind's JIT content
// scanner finds those by a plain text/regex search over source files at
// build time. It can't do that for a name that only exists as a runtime
// value (a prop passed into this component, a string read from this app's
// own Sidebar Item doctype in the database, a value built via
// template-literal interpolation in navIcon.js) - there is no literal
// "lucide-whatever-the-admin-typed" substring anywhere in the source for
// the scanner to find, so no CSS rule is ever generated for it and the
// icon silently renders as nothing. Confirmed this the hard way: an
// earlier version of this component used the Tailwind-class approach, and
// navIcon('layout') (and any icon name sourced from the database) never
// got a compiled CSS rule, while a few other names only "worked" by
// coincidence because they happened to ALSO appear as a literal string
// elsewhere in the same codebase.
//
// A second attempt imported each icon as its own raw SVG file via Vite's
// import.meta.glob - correct at runtime, but it created one extra chunk
// file PER lucide-static icon (~1637 of them) regardless of how many are
// actually used, since glob matching still registers every file it finds
// even with eager:false. Importing the single icon-nodes.json module
// instead keeps this to the one chunk it's already part of, with lookup by
// name happening entirely in memory at render time.
const props = defineProps({ name: { type: String, required: true } })
defineOptions({ inheritAttrs: false })

const node = computed(() => iconNodes[props.name] || [])
const nodeTags = computed(() => node.value.map(([tag]) => tag))
const nodeAttrs = computed(() => node.value.map(([, attrs]) => attrs))
</script>
