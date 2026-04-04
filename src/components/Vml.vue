<script lang="ts">
import { computed, createStaticVNode } from 'vue'
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
      type: String,
      default: 'frame'
    },
    sizes: String,
    origin: String,
    position: String,
    aspect: String,
    color: String,
    inset: {
      type: String,
      default: '0,0,0,0'
    },
    stroke: {
      type: String,
      default: 'f'
    },
    strokecolor: String,
    fill: {
      type: String,
      default: 't'
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
    const before = computed(() => {
      const width = normalizeToPixels(props.width)

      const rectAttrs = [
        `fill="${props.fillcolor ? 't' : props.fill}"`,
        `stroke="${props.strokecolor ? 't' : props.stroke}"`,
        `style="width: ${width};${props.height ? ` height: ${normalizeToPixels(props.height)};` : ''}"`,
        props.strokecolor ? `strokecolor="${props.strokecolor}"` : '',
        props.fillcolor ? `fillcolor="${props.fillcolor}"` : ''
      ].filter(Boolean).join(' ')

      const fillAttrs = [
        `type="${props.type}"`,
        `src="${props.src}"`,
        props.sizes ? `sizes="${props.sizes}"` : '',
        props.aspect ? `aspect="${props.aspect}"` : '',
        props.origin ? `origin="${props.origin}"` : '',
        props.position ? `position="${props.position}"` : '',
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
