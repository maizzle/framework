<script setup lang="ts">
import { computed, createStaticVNode, inject, provide, useAttrs } from 'vue'
import type { ComputedRef } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Override the auto-computed column width.
   *
   * By default, the width is calculated from the parent `Row`
   * by dividing its width by the column count.
   */
  width: {
    type: [String, Number],
    default: null
  },
  /**
   * Inline CSS applied only to the MSO `<td>` element.
   *
   * Use for Outlook-specific styling that shouldn't affect other clients.
   *
   * @example 'padding: 10px'
   */
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

  return injectedMinWidth?.value ?? null
})

const msoWidth = computed(() => injectedMsoWidth?.value ?? '50%')

// Provide column width as containerWidth for nested Rows
provide('containerWidth', computed(() => minWidth.value ?? containerWidth?.value ?? null))

const styles = computed(() => {
  const parts = ['display: inline-block', 'font-size: 16px', 'vertical-align: top']
  if (minWidth.value) parts.splice(1, 0, `min-width: ${minWidth.value}`)
  return `${parts.join('; ')};`
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
