<script setup lang="ts">
import { computed, useAttrs, createStaticVNode } from 'vue'
import { normalizeToPixels } from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /** Max height of the overlapped (background) content. */
  height: {
    type: [String, Number],
    required: true
  },
  /** Width of the overlay table and VML rect. */
  width: {
    type: [String, Number],
    required: true
  },
  /** Height of the VML rect for Outlook. Defaults to height. */
  msoHeight: {
    type: [String, Number],
    default: null
  },
  /** VML textbox inset value for Outlook positioning. */
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

  return `<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroked="f" filled="f" style="width:${w};height:${h};"><v:textbox inset="${props.msoInset}"><![endif]-->`
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
