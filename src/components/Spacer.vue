<script setup lang="ts">
import { computed } from 'vue'
import { normalizeToPixels } from './utils.ts'

const props = defineProps({
  /** The height of the spacer. */
  size: {
    type: [String, Number],
    default: null
  },
  /** The alternative height to use in Outlook. */
  msoHeight: {
    type: [String, Number],
    default: null
  }
})

const styles = computed(() => {
  const s = []

  if (props.size) {
    s.push(`line-height: ${normalizeToPixels(props.size)};`)
  }

  if (props.msoHeight) {
    s.push(`mso-line-height-alt: ${normalizeToPixels(props.msoHeight)};`)
  }

  return s.join('')
})
</script>

<template>
  <div v-if="size" role="separator" :style="styles">&zwj;</div>
  <div v-else role="separator">&zwj;</div>
</template>
