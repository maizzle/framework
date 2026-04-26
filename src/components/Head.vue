<script setup lang="ts">
import { createStaticVNode } from 'vue'

const props = defineProps({
  /**
   * Render an empty `<head>` before the main head element.
   *
   * This is a workaround for Yahoo! Mail on Android, which
   * strips the first `<head>` element it finds.
   *
   * @default false
   */
  double: {
    type: [Boolean, String],
    default: false
  }
})

const EmptyHead = () => createStaticVNode('<head></head>', 1)
</script>

<template>
  <EmptyHead v-if="props.double === true || props.double === 'true'" />
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <slot />
  </head>
</template>
