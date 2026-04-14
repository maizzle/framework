<script setup lang="ts">
import { computed, useAttrs, createStaticVNode } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Max height of the background (default slot) content.
   *
   * This constrains the visible area of the background layer.
   */
  height: {
    type: [String, Number],
    required: true
  },
  /**
   * Width of the overlay table and VML rectangle.
   *
   * Should match the width of the content being overlapped.
   */
  width: {
    type: [String, Number],
    required: true
  },
  /**
   * Height of the VML rectangle in Outlook.
   *
   * Defaults to the `height` prop value. Use this to fine-tune
   * the overlay height specifically for Outlook rendering.
   */
  msoHeight: {
    type: [String, Number],
    default: null
  },
  /**
   * VML textbox inset for Outlook positioning.
   *
   * Controls the offset of the overlay content as `top,right,bottom,left`.
   * Use negative values to shift content upward into the background area.
   *
   * @default '0,-60px,0,0'
   */
  msoInset: {
    type: String,
    default: '0,-60px,0,0'
  },
})

const backgroundStyles = computed(() => {
  return `max-height: ${normalizeToPixels(props.height)}; margin: 0 auto; text-align: center;`
})

const vmlOpen = computed(() => {
  const w = normalizeToPixels(props.width)
  const h = normalizeToPixels(props.msoHeight ?? props.height)

  return `<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroked="f" filled="f" style="width: ${w}; height: ${h};"><v:textbox inset="${props.msoInset}"><![endif]-->`
})

const VmlBefore = () => createStaticVNode(vmlOpen.value, 1)
const VmlAfter = () => createStaticVNode('<!--[if mso]></v:textbox></v:rect><![endif]-->', 1)
</script>

<template>
  <div v-bind="attrs" :style="backgroundStyles">
    <slot />
  </div>
  <table style="max-height: 0; position: relative; opacity: 0.999;">
    <tr>
      <td :style="`width: ${normalizeToPixels(props.width)}; max-width: 100%; vertical-align: top;`">
        <VmlBefore />
        <slot name="overlay" />
        <VmlAfter />
      </td>
    </tr>
  </table>
</template>
