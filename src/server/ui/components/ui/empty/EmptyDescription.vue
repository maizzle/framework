<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <p
    data-slot="empty-description"
    :class="cn(
      'text-gray-500 dark:text-gray-400 [&>a:hover]:text-indigo-600 [&>a:hover]:dark:text-indigo-400 text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
      props.class,
    )"
  >
    <slot />
  </p>
</template>
