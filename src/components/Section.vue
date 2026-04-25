<script setup lang="ts">
import { computed, createStaticVNode, useAttrs } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

let counter = 0

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
  }
})

const userStyle = computed(() => {
  const s = attrs.style
  if (!s) return ''
  return typeof s === 'object'
    ? Object.entries(s).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')
    : String(s)
})

function hasWidthUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(w-|max-w-|min-w-)/.test(clean)
  })
}

function hasWidthInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-width|width)\s*:/i.test(styleStr)
}

const userHasWidth = computed(() => {
  const cls = (attrs.class as string) ?? ''
  return hasWidthUtility(cls) || hasWidthInStyle(userStyle.value)
})

const useMarker = props.width == null && userHasWidth.value
const msoId = useMarker ? `s${++counter}` : null

const divStyle = computed(() => {
  const parts: string[] = []
  if (props.width != null) parts.push(`max-width: ${normalizeToPixels(props.width)}`)
  if (userStyle.value) parts.push(userStyle.value)
  return parts.length ? parts.join('; ') : undefined
})

const restAttrs = computed(() => {
  const { style: _, ...rest } = attrs
  return rest
})

const tdStyles = computed(() => {
  const parts: string[] = []
  if (userStyle.value) parts.push(userStyle.value)
  if (props.msoStyle) parts.push(props.msoStyle)
  return parts.length ? parts.join('; ') : ''
})

const msoWidth = computed(() => {
  if (props.width != null) return normalizeToPixels(props.width)
  if (useMarker) return `__MAIZZLE_MSOW_${msoId}__`
  return '100%'
})

const MsoBefore = () => {
  const tdStyle = tdStyles.value ? ` style="${tdStyles.value}"` : ''
  return createStaticVNode(
    `<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: ${msoWidth.value}"><tr><td${tdStyle}><![endif]-->`,
    1
  )
}

const MsoAfter = () => createStaticVNode(
  '<!--[if mso]></td></tr></table><![endif]-->',
  1
)
</script>

<template>
  <MsoBefore />
  <div
    v-bind="restAttrs"
    :style="divStyle"
    :data-maizzle-msow-id="msoId"
    :data-maizzle-msow-fallback="useMarker ? '100%' : null"
  >
    <slot />
  </div>
  <MsoAfter />
</template>
