<script lang="ts">
import { createStaticVNode, inject, type PropType } from 'vue'
import { createMarkdownExit, type MarkdownExitOptions } from 'markdown-exit'
import { codeToHtml, type BundledTheme } from 'shiki'
import { defu } from 'defu'
import { MaizzleConfigKey } from '../composables/useConfig'
import { shikiToCodeBlock } from './utils'

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
    /**
     * Shiki theme for fenced code blocks. Falls back to
     * `markdown.shikiTheme` from the config, then to
     * `'github-dark-high-contrast'`.
     */
    shikiTheme: {
      type: String as PropType<BundledTheme>,
      default: undefined
    },
    /** Wrap output in a div element. @default false */
    wrapper: {
      type: Boolean,
      default: false
    },
    /** markdown-exit configuration options. Takes precedence over `markdown.markdownOptions` from the config. */
    config: {
      type: Object as PropType<MarkdownExitOptions>,
      default: () => ({})
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

    /**
     * Pull the global `markdown` config (when rendered inside a Maizzle
     * build) so the component honors the same options and plugins as
     * `.md` templates. Props override the config; both fall back to the
     * component defaults. `inject` over `useConfig()` so the component
     * still works standalone, when no config is provided.
     */
    const mdConfig = inject(MaizzleConfigKey, undefined)?.markdown ?? {}
    const markdownOptions = mdConfig.markdownOptions
    const markdownUses = mdConfig.markdownUses
    const markdownSetup = mdConfig.markdownSetup
    const theme = props.shikiTheme ?? mdConfig.shikiTheme ?? 'github-dark-high-contrast'

    const md = createMarkdownExit(defu(
      props.config,
      markdownOptions ?? {},
      {
        html: true,
        linkify: true,
        typographer: true,
        highlight: async (code: string, lang: string) => {
          try {
            return await codeToHtml(code, { lang, theme })
          } catch {
            return ''
          }
        },
      },
    ))

    /**
     * Apply config plugins before overriding the fence rules, so the
     * code-block wrapping below composes over whatever they emit.
     */
    for (const use of markdownUses ?? []) {
      if (Array.isArray(use)) md.use(use[0], ...use.slice(1))
      else md.use(use)
    }
    await markdownSetup?.(md)

    const defaultFence = md.renderer.rules.fence!
    md.renderer.rules.fence = (...args) =>
      Promise.resolve(defaultFence(...args)).then(shikiToCodeBlock)

    const defaultCodeBlock = md.renderer.rules.code_block!
    md.renderer.rules.code_block = (...args) => shikiToCodeBlock(defaultCodeBlock(...args) as string)

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
