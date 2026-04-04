<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { Input } from '@/components/ui/input'

const props = defineProps<{
  class?: HTMLAttributes["class"]
  modelValue?: string | number
  placeholder?: string
}>()

defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()
</script>

<template>
  <Input
    data-slot="sidebar-input"
    data-sidebar="input"
    :model-value="modelValue"
    :placeholder="placeholder"
    :class="cn(
      'bg-background h-8 w-full shadow-none',
      props.class,
    )"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <slot />
  </Input>
</template>
