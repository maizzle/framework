<script setup lang="ts">
import { computed, provide, createStaticVNode, useAttrs } from 'vue'
import { twMerge } from 'tailwind-merge'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

let counter = 0

const attrs = useAttrs()

const props = defineProps({
  /**
   * Max width of the container.
   *
   * Applied as `max-width` on the div and as `width` on the MSO table.
   * Also provided to child `Row` and `Column` components for
   * automatic column width calculation.
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
  }
})

provide('containerWidth', computed(() => props.width))

const useMarker = props.width == null && props.msoWidth == null
const msoId = useMarker ? `c${++counter}` : null

const styles = computed(() => {
  if (props.width == null) return undefined
  return `max-width: ${normalizeToPixels(props.width)}; margin: 0 auto;`
})

function hasWidthUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(w-|max-w-|min-w-)/.test(clean)
  })
}

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
  <div
    v-bind="{ ...attrs, class: undefined }"
    :class="mergedClass"
    :style="styles"
    :data-maizzle-msow-id="msoId"
  >
    <slot />
  </div>
  <MsoAfter />
</template>
