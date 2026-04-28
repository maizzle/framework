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
   * When not set, the div defaults to `w-150 mx-auto` (600px,
   * centered) — overridable via Tailwind classes such as
   * `w-[400px]` or `max-w-xl`. The MSO table width is auto-derived
   * from the resolved width/max-width after CSS inlining, falling
   * back to 600px when unresolvable.
   */
  width: {
    type: [String, Number],
    default: null
  },
  /**
   * Override the Outlook (MSO) table width independently of the
   * div's width. Highest priority — wins over `width` and any
   * class-derived value.
   */
  msoWidth: {
    type: [String, Number],
    default: null
  },
  outlookFallback: outlookFallbackProp,
})

const outlookFallback = useOutlookFallback(props.outlookFallback)

provide('containerWidth', computed(() => props.width))

const useMarker = outlookFallback && props.width == null && props.msoWidth == null
const msoId = useMarker ? nextId('c') : null

const styles = computed(() => {
  if (props.width == null) return undefined
  return `max-width: ${normalizeToPixels(props.width)}; margin: 0 auto;`
})

const mergedClass = computed(() => {
  if (props.width != null) return attrs.class as string | undefined
  const userClass = (attrs.class as string) ?? ''
  const defaultClass = hasWidthUtility(userClass)
    ? 'm-0 mx-auto'
    : 'w-150 m-0 mx-auto'
  return twMerge(defaultClass, userClass)
})

const msoWidth = computed(() => {
  if (props.msoWidth != null) return normalizeToPixels(props.msoWidth)
  if (props.width != null) return normalizeToPixels(props.width)
  return `__MAIZZLE_MSOW_${msoId}__`
})

const colWidthSource = computed(() =>
  props.width != null ? normalizeToPixels(props.width) : ''
)

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
  <MsoBefore v-if="outlookFallback" />
  <div
    v-bind="{ ...attrs, class: undefined }"
    :class="mergedClass"
    :style="styles"
    :data-maizzle-msow-id="msoId"
    :data-maizzle-cw="colWidthSource"
  >
    <slot />
  </div>
  <MsoAfter v-if="outlookFallback" />
</template>
