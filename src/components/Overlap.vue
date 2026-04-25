<script setup lang="ts">
import { computed, useAttrs, createStaticVNode } from 'vue'
import {
  hasHeightInStyle,
  hasHeightUtility,
  hasWidthInStyle,
  hasWidthUtility,
  nextId,
  normalizeToPixels
} from './utils.ts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps({
  /**
   * Max height of the background (default slot) content.
   *
   * Applied as `max-height` on the background div and as `height`
   * on the VML rectangle. When not set, the height is taken from
   * a Tailwind utility (e.g. `h-50`, `max-h-[200px]`) or inline
   * `height`/`max-height` style on the component, after CSS inlining.
   */
  height: {
    type: [String, Number],
    default: null
  },
  /**
   * Width of the overlay table and VML rectangle.
   *
   * When not set, derived from a width utility class or inline
   * style on the component itself, otherwise from the nearest
   * sized ancestor (`Container`, `Section`, outer `Column`).
   * Falls back to `100%` when no source is found.
   */
  width: {
    type: [String, Number],
    default: null
  },
  /**
   * Height of the VML rectangle in Outlook.
   *
   * Defaults to the resolved `height`. Use this to fine-tune the
   * overlay height specifically for Outlook rendering.
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

const userStyle = computed(() => {
  const s = attrs.style
  if (!s) return ''
  return typeof s === 'object'
    ? Object.entries(s).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`).join('; ')
    : String(s)
})

const userClass = computed(() => (attrs.class as string) ?? '')

const userHasWidth = computed(() =>
  hasWidthUtility(userClass.value) || hasWidthInStyle(userStyle.value)
)
const userHasHeight = computed(() =>
  hasHeightUtility(userClass.value) || hasHeightInStyle(userStyle.value)
)

const useWidthMarker = props.width == null
const useHeightMarker = props.height == null && props.msoHeight == null
const id = (useWidthMarker || useHeightMarker) ? nextId('o') : null

const widthValue = computed(() =>
  useWidthMarker ? `__MAIZZLE_COLW_${id}__` : normalizeToPixels(props.width)
)

const heightValue = computed(() => {
  if (props.msoHeight != null) return normalizeToPixels(props.msoHeight)
  if (props.height != null) return normalizeToPixels(props.height)
  return `__MAIZZLE_OH_${id}__`
})

const backgroundStyles = computed(() => {
  const parts: string[] = []
  if (props.height != null) parts.push(`max-height: ${normalizeToPixels(props.height)}`)
  parts.push('margin: 0 auto', 'text-align: center')
  if (userStyle.value) parts.push(userStyle.value)
  return parts.join('; ') + ';'
})

const tdStyle = computed(() =>
  `width: ${widthValue.value}; max-width: 100%; vertical-align: top;`
)

const vmlOpen = computed(() =>
  `<!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroked="f" filled="f" style="width: ${widthValue.value}; height: ${heightValue.value};"><v:textbox inset="${props.msoInset}"><![endif]-->`
)

const restAttrs = computed(() => {
  const { style: _, ...rest } = attrs
  return rest
})

const VmlBefore = () => createStaticVNode(vmlOpen.value, 1)
const VmlAfter = () => createStaticVNode('<!--[if mso]></v:textbox></v:rect><![endif]-->', 1)
</script>

<template>
  <div
    v-bind="restAttrs"
    :style="backgroundStyles"
    :data-maizzle-cw-id="useWidthMarker ? id : null"
    :data-maizzle-cw-count="useWidthMarker ? 1 : null"
    :data-maizzle-cw-self="useWidthMarker && userHasWidth ? '' : null"
    :data-maizzle-oh-id="useHeightMarker && userHasHeight ? id : null"
  >
    <slot />
  </div>
  <table style="max-height: 0; position: relative; opacity: 0.999;">
    <tr>
      <td :style="tdStyle">
        <VmlBefore />
        <slot name="overlay" />
        <VmlAfter />
      </td>
    </tr>
  </table>
</template>
