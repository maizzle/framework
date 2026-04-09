<script setup lang="ts">
import { computed } from 'vue'
import { normalizeToPixels } from './utils.ts'

const props = defineProps({
  /** The type of spacer. */
  type: {
    type: String as () => 'vertical' | 'horizontal',
    default: 'vertical'
  },
  /** The height of the spacer (vertical). */
  height: {
    type: [String, Number],
    default: null
  },
  /** The width of the spacer (horizontal). */
  width: {
    type: [String, Number],
    default: 16
  },
  /** The alternative height to use in Outlook. */
  msoHeight: {
    type: [String, Number],
    default: null
  }
})

function parsePixelValue(value: string | number): number {
  if (typeof value === 'number') return value
  return Number.parseFloat(value) || 0
}

const verticalStyles = computed(() => {
  const s = []

  if (props.height) {
    s.push(`line-height: ${normalizeToPixels(props.height)};`)
  }

  if (props.msoHeight) {
    s.push(`mso-line-height-alt: ${normalizeToPixels(props.msoHeight)};`)
  }

  return s.join('')
})

const horizontalStyles = computed(() => {
  return `display:inline-block; width: ${normalizeToPixels(props.width)}; font-size: 16px;${msoFontWidth.value}`
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
</script>

<template>
  <template v-if="type === 'horizontal'">
    <i :style="horizontalStyles">{{ emsps }}</i>
  </template>
  <template v-else>
    <div v-if="height" role="separator" :style="verticalStyles">&zwj;</div>
    <div v-else role="separator">&zwj;</div>
  </template>
</template>
