<script setup lang="ts">
import type { ListboxFilterProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { watch } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { Search } from "@lucide/vue"
import { ListboxFilter, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"
import { useCommand } from "."

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ListboxFilterProps & {
  class?: HTMLAttributes["class"]
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const delegatedProps = reactiveOmit(props, "class", "modelValue")

const forwardedProps = useForwardProps(delegatedProps)

const { filterState } = useCommand()

// Sync external v-model → internal filter
watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== filterState.search) {
    filterState.search = val
  }
})

// Sync internal filter → external v-model
watch(() => filterState.search, (val) => {
  emit("update:modelValue", val)
})
</script>

<template>
  <div
    data-slot="command-input-wrapper"
    class="flex h-9 items-center gap-2 border-b px-3"
  >
    <Search class="size-4 shrink-0 opacity-70" :stroke-width="1" />
    <ListboxFilter
      v-bind="{ ...forwardedProps, ...$attrs }"
      v-model="filterState.search"
      data-slot="command-input"
      auto-focus
      :class="cn('placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    />
  </div>
</template>
