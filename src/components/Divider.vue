<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { normalizeToPixels } from './utils.ts'

const attrs = useAttrs()

const props = defineProps({
  height: {
    type: [String, Number],
    default: '1px'
  },
  color: {
    type: String,
    default: null
  },
  spaceY: {
    type: [String, Number],
    default: '24px'
  },
  spaceX: {
    type: [String, Number],
    default: null
  },
  top: {
    type: [String, Number],
    default: null
  },
  bottom: {
    type: [String, Number],
    default: null
  },
  left: {
    type: [String, Number],
    default: null
  },
  right: {
    type: [String, Number],
    default: null
  }
})

const hasBgClass = computed(() =>
  typeof attrs.class === 'string' &&
  attrs.class.split(' ').some(c => c.startsWith('bg-'))
)

const styles = computed(() => {
  const s = []
  const height = normalizeToPixels(props.height || '1px')

  s.push(`height: ${height};`)
  s.push(`line-height: ${height};`)

  // Color
  if (props.color) {
    s.push(`background-color: ${props.color};`)
  } else if (!hasBgClass.value) {
    s.push('background-color: #cbd5e1;')
  }

  // Margins reset
  if (
    props.top != null ||
    props.bottom != null ||
    props.left != null ||
    props.right != null ||
    props.spaceY != null ||
    props.spaceX != null
  ) {
    s.push('margin: 0;')
  }

  // space-y
  if (props.spaceY != null) {
    const v = props.spaceY === 0 ? '0px' : normalizeToPixels(props.spaceY)
    s.push(`margin-top: ${v}; margin-bottom: ${v};`)
  }

  // space-x
  if (props.spaceX != null) {
    const v = props.spaceX === 0 ? '0px' : normalizeToPixels(props.spaceX)
    s.push(`margin-left: ${v}; margin-right: ${v};`)
  }

  // individual margins
  if (props.top != null) {
    s.push(`margin-top: ${normalizeToPixels(props.top)};`)
  }
  if (props.bottom != null) {
    s.push(`margin-bottom: ${normalizeToPixels(props.bottom)};`)
  }
  if (props.left != null) {
    s.push(`margin-left: ${normalizeToPixels(props.left)};`)
  }
  if (props.right != null) {
    s.push(`margin-right: ${normalizeToPixels(props.right)};`)
  }

  return s.join('')
})
</script>

<template>
  <div role="separator" :style="styles">&zwj;</div>
</template>
