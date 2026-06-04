<script lang="ts">
import { createStaticVNode, type PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import { codeToHtml, getSingletonHighlighter, type BundledLanguage, type BundledTheme } from 'shiki'
import { buildCodeBlock, codeBlockPreClass } from './utils'

export default {
  props: {
    /** The code to highlight. */
    code: {
      type: String,
      default: ''
    },
    /** The language for syntax highlighting. @default 'html' */
    language: {
      type: String as PropType<BundledLanguage>,
      default: 'html'
    },
    /** The shiki theme to use. @default 'github-light' */
    theme: {
      type: String as PropType<BundledTheme>,
      default: 'github-light'
    },
    /** CSS class for the wrapping table cell. @default 'max-w-0 mso-padding-alt-4' */
    tdClass: {
      type: String,
      default: 'max-w-0 mso-padding-alt-4'
    }
  },
  inheritAttrs: false,
  async setup(props, { slots, attrs }) {
    // Prefer code prop → slot text
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

    const highlighted = await codeToHtml(source, {
      lang: props.language,
      theme: props.theme,
    })

    const hl = await getSingletonHighlighter({ themes: [props.theme], langs: [] })
    const bg = hl.getTheme(props.theme).bg

    // Shiki outputs <pre><code>...</code></pre>, extract the inner content
    const codeContent = highlighted
      .replace(/^<pre[^>]*><code>/, '')
      .replace(/<\/code><\/pre>$/, '')

    const preClass = twMerge(codeBlockPreClass(bg), attrs.class as string)
    const tdClass = twMerge(`bg-[${bg}]`, props.tdClass)
    const styleAttr = attrs.style ? ` style="${attrs.style}"` : ''

    const html = buildCodeBlock(codeContent, bg, { preClass, tdClass, styleAttr })

    return () => createStaticVNode(html, 1)
  }
}
</script>
