<script setup lang="ts">
import { computed, provide, createStaticVNode, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'
import { hasWidthUtility, nextId, normalizeToPixels, outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Max width of the container.
   *
   * Applied as `max-width` on the div and as `width` on the MSO table.
   * Also used as the width source for descendant `Row`/`Column`
   * components when computing column widths.
   *
   * When not set, the div defaults to `max-w-150 mx-auto` (max
   * 600px, centered, shrinks below) — overridable via Tailwind
   * classes such as `w-[400px]` or `max-w-xl`. The MSO table
   * width is auto-derived from the resolved width/max-width after
   * CSS inlining, falling back to 600px when unresolvable.
   */
  width: {
    type: [String, Number],
    default: null
  },
  /**
   * Inline CSS applied only to the MSO `<td>` element.
   *
   * Use for Outlook-specific styling that shouldn't affect other clients.
   * Appended after any padding propagated from the outer div's
   * inlined style, so msoStyle wins on duplicate properties.
   *
   * @example 'padding: 10px 20px'
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

provide('containerWidth', computed(() => props.width))

const useMarker = outlookFallback && props.width == null
const msoId = useMarker ? nextId('c') : null
const tdId = outlookFallback ? nextId('ct') : null

const mergedClass = computed(() => {
  const userClass = (attrs.class as string) ?? ''
  const parts: string[] = ['m-0', 'mx-auto']
  if (props.width != null) {
    parts.push(`max-w-[${normalizeToPixels(props.width)}]`)
  } else if (!hasWidthUtility(userClass)) {
    parts.push('max-w-150')
  }
  return twMerge(parts.join(' '), userClass)
})

const msoWidth = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  return `__MAIZZLE_MSOW_${msoId}__`
})

const colWidthSource = computed(() =>
  props.width != null ? normalizeToPixels(props.width) : ''
)

const tdMarker = tdId ? `__MAIZZLE_MSOTDSTYLE_${tdId}__` : ''

const MsoBefore = () => createStaticVNode(
  `<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: ${msoWidth.value}" align="center"><tr><td${tdMarker}><![endif]-->`,
  1
)

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></td></tr></table><![endif]-->',
  1
)
</script>

<template>
  <MsoBefore v-if="outlookFallback" />
  <div
    v-bind="{ ...attrs, class: undefined }"
    :class="mergedClass"
    :data-maizzle-msow-id="msoId"
    :data-maizzle-cw="colWidthSource"
    :data-maizzle-mso-td-id="tdId"
    :data-maizzle-mso-style="tdId && props.msoStyle ? props.msoStyle : null"
  >
    <slot />
  </div>
  <MsoAfter v-if="outlookFallback" />
</template>
