<script lang="ts">
import { createStaticVNode, type PropType } from 'vue'
import { createMarkdownExit } from 'markdown-exit'
import { codeToHtml, type BundledTheme } from 'shiki'

export default {
  props: {
    /** Markdown content string. Overrides slot content. */
    content: {
      type: String,
      default: ''
    },
    /** Path to a markdown file to render. Resolved at build time. */
    src: {
      type: String,
      default: ''
    },
    /** Shiki theme for fenced code blocks. @default 'github-dark-high-contrast' */
    shikiTheme: {
      type: String as PropType<BundledTheme>,
      default: 'github-dark-high-contrast'
    },
    /** Wrap output in a div element. @default true */
    wrapper: {
      type: Boolean,
      default: true
    },
  },
  inheritAttrs: false,
  async setup(props, { slots, attrs }) {
    let source = props.content

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

    const md = createMarkdownExit({
      html: true,
      linkify: true,
      typographer: true,
      highlight: async (code, lang) => {
        try {
          return await codeToHtml(code, { lang, theme: props.shikiTheme })
        } catch {
          return ''
        }
      },
    })

    const wrapPre = (html: string) =>
      `<table class="w-full"><tr><td class="max-w-0 mso-padding-alt-4">${html}</td></tr></table>\n`

    const defaultFence = md.renderer.rules.fence!
    md.renderer.rules.fence = (...args) => {
      const result = defaultFence(...args)
      if (typeof result === 'string') return wrapPre(result)
      return result.then(wrapPre)
    }

    const defaultCodeBlock = md.renderer.rules.code_block!
    md.renderer.rules.code_block = (...args) => wrapPre(defaultCodeBlock(...args) as string)

    let html = await md.renderAsync(source)

    if (props.wrapper) {
      const classes = attrs.class ? ` class="${attrs.class}"` : ''
      const style = attrs.style ? ` style="${attrs.style}"` : ''
      html = `<div${classes}${style}>${html}</div>`
    }

    return () => createStaticVNode(html, 1)
  }
}
</script>
