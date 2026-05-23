<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'

defineOptions({ inheritAttrs: false })

defineProps({
  /**
   * The URL the link points to.
   */
  href: {
    type: String,
    required: true,
    validator: (v: string) => v.trim().length > 0,
  },
})

const attrs = useAttrs()
const mergedClass = computed(() => twMerge('no-underline', attrs.class as string))
</script>

<template>
  <a :href="href" v-bind="{ ...$attrs, class: mergedClass }">
    <slot />
  </a>
</template>
