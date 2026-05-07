<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Height (thickness) of the divider line.
   *
   * @default '1px'
   */
  height: {
    type: [String, Number],
    default: '1px'
  },
  /**
   * Vertical spacing (margin) above and below the divider.
   *
   * Overridden by `top` and `bottom` if set.
   *
   * @default '24px'
   */
  spaceY: {
    type: [String, Number],
    default: '24px'
  },
  /**
   * Horizontal spacing (margin) on both sides of the divider.
   *
   * Overridden by `left` and `right` if set.
   */
  spaceX: {
    type: [String, Number],
    default: null
  },
  /** Margin above the divider. Overrides `spaceY` for the top side. */
  top: {
    type: [String, Number],
    default: null
  },
  /** Margin below the divider. Overrides `spaceY` for the bottom side. */
  bottom: {
    type: [String, Number],
    default: null
  },
  /** Margin to the left of the divider. Overrides `spaceX` for the left side. */
  left: {
    type: [String, Number],
    default: null
  },
  /** Margin to the right of the divider. Overrides `spaceX` for the right side. */
  right: {
    type: [String, Number],
    default: null
  }
})

const styles = computed(() => {
  const s: string[] = []
  const height = normalizeToPixels(props.height || '1px')

  s.push(`height: ${height};`)
  s.push(`line-height: ${height};`)
  s.push('background-color: #cbd5e1;')

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
  <div
    role="separator"
    v-bind="{ ...$attrs, class: undefined, style: undefined }"
    :style="[styles, $attrs.style as any]"
    :class="attrs.class as string"
  >&zwj;</div>
</template>
