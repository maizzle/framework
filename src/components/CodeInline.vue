<script lang="ts">
import { createStaticVNode, type PropType } from 'vue'
import { codeToHtml, getSingletonHighlighter, type BundledLanguage, type BundledTheme } from 'shiki'

export default {
  inheritAttrs: false,
  props: {
    /**
     * The inline code text to render.
     *
     * If not provided, the slot content is used instead.
     * The text is HTML-escaped automatically.
     */
    code: {
      type: String,
      default: ''
    },
    /**
     * Language for syntax highlighting. Only consulted when `theme` is set.
     * @default 'html'
     */
    language: {
      type: String as PropType<BundledLanguage>,
      default: 'html'
    },
    /**
     * Shiki theme to apply. When set, the inline code is syntax-highlighted
     * with this theme and the cell uses the theme's background color.
     * When unset, falls back to the plain gray-styled `<code>` (no Shiki
     * pass, faster, and visually quieter in body copy).
     */
    theme: {
      type: String as PropType<BundledTheme | undefined>,
      default: undefined
    }
  },
  async setup(props, { slots, attrs }) {
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

    if (props.theme) {
      const highlighted = await codeToHtml(source, {
        lang: props.language,
        theme: props.theme,
      })

      const hl = await getSingletonHighlighter({ themes: [props.theme], langs: [] })
      const bg = hl.getTheme(props.theme).bg

      const codeContent = highlighted
        .replace(/^<pre[^>]*><code>/, '')
        .replace(/<\/code><\/pre>$/, '')

      /**
       * Replace shiki's structural `<`/`>` (the `<span>` tag delimiters)
       * with private string markers `§MZLT§`/`§MZGT§`. Source-level
       * entities like `&lt;` (representing a literal `<` in the user's
       * code) are made of `&`, `l`, `t`, `;` — no real `<` character —
       * so they pass through untouched.
       *
       * Why markers and not HTML entities? Both levels of escaping would
       * end up as `&lt;` after a round-trip, and the decoder couldn't
       * tell which to decode back to a real `<` (structural) vs leave
       * as `&lt;` (content). Using non-entity markers makes the two
       * levels distinguishable: only `§MZ*§` gets decoded.
       *
       * Two pipeline passes that would otherwise mangle the shiki HTML
       * are defused by the markers:
       *   - `format` (oxfmt with `htmlWhitespaceSensitivity: 'ignore'`)
       *     sees the `<code>` body as plain text and won't reflow the
       *     chain of `<span>` tokens onto separate lines.
       *   - The HTML5 self-close strip (`( \/>)` regex at the end of
       *     the pipeline) won't match anything inside a shiki cell,
       *     so a highlighted Vue self-closing tag like `<MyTag />`
       *     keeps its ` />` instead of being silently shortened to `>`.
       *
       * `minifyCodeInline` swaps the markers back to real angle brackets
       * at the very end of the pipeline, after both passes have run.
       */
      const escaped = codeContent
        .replace(/</g, '§MZLT§')
        .replace(/>/g, '§MZGT§')

      const baseStyles = `background-color:${bg};border-radius:6px;padding:2px 6px;font-size:11px`
      const styles = [baseStyles, attrs.style].filter(Boolean).join(';')

      const html = `<code${classes} style="${styles}" data-minify-inline>${escaped}</code>`
      return () => createStaticVNode(html, 1)
    }

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
