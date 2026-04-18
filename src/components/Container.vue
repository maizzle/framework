<script setup lang="ts">
import { computed, provide, createStaticVNode, useAttrs } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Max width of the container.
   *
   * Applied as `max-width` on the div and as `width` on the MSO table.
   * Also provided to child `Row` and `Column` components for
   * automatic column width calculation.
   *
   * When not set, no inline `max-width` is applied to the div —
   * use Tailwind classes like `max-w-xl mx-auto` instead.
   * The MSO table defaults to 600px.
   */
  width: {
    type: [String, Number],
    default: null
  }
})

provide('containerWidth', computed(() => props.width))

const styles = computed(() => {
  if (!props.width) return 'margin: 0 auto;'
  return `max-width: ${normalizeToPixels(props.width)}; margin: 0 auto;`
})

const msoWidth = computed(() => normalizeToPixels(props.width ?? 600))

const MsoBefore = () => createStaticVNode(
  `<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: ${msoWidth.value}" align="center"><tr><td><![endif]-->`,
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></td></tr></table><![endif]-->',
  1
)
</script>

<template>
  <MsoBefore />
  <div v-bind="attrs" :style="styles">
    <slot />
  </div>
  <MsoAfter />
</template>
