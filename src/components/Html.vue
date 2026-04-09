<script lang="ts">
import { createStaticVNode } from 'vue'
import type { PropType } from 'vue'

export default {
  name: 'Html',
  inheritAttrs: false,
  props: {
    lang: {
      type: String,
      default: 'en'
    },
    dir: {
      type: String as PropType<'ltr' | 'rtl'>,
      default: 'ltr'
    },
    xmlns: {
      type: String,
      default: null
    }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const extraAttrs = Object.entries(attrs)
        .map(([key, value]) => value === true ? key : `${key}="${value}"`)
        .join(' ')

      const parts = [
        `lang="${props.lang}"`,
        `dir="${props.dir}"`,
      ]

      if (props.xmlns) {
        parts.push(
          `xmlns="${props.xmlns}"`,
          'xmlns:v="urn:schemas-microsoft-com:vml"',
          'xmlns:o="urn:schemas-microsoft-com:office:office"',
        )
      }

      if (extraAttrs) {
        parts.push(extraAttrs)
      }

      return [
        createStaticVNode(`<html ${parts.join(' ')}>`, 1),
        slots.default?.(),
        createStaticVNode('</html>', 1),
      ]
    }
  }
}
</script>
