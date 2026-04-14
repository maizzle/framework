<script setup lang="ts">
import { computed, createStaticVNode, useAttrs } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Width of the section.
   *
   * Applied as `max-width` on the div and as `width` on the MSO table.
   *
   * @default '100%'
   */
  width: {
    type: [String, Number],
    default: '100%'
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

const hasCustomWidth = computed(() => props.width !== '100%')

const userStyle = computed(() => {
  const s = attrs.style
  if (!s) return ''
  return typeof s === 'object'
    ? Object.entries(s).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')
    : String(s)
})

const divStyle = computed(() => {
  const parts: string[] = []
  if (hasCustomWidth.value) parts.push(`max-width: ${normalizeToPixels(props.width)}`)
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

const MsoBefore = () => {
  const tdStyle = tdStyles.value ? ` style="${tdStyles.value}"` : ''
  return createStaticVNode(
    `<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: ${normalizeToPixels(props.width)}"><tr><td${tdStyle}><![endif]-->`,
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
  <div v-bind="restAttrs" :style="divStyle">
    <slot />
  </div>
  <MsoAfter />
</template>
