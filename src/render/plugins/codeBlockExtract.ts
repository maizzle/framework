import type { Plugin } from 'vite'

/**
 * Vite plugin that extracts raw slot content from <CodeBlock> tags
 * and passes it as a :code prop before Vue compiles the template.
 *
 * This lets users write HTML naturally inside CodeBlock slots without
 * Vue attempting to compile it as template syntax.
 */
export function codeBlockExtract(): Plugin {
  // Matches <CodeBlock ...>content</CodeBlock> (and kebab-case <code-block>)
  const re = /<(CodeBlock|code-block)((?:\s[^>]*?)?)>([\s\S]*?)<\/\1>/g

  return {
    name: 'maizzle:code-block-extract',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.vue') && !id.endsWith('.md')) return
      if (!code.includes('CodeBlock') && !code.includes('code-block')) return

      const transformed = code.replace(re, (_match, tag, attrs, content) => {
        // Skip if already has a :code or v-bind:code prop
        if (/(?:^|\s):code\b/.test(attrs) || /v-bind:code\b/.test(attrs)) return _match

        // Strip leading/trailing blank lines, then dedent based on
        // the minimum indent of non-empty lines (à la min-indent)
        const stripped = content.replace(/^\n+/, '').replace(/\s+$/, '')
        if (!stripped) return _match

        const minIndent = stripped.match(/^[ \t]*(?=\S)/gm)
          ?.reduce((min: number, ws: string) => Math.min(min, ws.length), Infinity) ?? 0

        const dedented = minIndent > 0
          ? stripped.replace(new RegExp(`^[ \\t]{${minIndent}}`, 'gm'), '')
          : stripped

        // HTML-escape for safe embedding in a static attribute value.
        const escaped = dedented
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        return `<${tag}${attrs} code="${escaped}" />`
      })

      if (transformed !== code) {
        return { code: transformed, map: null }
      }
    },
  }
}
