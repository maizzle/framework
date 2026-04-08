<script lang="ts">
import { createStaticVNode } from 'vue'
import { codeToHtml, getSingletonHighlighter } from 'shiki'

export default {
  props: {
    /** The code to highlight. */
    code: {
      type: String,
      default: ''
    },
    /** Base64-encoded code, set by the Vite transform for slot content. */
    encodedCode: {
      type: String,
      default: ''
    },
    /** The language for syntax highlighting. @default 'html' */
    lang: {
      type: String,
      default: 'html'
    },
    /** The shiki theme to use. @default 'github-light' */
    theme: {
      type: String,
      default: 'github-light'
    },
    /** CSS class for the wrapping table cell. @default 'max-w-0 mso-padding-alt-6' */
    tdClass: {
      type: String,
      default: 'max-w-0 mso-padding-alt-6'
    }
  },
  inheritAttrs: false,
  async setup(props, { slots, attrs }) {
    // Prefer encodedCode (from Vite transform) → code prop → slot text
    let source = props.encodedCode
      ? Buffer.from(props.encodedCode, 'base64').toString('utf-8')
      : props.code

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
      lang: props.lang,
      theme: props.theme,
    })

    const hl = await getSingletonHighlighter({ themes: [props.theme], langs: [] })
    const bg = hl.getTheme(props.theme).bg

    // Shiki outputs <pre><code>...</code></pre>, extract the inner content
    const codeContent = highlighted
      .replace(/^<pre[^>]*><code>/, '')
      .replace(/<\/code><\/pre>$/, '')

    const classes = ['font-mono', attrs.class].filter(Boolean).join(' ')
    const baseStyles = `background-color:${bg};padding:24px;overflow:auto;white-space:pre;word-wrap:normal;word-break:normal;word-spacing:normal`
    const styles = [baseStyles, attrs.style].filter(Boolean).join(';')

    const html = `<table class="w-full"><tr><td class="${props.tdClass}"><pre class="${classes}" style="${styles}"><code>${codeContent}</code></pre></td></tr></table>`

    return () => createStaticVNode(html, 1)
  }
}
</script>
