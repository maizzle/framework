import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/**
 * Vite plugin that pre-processes <Markdown> tags:
 * - Extracts slot content, dedents it, and passes as :content prop
 * - Resolves `src` prop to read file contents at build time
 */
export function markdownExtract(): Plugin {
  const re = /<(Markdown|markdown)((?:\s[^>]*?)?)>([\s\S]*?)<\/\1>/g
  const selfClosingRe = /<(Markdown|markdown)((?:\s[^>]*?\bsrc\s*=\s*"[^"]*"[^>]*?))\/>/g

  return {
    name: 'maizzle:markdown-extract',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.vue') && !id.endsWith('.md')) return
      if (!code.includes('Markdown') && !code.includes('markdown')) return

      let transformed = code

      // Handle <Markdown>content</Markdown>
      transformed = transformed.replace(re, (_match, tag, attrs, content) => {
        if (/(?:^|\s):?content\b/.test(attrs) || /v-bind:content\b/.test(attrs)) return _match

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

      // Handle <Markdown src="./file.md" /> — resolve and inline file content
      transformed = transformed.replace(selfClosingRe, (_match, tag, attrs) => {
        const srcMatch = attrs.match(/\bsrc\s*=\s*"([^"]*)"/)
        if (!srcMatch) return _match

        const srcPath = srcMatch[1]
        const resolvedPath = resolve(dirname(id), srcPath)

        let fileContent: string
        try {
          fileContent = readFileSync(resolvedPath, 'utf-8').trim()
        } catch {
          return _match
        }

        // Drop the src prop and any content the slot pass already injected,
        // so `src` resolves to a single content attribute (no duplicates).
        const cleanAttrs = attrs
          .replace(/\s*\bsrc\s*=\s*"[^"]*"/, '')
          .replace(/\s*\bcontent\s*=\s*"[^"]*"/, '')
        const escaped = fileContent
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        return `<${tag}${cleanAttrs} content="${escaped}" />`
      })

      if (transformed !== code) {
        return { code: transformed, map: null }
      }
    },
  }
}
