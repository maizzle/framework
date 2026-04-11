<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <span
    data-slot="command-shortcut"
    :class="cn('ml-auto text-[10px] tracking-widest text-gray-400 dark:text-gray-500', props.class)"
  >
    <slot />
  </span>
</template>
