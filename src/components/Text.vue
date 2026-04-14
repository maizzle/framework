<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const mergedClass = computed(() => twMerge('m-0 my-4 text-base', attrs.class as string))
</script>

<template>
  <p v-bind="$attrs" :class="mergedClass">
    <slot />
  </p>
</template>
