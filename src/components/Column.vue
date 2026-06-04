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
  /**
   * Toggle Outlook (MSO) and VML fallback markup for this
   * component and all descendants.
   *
   * When `false`, skips MSO ghost tables, VML shapes,
   * `xmlns:v`/`xmlns:o` attributes, and mso-specific CSS
   * in all built-in components.
   *
   * @default true
   */
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
 *
 * When `width` is set as a prop the resolved pixel value also goes
 * through the class list (`min-w-[Npx]`) so it dedupes against the
 * user's `min-w-*` utility. The marker path (no prop) has to stay
 * inline because the placeholder string is replaced post-render and
 * Tailwind's content scanner can't compile a class whose value is
 * still a marker.
 */
const baseClass = 'inline-block text-[medium]'
const mergedClass = computed(() => {
  const parts = [baseClass]
  if (props.width != null) parts.push(`min-w-[${normalizeToPixels(props.width)}]`)
  return twMerge(parts.join(' '), (attrs.class as string) ?? '')
})

const styles = computed(() =>
  props.width != null ? undefined : `min-width: ${minWidth.value};`
)

const tdStyle = computed(() => {
  const parts = [`width: ${msoWidth.value}`]
  if (useMarker) parts.push(`__MAIZZLE_COLTDX_${colId}__`)
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
