<script lang="ts">
import { createStaticVNode } from 'vue'

export default {
  inheritAttrs: false,
  props: {
    /** The inline code text. */
    code: {
      type: String,
      default: ''
    }
  },
  setup(props, { slots, attrs }) {
    let source = props.code

    if (!source) {
      const slotContent = slots.default?.()
      source = slotContent
        ?.map((vnode: any) => (typeof vnode.children === 'string' ? vnode.children : ''))
        .join('') ?? ''
    }

    source = source.trim()

    if (!source) {
      return () => createStaticVNode('', 0)
    }

    const classes = attrs.class ? ` class="${attrs.class}"` : ''
    const baseStyles = 'white-space:normal;border-radius:6px;border:1px solid #d1d5db;background-color:#f3f4f6;padding:2px 6px;font-size:11px;color:inherit'
    const styles = [baseStyles, attrs.style].filter(Boolean).join(';')

    const escaped = source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const html = `<code${classes} style="${styles}">${escaped}</code>`

    return () => createStaticVNode(html, 1)
  }
}
</script>
