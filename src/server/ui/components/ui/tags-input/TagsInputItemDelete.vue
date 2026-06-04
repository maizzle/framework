<script setup lang="ts">
import type { TagsInputItemDeleteProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TagsInputItemDelete, useForwardProps } from "reka-ui"
import { X } from "@lucide/vue"
import { cn } from "@/lib/utils"

const props = defineProps<TagsInputItemDeleteProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <TagsInputItemDelete v-bind="forwardedProps" :class="cn('flex rounded bg-transparent mr-1', props.class)">
    <slot>
      <X class="size-3" />
    </slot>
  </TagsInputItemDelete>
</template>
