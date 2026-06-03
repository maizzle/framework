<script setup lang="ts">
import { type PropType, computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * The HTML element to render.
   * @default 'p'
   */
  as: {
    type: String as PropType<'p' | 'span'>,
    default: 'p',
    validator: (v: string) => ['p', 'span'].includes(v),
  },
})

const attrs = useAttrs()

const defaultClass = computed(() => props.as === 'span' ? '' : 'mt-4 text-base')
const mergedClass = computed(() => twMerge(defaultClass.value, attrs.class as string) || undefined)
</script>

<template>
  <component :is="props.as" v-bind="{ ...$attrs, class: mergedClass }">
    <slot />
  </component>
</template>
