<script setup lang="ts">
import { computed, createStaticVNode, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'
import { hasWidthInStyle, hasWidthUtility, nextId, normalizeToPixels, outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Width of the section.
   *
   * Applied as `max-width` on the div and as `width` on the MSO table.
   *
   * When not set, the MSO table width is auto-derived from a width
   * utility class (e.g. `max-w-md`) or inline style (`max-width`/
   * `width`) on the component, after CSS inlining. Falls back to
   * `100%` when no width source is provided.
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

const userStyle = computed(() => {
  const s = attrs.style
  if (!s) return ''
  return typeof s === 'object'
    ? Object.entries(s).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')
    : String(s)
})

const userHasWidth = computed(() => {
  const cls = (attrs.class as string) ?? ''
  return hasWidthUtility(cls) || hasWidthInStyle(userStyle.value)
})

const useMarker = outlookFallback && props.width == null && userHasWidth.value
const msoId = useMarker ? nextId('s') : null
const tdId = outlookFallback ? nextId('st') : null

const mergedClass = computed(() => {
  const userClass = (attrs.class as string) ?? ''
  if (props.width == null) return userClass || undefined
  return twMerge(`max-w-[${normalizeToPixels(props.width)}]`, userClass)
})

const divStyle = computed(() => userStyle.value || undefined)

const restAttrs = computed(() => {
  const { style: _, class: __, ...rest } = attrs
  return rest
})

const msoWidth = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  if (useMarker) return `__MAIZZLE_MSOW_${msoId}__`
  return '100%'
})

const colWidthSource = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  if (userHasWidth.value) return ''
  return null
})

const tdMarker = tdId ? `__MAIZZLE_MSOTDSTYLE_${tdId}__` : ''

const MsoBefore = () => createStaticVNode(
  `<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: ${msoWidth.value}"><tr><td${tdMarker}><![endif]-->`,
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
    v-bind="restAttrs"
    :class="mergedClass"
    :style="divStyle"
    :data-maizzle-msow-id="msoId"
    :data-maizzle-msow-fallback="useMarker ? '100%' : null"
    :data-maizzle-cw="colWidthSource"
    :data-maizzle-mso-td-id="tdId"
    :data-maizzle-mso-style="tdId && props.msoStyle ? props.msoStyle : null"
  >
    <slot />
  </div>
  <MsoAfter v-if="outlookFallback" />
</template>
