<script lang="ts">
import { createStaticVNode } from 'vue'
import type { PropType } from 'vue'

export default {
  name: 'Body',
  inheritAttrs: false,
  props: {
    xmlLang: {
      type: String,
      default: 'en'
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl'>,
      default: 'ltr'
    }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const extraAttrs = Object.entries(attrs)
        .map(([key, value]) => value === true ? key : `${key}="${value}"`)
        .join(' ')

      const parts = [
        `xml:lang="${props.xmlLang}"`,
        `dir="${props.dir}"`,
        'style="margin: 0; padding: 0; width: 100%; word-break: break-word;"',
      ]

      if (extraAttrs) {
        parts.push(extraAttrs)
      }

      return [
        createStaticVNode(`<body ${parts.join(' ')}>`, 1),
        slots.default?.(),
        createStaticVNode('</body>', 1),
      ]
    }
  }
}
</script>
