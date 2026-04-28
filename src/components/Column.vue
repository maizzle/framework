<script setup lang="ts">
import { computed, createStaticVNode, inject, useAttrs } from 'vue'
import type { ComputedRef } from 'vue'
import { twMerge } from 'tailwind-merge'
import { nextId, normalizeToPixels, outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Override the auto-computed column width.
   *
   * By default, the width is calculated from the nearest sized
   * ancestor (`Container`, `Section`, `Row`, or outer `Column`)
   * divided by the column count detected on the parent `Row`.
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
  },
  outlookFallback: outlookFallbackProp,
})

const outlookFallback = useOutlookFallback(props.outlookFallback)

const columnCount = inject<ComputedRef<number> | null>('columnCount', null)

const count = computed(() => columnCount?.value ?? 2)

const useMarker = props.width == null
const colId = useMarker ? nextId('co') : null

const minWidth = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  return `__MAIZZLE_COLW_${colId}__`
})

const msoWidth = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  return `__MAIZZLE_COLW_${colId}__`
})

/**
 * Baseline display/typography lives in classes — not inline `:style` —
 * so the user can override any of them via tailwind utilities. Inline
 * `display: inline-block` would silently shadow a class like
 * `inline-table` during CSS inlining; routing both through twMerge lets
 * the user's utility cleanly replace ours instead of being dropped.
 */
const baseClass = 'inline-block align-top text-base'
const mergedClass = computed(() => twMerge(baseClass, (attrs.class as string) ?? ''))

const styles = computed(() => `min-width: ${minWidth.value};`)

const tdStyle = computed(() => {
  const parts = [`width: ${msoWidth.value}`, 'vertical-align: top']
  if (props.msoStyle) parts.push(props.msoStyle)
  return parts.join('; ')
})

const MsoBefore = () => createStaticVNode(
  `<!--[if mso]><td style="${tdStyle.value}"><![endif]-->`,
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></td><![endif]-->',
  1
)
</script>

<template>
  <MsoBefore v-if="outlookFallback" />
  <div
    v-bind="{ ...attrs, class: undefined }"
    :class="mergedClass"
    :style="styles"
    :data-maizzle-cw-id="colId"
    :data-maizzle-cw-count="useMarker ? count : null"
  >
    <slot />
  </div>
  <MsoAfter v-if="outlookFallback" />
</template>
