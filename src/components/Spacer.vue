<script setup lang="ts">
import { computed, h, useAttrs } from 'vue'
import { normalizeToPixels, outlookFallbackProp } from './utils.ts'
import { useOutlookFallback } from '../composables/useOutlookFallback'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** The type of spacer. */
  type: {
    type: String as () => 'vertical' | 'horizontal',
    default: 'vertical'
  },
  /** The width of the spacer (horizontal). */
  width: {
    type: [String, Number],
    default: 16
  },
  outlookFallback: outlookFallbackProp,
})

const attrs = useAttrs()
const outlookFallback = useOutlookFallback(props.outlookFallback)

const HEIGHT_RE = /(?:^|\s)h-([\w./\-[\]%]+)/g
const LEADING_RE = /(?:^|\s)leading-/

const verticalClass = computed(() => {
  const userClass = (attrs.class as string) || ''
  if (!userClass) return ''

  const heights = [...userClass.matchAll(HEIGHT_RE)]
  const stripped = userClass.replace(HEIGHT_RE, ' ').replace(/\s+/g, ' ').trim()

  if (!heights.length) return stripped
  if (LEADING_RE.test(stripped)) return stripped

  return `${stripped} leading-${heights[heights.length - 1][1]}`.trim()
})

function parsePixelValue(value: string | number): number {
  if (typeof value === 'number') return value
  return Number.parseFloat(value) || 0
}

const horizontalStyles = computed(() => {
  const mso = outlookFallback ? msoFontWidth.value : ''
  return `display:inline-block; width: ${normalizeToPixels(props.width)}; font-size: 16px;${mso}`
})

const msoFontWidth = computed(() => {
  const widthPx = parsePixelValue(props.width)
  const emspBase = 16
  const maxPercent = 500
  const maxPerEmsp = emspBase * (maxPercent / 100)
  const numEmsps = Math.ceil(widthPx / maxPerEmsp)
  const percent = Math.round((widthPx / (numEmsps * emspBase)) * 100)

  return ` mso-font-width:${percent}%;`
})

const emspCount = computed(() => {
  const widthPx = parsePixelValue(props.width)
  const maxPerEmsp = 16 * 5
  return Math.ceil(widthPx / maxPerEmsp)
})

const emsps = computed(() => '\u2003'.repeat(emspCount.value))

const HorizontalSpacer = () =>
  h('i', { ...attrs, style: horizontalStyles.value }, emsps.value)
</script>

<template>
  <template v-if="type === 'horizontal'">
    <HorizontalSpacer />
  </template>
  <template v-else>
    <div
      role="separator"
      v-bind="{ ...$attrs, class: undefined }"
      :class="verticalClass"
    >&zwj;</div>
  </template>
</template>
