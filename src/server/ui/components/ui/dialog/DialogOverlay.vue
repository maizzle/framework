<script setup lang="ts">
import type { DialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogOverlay } from "reka-ui"
import { cn } from "@/lib/utils"
import stripesUrl from '@/stripes.svg'

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const stripeBg = {
  backgroundImage: `url(${stripesUrl})`,
  backgroundRepeat: 'repeat',
  backgroundAttachment: 'fixed',
}
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    v-bind="delegatedProps"
    :class="cn('data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-[1px]', props.class)"
  >
    <div class="absolute inset-0 opacity-2 dark:opacity-3" :style="stripeBg" />
    <slot />
  </DialogOverlay>
</template>
