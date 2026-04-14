<script setup lang="ts">
import { computed, createStaticVNode, inject, provide, useAttrs } from 'vue'
import type { ComputedRef } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** Override the auto-computed min-width. */
  width: {
    type: [String, Number],
    default: null
  },
  /** Inline CSS applied only to the MSO td element. */
  msoStyle: {
    type: String,
    default: undefined
  }
})

const injectedMinWidth = inject<ComputedRef<string> | null>('columnMinWidth', null)
const containerWidth = inject<ComputedRef<string | number> | null>('containerWidth', null)
const injectedMsoWidth = inject<ComputedRef<string> | null>('columnMsoWidth', null)

const minWidth = computed(() => {
  if (props.width) return normalizeToPixels(props.width)
  if (injectedMinWidth?.value) return injectedMinWidth.value

  // Fallback: divide container width by 2 if available
  if (containerWidth?.value) {
    const val = containerWidth.value
    if (typeof val === 'number') return `${parseFloat((val / 2).toFixed(2))}px`
    const num = Number.parseFloat(val)
    const unit = val.replace(String(num), '') || 'px'
    return `${parseFloat((num / 2).toFixed(2))}${unit}`
  }

  return '18.75em'
})

const msoWidth = computed(() => injectedMsoWidth?.value ?? '50%')

// Provide column width as containerWidth for nested Rows
provide('containerWidth', minWidth)

const styles = computed(() => {
  return `display: inline-block; min-width: ${minWidth.value}; font-size: 16px; vertical-align: top;`
})

const tdStyle = computed(() => {
  const parts = ['vertical-align: top']
  if (props.msoStyle) parts.push(props.msoStyle)
  return parts.join('; ')
})

const MsoBefore = () => createStaticVNode(
  `<!--[if mso]><td width="${msoWidth.value}" style="${tdStyle.value}"><![endif]-->`,
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></td><![endif]-->',
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
