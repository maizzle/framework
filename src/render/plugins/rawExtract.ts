import type { Plugin } from 'vite'

/**
 * Vite plugin that extracts raw slot content from <Raw> tags
 * and passes it as a :content prop before Vue compiles the template.
 *
 * Lets users write content (including `{{ }}` interpolation syntax used
 * by ESPs / Handlebars / Liquid) inside <Raw> without Vue parsing it.
 */
export function rawExtract(): Plugin {
  const re = /<(Raw)((?:\s[^>]*?)?)>([\s\S]*?)<\/\1>/g

  return {
    name: 'maizzle:raw-extract',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.vue') && !id.endsWith('.md')) return
      if (!code.includes('Raw')) return

      const transformed = code.replace(re, (_match, tag, attrs, content) => {
        if (/(?:^|\s):content\b/.test(attrs) || /v-bind:content\b/.test(attrs)) return _match

        const stripped = content.replace(/^\n+/, '').replace(/\s+$/, '')
        if (!stripped) return _match

        const minIndent = stripped.match(/^[ \t]*(?=\S)/gm)
          ?.reduce((min: number, ws: string) => Math.min(min, ws.length), Infinity) ?? 0

        const dedented = minIndent > 0
          ? stripped.replace(new RegExp(`^[ \\t]{${minIndent}}`, 'gm'), '')
          : stripped

        const escaped = dedented
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        return `<${tag}${attrs} content="${escaped}" />`
      })

      if (transformed !== code) {
        return { code: transformed, map: null }
      }
    },
  }
}
