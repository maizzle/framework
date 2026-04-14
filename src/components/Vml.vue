<script lang="ts">
import { computed, createStaticVNode } from 'vue'
import type { PropType } from 'vue'
import { normalizeToPixels } from './utils.ts'

export default {
  name: 'Vml',
  props: {
    width: {
      type: [String, Number],
      default: '600px'
    },
    height: {
      type: [String, Number],
      default: null
    },
    type: {
      type: String as PropType<'solid' | 'gradient' | 'gradientradial' | 'tile' | 'pattern' | 'frame'>,
      default: 'frame'
    },
    sizes: {
      type: String,
      validator: (v: string) => /^[\d.]+(px|%|em|rem)?(,[\d.]+(px|%|em|rem)?)+$/.test(v.replace(/\s/g, ''))
    },
    origin: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, ''))
    },
    position: {
      type: String,
      validator: (v: string) => /^-?[\d.]+(,-?[\d.]+)+$/.test(v.replace(/\s/g, ''))
    },
    backgroundPosition: {
      type: String as PropType<
        | 'top,left' | 'top,right'
        | 'bottom,left' | 'bottom,right'
      >,
      validator: (v: string) => /^(top|bottom),(left|right)$/.test(v.replace(/\s/g, ''))
    },
    aspect: {
      type: String as PropType<'atleast' | 'atmost'>,
    },
    color: String,
    inset: {
      type: String,
      default: '0,0,0,0'
    },
    stroke: {
      type: [Boolean, String],
      default: false
    },
    strokecolor: String,
    fill: {
      type: [Boolean, String],
      default: true
    },
    fillcolor: {
      type: String,
      default: 'none'
    },
    src: {
      type: String,
      default: 'https://via.placeholder.com/600x400'
    }
  },
  setup(props, { slots }) {
    const backgroundPositionMap: Record<string, string> = {
      'top,left': '-0.5,-0.5',
      'top,right': '0.5,-0.5',
      'bottom,left': '-0.5,0.5',
      'bottom,right': '0.5,0.5',
    }

    const resolvedOrigin = computed(() => props.origin ?? (props.backgroundPosition ? backgroundPositionMap[props.backgroundPosition.replace(/\s/g, '')] : undefined))
    const resolvedPosition = computed(() => props.position ?? (props.backgroundPosition ? backgroundPositionMap[props.backgroundPosition.replace(/\s/g, '')] : undefined))

    const before = computed(() => {
      const width = normalizeToPixels(props.width)

      const toBool = (v: boolean | string) => v === true || v === 'true' ? 'true' : 'false'

      const rectAttrs = [
        `fill="${props.fillcolor ? 'true' : toBool(props.fill)}"`,
        `stroke="${props.strokecolor ? 'true' : toBool(props.stroke)}"`,
        `style="width: ${width};${props.height ? ` height: ${normalizeToPixels(props.height)};` : ''}"`,
        props.strokecolor ? `strokecolor="${props.strokecolor}"` : '',
        props.fillcolor ? `fillcolor="${props.fillcolor}"` : ''
      ].filter(Boolean).join(' ')

      const fillAttrs = [
        `type="${props.type}"`,
        `src="${props.src}"`,
        props.sizes ? `sizes="${props.sizes}"` : '',
        props.aspect ? `aspect="${props.aspect}"` : '',
        resolvedOrigin.value ? `origin="${resolvedOrigin.value}"` : '',
        resolvedPosition.value ? `position="${resolvedPosition.value}"` : '',
        props.color ? `color="${props.color}"` : ''
      ].filter(Boolean).join(' ')

      return [
        `<!--[if mso]>`,
        `<v:rect xmlns:v="urn:schemas-microsoft-com:vml" ${rectAttrs}>`,
        `<v:fill ${fillAttrs} />`,
        `<v:textbox inset="${props.inset}" style="mso-fit-shape-to-text: true">`,
        `<div><![endif]-->`
      ].join('')
    })

    const after = computed(() => {
      return `<!--[if mso]></div></v:textbox></v:rect><![endif]-->`
    })

    return () => [
      createStaticVNode(before.value, 1),
      slots.default?.(),
      createStaticVNode(after.value, 1)
    ]
  }
}
</script>
