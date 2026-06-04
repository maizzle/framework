<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const HEIGHT_RE = /(?:^|\s)h-([\w./\-[\]%]+)/g
const LEADING_RE = /(?:^|\s)leading-/

const mergedClass = computed(() => {
  const userClass = (attrs.class as string) || ''
  const heights = [...userClass.matchAll(HEIGHT_RE)]
  const userHeight = heights.length ? heights[heights.length - 1][1] : null
  const userHasLeading = LEADING_RE.test(userClass)

  const defaults = ['my-6', 'bg-gray-300']
  if (!userHeight) defaults.push('h-px')
  if (!userHasLeading && !userHeight) defaults.push('leading-px')

  const derived = userHeight && !userHasLeading ? `leading-${userHeight}` : ''
  return twMerge(defaults.join(' '), userClass, derived)
})
</script>

<template>
  <div
    role="separator"
    v-bind="{ ...$attrs, class: undefined }"
    :class="mergedClass"
  >&zwj;</div>
</template>
