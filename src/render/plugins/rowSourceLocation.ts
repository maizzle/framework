import type { Plugin } from 'vite'

/**
 * Vite plugin that injects `data-maizzle-loc="<file>:<line>"` into every
 * `<Row>`/`<row>` opening tag in user templates.
 *
 * Used by Row.vue's runtime to point the user at the exact line in their
 * template when they misuse Row (e.g. without a Column child).
 *
 * Only transforms inside `<template>` blocks of SFCs (or the entire file
 * for `.md` templates) so `<Row>` mentions in `<script>` blocks (e.g. in
 * string literals or comments) are left untouched.
 */
export function rowSourceLocation(): Plugin {
  const tagRe = /(<(?:Row|row))(\b[^>]*?)(\/?>)/g

  function injectLoc(html: string, htmlOffset: number, fullCode: string, id: string): string {
    return html.replace(tagRe, (match, tag, attrs, end, localOffset: number) => {
      if (/\bdata-maizzle-loc\s*=/.test(attrs)) return match
      const absoluteOffset = htmlOffset + localOffset
      const line = fullCode.slice(0, absoluteOffset).split('\n').length
      return `${tag}${attrs} data-maizzle-loc="${id}:${line}"${end}`
    })
  }

  return {
    name: 'maizzle:row-loc',
    enforce: 'pre',
    transform(code, id) {
      const isVue = id.endsWith('.vue')
      const isMd = id.endsWith('.md')
      if (!isVue && !isMd) return
      if (!code.includes('<Row') && !code.includes('<row')) return

      let transformed: string

      if (isVue) {
        /**
         * Replace inside every <template>...</template> block, leaving
         * <script> and <style> blocks alone.
         */
        const templateBlock = /(<template\b[^>]*>)([\s\S]*?)(<\/template>)/g
        transformed = code.replace(templateBlock, (_match, open, inner, close, offset: number) => {
          const innerOffset = offset + open.length
          return open + injectLoc(inner, innerOffset, code, id) + close
        })
      } else {
        transformed = injectLoc(code, 0, code, id)
      }

      if (transformed !== code) {
        return { code: transformed, map: null }
      }
    },
  }
}
