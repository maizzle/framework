<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * The heading level (1-6), corresponding to `<h1>` through `<h6>`.
   * @default 1
   */
  level: {
    type: [String, Number],
    default: 1,
    validator: (v: string | number) => [1, 2, 3, 4, 5, 6].includes(Number(v)),
  },
})

const attrs = useAttrs()
const tag = computed(() => `h${props.level}`)
const mergedClass = computed(() => twMerge('m-0', attrs.class as string))
</script>

<template>
  <component :is="tag" v-bind="{ ...$attrs, class: mergedClass }">
    <slot />
  </component>
</template>
